import { Aws, Duration, RemovalPolicy } from "aws-cdk-lib"
import { Rule } from "aws-cdk-lib/aws-events"
import { LambdaFunction } from "aws-cdk-lib/aws-events-targets"
import { Role, ServicePrincipal, Policy, PolicyDocument, PolicyStatement, Effect } from "aws-cdk-lib/aws-iam"
import { CfnDeliveryStream } from "aws-cdk-lib/aws-kinesisfirehose"
import { Code, Runtime, Function as LFunction } from "aws-cdk-lib/aws-lambda"
import { CfnSubscriptionFilter, FilterPattern, ILogGroup, LogGroup, LogStream } from "aws-cdk-lib/aws-logs"
import { BlockPublicAccess, Bucket } from "aws-cdk-lib/aws-s3"
import { Secret } from "aws-cdk-lib/aws-secretsmanager"
import { Construct } from "constructs"

export interface KinesisToDatadogStreamProps {
  /**
   *
   * The name of the SecretsManager secret where your Datadog API key is saved.
   * The secret must be a JSON object on the format { "value": "SECRET" }
   *
   */
  datadogApiKeySecretName: string

  datadogEndpointUrl?: string
  /**
   * The CloudWatch log groups from you are streaming to Datadog
   */
  logGroups?: ILogGroup[]
}

// https://docs.datadoghq.com/resources/json/kinesis-logs-cloudformation-template.json
export class KinesisToDatadogStream extends Construct {
  /**
   * The construct creates Kinesis Firehose Delivery Stream, S3 bucket for failed events,
   * Creates lambda which automates subscription of cloudwatch logs to datadog automatically.
   */

  private datadogDeliveryStream: CfnDeliveryStream
  private cloudWatchLogsRole: Role

  constructor(scope: Construct, id: string, props: KinesisToDatadogStreamProps) {

    super(scope, id)

    props = Object.assign({}, props, { datadogEndpointUrl: 'https://aws-kinesis-http-intake.logs.datadoghq.com/v1/input' })

    this.setupLogStream(props)
    this.setupAutomaticSubscriptionForNewLogGroups()

    // Setup logGroups if passed on startup
    props.logGroups?.forEach((logGroup, index) => {
      new CfnSubscriptionFilter(this, `SubscriptionFilter${index}`, {
        logGroupName: logGroup.logGroupName,
        destinationArn: this.datadogDeliveryStream.attrArn,
        filterPattern: FilterPattern.allEvents().logPatternString,
        roleArn: this.cloudWatchLogsRole.roleArn,
      })
    })
  }

  setupAutomaticSubscriptionForNewLogGroups() {

    const fn = new LFunction(this, 'CreateSubscriptionFilterFunction', {
      runtime: Runtime.PYTHON_3_9,
      handler: 'index.lambda_handler',
      code: Code.fromInline(`
import boto3

def lambda_handler(event, context):
  print("This Lambda Function can subscribe any new log group to Target-> Lambda Function")
  # Create CloudWatchLogs client
  cloudwatch_logs = boto3.client('logs')

  # Read logGroup name from the CreateLogGroup event triggered when new log group created
  log_group_to_subscribe = event['detail']['requestParameters']['logGroupName']

  print("The name of Log Group to subscribe ::",log_group_to_subscribe)

  FILTER_NAME = 'CW_TO_KINESIS_TO_DATADOG'
  LOG_GROUP = log_group_to_subscribe

  # Create a subscription filter
  cloudwatch_logs.put_subscription_filter(
      destinationArn="${this.datadogDeliveryStream.attrArn}",
      filterName= FILTER_NAME,
      filterPattern=' ',
      logGroupName=LOG_GROUP,
      roleArn="${this.cloudWatchLogsRole.roleArn}"
  )
      `),
    });


    fn.addToRolePolicy(new PolicyStatement({
      actions: ["logs:PutSubscriptionFilter"],
      effect: Effect.ALLOW,
      sid: "AllowCreateSubscriptionFilter",
      resources: [`arn:aws:logs:${Aws.REGION}:${Aws.ACCOUNT_ID}:log-group:*:*`]
    }));

    // Cloudwatch role gets assumed when boto client is created. Therefore, pass role is required.
    fn.addToRolePolicy(new PolicyStatement({
      actions: [ "iam:PassRole"],
      effect: Effect.ALLOW,
      sid: "AllowPassRole",
      resources: [this.cloudWatchLogsRole.roleArn]
    }));

    const rule = new Rule(this, 'EventRule', {
      description: 'Event rule',
      eventPattern: {
        source: ["aws.logs"],
        detailType: ["AWS API Call via CloudTrail"],
        detail: {
          "eventSource": ["logs.amazonaws.com"],
          "eventName": ["CreateLogGroup"]
        }
      },
    });

    rule.addTarget(new LambdaFunction(fn, {
      maxEventAge: Duration.hours(2), // Optional: set the maxEventAge retry policy
      retryAttempts: 2, // Optional: set the max number of retry attempts,
    }))
  }

  setupLogStream(props: KinesisToDatadogStreamProps) {
    const deliveryStreamLogGroup = new LogGroup(this, "DeliveryStreamLogGroup", { logGroupName: '/datadog/delivery-stream' });

    const deliveryStreamLogStream = new LogStream(
      this,
      "DeliveryStreamLogStream",
      {
        logGroup: deliveryStreamLogGroup,
      },
    )

    const failedDataBucket = new Bucket(this, "FailedDatadogDataBucket", {
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
      publicReadAccess: false,
      removalPolicy: RemovalPolicy.DESTROY, // TODO
      bucketName: `${Aws.ACCOUNT_ID}-datadog-kinesis-failed-data`
    })

    this.cloudWatchLogsRole = new Role(this, "CloudWatchLogsRole", {
      roleName: "DatadogIntegration-CWAssumeRole",
      assumedBy: new ServicePrincipal(`logs.${Aws.REGION}.amazonaws.com`),
    })

    const firehoseLogsRole = new Role(this, "FirehoseLogsRole", {
      roleName: 'DatadogIntegration-FirehoseAssumeRole',
      assumedBy: new ServicePrincipal("firehose.amazonaws.com"),
    })

    this.datadogDeliveryStream = new CfnDeliveryStream(
      this,
      "DeliveryStream",
      {
        deliveryStreamName: 'CW-To-Datadog-DS',
        deliveryStreamType: "DirectPut",
        httpEndpointDestinationConfiguration: {
          roleArn: firehoseLogsRole.roleArn,
          endpointConfiguration: {
            url: props.datadogEndpointUrl!,
            accessKey: Secret.fromSecretNameV2(
              this,
              "DatadogApiKeySecret",
              props.datadogApiKeySecretName,
            ).secretValue.toString(),
            name: "datadog-logs-endpoint",
          },
          requestConfiguration: {
            contentEncoding: "GZIP",
          },
          cloudWatchLoggingOptions: {
            enabled: true,
            logGroupName: deliveryStreamLogGroup.logGroupName,
            logStreamName: deliveryStreamLogStream.logStreamName,
          },
          bufferingHints: {
            intervalInSeconds: 60,
            sizeInMBs: 4,
          },
          retryOptions: {
            durationInSeconds: 60,
          },
          s3BackupMode: "FailedDataOnly",
          s3Configuration: {
            bucketArn: failedDataBucket.bucketArn,
            compressionFormat: "UNCOMPRESSED",
            roleArn: firehoseLogsRole.roleArn,
          },
        },
      },
    )

    new Policy(this, "CloudWatchLogsPolicy", {
      policyName: "CWToFirehosePutPolicy",
      document: new PolicyDocument({
        statements: [
          new PolicyStatement({
            actions: ["firehose:PutRecord", "firehose:PutRecordBatch"],
            resources: [this.datadogDeliveryStream.attrArn],
          }),
        ],
      }),
      roles: [this.cloudWatchLogsRole],
    })

    new Policy(this, "FirehoseLogsPolicy", {
      policyName: "FirehoseToS3PutPolicy",
      document: new PolicyDocument({
        statements: [
          new PolicyStatement({
            actions: [
              "s3:AbortMultipartUpload",
              "s3:GetBucketLocation",
              "s3:GetObject",
              "s3:ListBucket",
              "s3:ListBucketMultipartUploads",
              "s3:PutObject",
            ],
            resources: [
              failedDataBucket.bucketArn,
              `${failedDataBucket.bucketArn}/*`,
            ],
          }),
          new PolicyStatement({
            actions: ["logs:PutLogEvents"],
            resources: [
              `arn:aws:logs:${Aws.REGION}:${Aws.ACCOUNT_ID}:log-group:${deliveryStreamLogGroup.logGroupName}:log-stream:${deliveryStreamLogStream.logStreamName
              }`,
            ],
          }),
          new PolicyStatement({
            actions: [
              "kinesis:DescribeStream",
              "kinesis:GetShardIterator",
              "kinesis:GetRecords",
            ],
            resources: [this.datadogDeliveryStream.attrArn],
          }),
        ],
      }),
      roles: [firehoseLogsRole],
    })
  }
}
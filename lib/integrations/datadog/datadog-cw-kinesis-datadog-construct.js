"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KinesisToDatadogStream = void 0;
const aws_cdk_lib_1 = require("aws-cdk-lib");
const aws_events_1 = require("aws-cdk-lib/aws-events");
const aws_events_targets_1 = require("aws-cdk-lib/aws-events-targets");
const aws_iam_1 = require("aws-cdk-lib/aws-iam");
const aws_kinesisfirehose_1 = require("aws-cdk-lib/aws-kinesisfirehose");
const aws_lambda_1 = require("aws-cdk-lib/aws-lambda");
const aws_logs_1 = require("aws-cdk-lib/aws-logs");
const aws_s3_1 = require("aws-cdk-lib/aws-s3");
const aws_secretsmanager_1 = require("aws-cdk-lib/aws-secretsmanager");
const constructs_1 = require("constructs");
// https://docs.datadoghq.com/resources/json/kinesis-logs-cloudformation-template.json
class KinesisToDatadogStream extends constructs_1.Construct {
    constructor(scope, id, props) {
        var _a;
        super(scope, id);
        props = Object.assign({}, props, { datadogEndpointUrl: 'https://aws-kinesis-http-intake.logs.datadoghq.com/v1/input' });
        this.setupLogStream(props);
        this.setupAutomaticSubscriptionForNewLogGroups();
        // Setup logGroups if passed on startup
        (_a = props.logGroups) === null || _a === void 0 ? void 0 : _a.forEach((logGroup, index) => {
            new aws_logs_1.CfnSubscriptionFilter(this, `SubscriptionFilter${index}`, {
                logGroupName: logGroup.logGroupName,
                destinationArn: this.datadogDeliveryStream.attrArn,
                filterPattern: aws_logs_1.FilterPattern.allEvents().logPatternString,
                roleArn: this.cloudWatchLogsRole.roleArn,
            });
        });
    }
    setupAutomaticSubscriptionForNewLogGroups() {
        const fn = new aws_lambda_1.Function(this, 'CreateSubscriptionFilterFunction', {
            runtime: aws_lambda_1.Runtime.PYTHON_3_9,
            handler: 'index.lambda_handler',
            code: aws_lambda_1.Code.fromInline(`
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
        fn.addToRolePolicy(new aws_iam_1.PolicyStatement({
            actions: ["logs:PutSubscriptionFilter"],
            effect: aws_iam_1.Effect.ALLOW,
            sid: "AllowCreateSubscriptionFilter",
            resources: [`arn:aws:logs:${aws_cdk_lib_1.Aws.REGION}:${aws_cdk_lib_1.Aws.ACCOUNT_ID}:log-group:*:*`]
        }));
        // Cloudwatch role gets assumed when boto client is created. Therefore, pass role is required.
        fn.addToRolePolicy(new aws_iam_1.PolicyStatement({
            actions: ["iam:PassRole"],
            effect: aws_iam_1.Effect.ALLOW,
            sid: "AllowPassRole",
            resources: [this.cloudWatchLogsRole.roleArn]
        }));
        const rule = new aws_events_1.Rule(this, 'EventRule', {
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
        rule.addTarget(new aws_events_targets_1.LambdaFunction(fn, {
            maxEventAge: aws_cdk_lib_1.Duration.hours(2),
            retryAttempts: 2,
        }));
    }
    setupLogStream(props) {
        const deliveryStreamLogGroup = new aws_logs_1.LogGroup(this, "DeliveryStreamLogGroup", { logGroupName: '/datadog/delivery-stream' });
        const deliveryStreamLogStream = new aws_logs_1.LogStream(this, "DeliveryStreamLogStream", {
            logGroup: deliveryStreamLogGroup,
        });
        const failedDataBucket = new aws_s3_1.Bucket(this, "FailedDatadogDataBucket", {
            blockPublicAccess: aws_s3_1.BlockPublicAccess.BLOCK_ALL,
            enforceSSL: true,
            publicReadAccess: false,
            removalPolicy: aws_cdk_lib_1.RemovalPolicy.DESTROY,
            bucketName: `${aws_cdk_lib_1.Aws.ACCOUNT_ID}-datadog-kinesis-failed-data`
        });
        this.cloudWatchLogsRole = new aws_iam_1.Role(this, "CloudWatchLogsRole", {
            roleName: "DatadogIntegration-CWAssumeRole",
            assumedBy: new aws_iam_1.ServicePrincipal(`logs.${aws_cdk_lib_1.Aws.REGION}.amazonaws.com`),
        });
        const firehoseLogsRole = new aws_iam_1.Role(this, "FirehoseLogsRole", {
            roleName: 'DatadogIntegration-FirehoseAssumeRole',
            assumedBy: new aws_iam_1.ServicePrincipal("firehose.amazonaws.com"),
        });
        this.datadogDeliveryStream = new aws_kinesisfirehose_1.CfnDeliveryStream(this, "DeliveryStream", {
            deliveryStreamName: 'CW-To-Datadog-DS',
            deliveryStreamType: "DirectPut",
            httpEndpointDestinationConfiguration: {
                roleArn: firehoseLogsRole.roleArn,
                endpointConfiguration: {
                    url: props.datadogEndpointUrl,
                    accessKey: aws_secretsmanager_1.Secret.fromSecretNameV2(this, "DatadogApiKeySecret", props.datadogApiKeySecretName).secretValue.toString(),
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
        });
        new aws_iam_1.Policy(this, "CloudWatchLogsPolicy", {
            policyName: "CWToFirehosePutPolicy",
            document: new aws_iam_1.PolicyDocument({
                statements: [
                    new aws_iam_1.PolicyStatement({
                        actions: ["firehose:PutRecord", "firehose:PutRecordBatch"],
                        resources: [this.datadogDeliveryStream.attrArn],
                    }),
                ],
            }),
            roles: [this.cloudWatchLogsRole],
        });
        new aws_iam_1.Policy(this, "FirehoseLogsPolicy", {
            policyName: "FirehoseToS3PutPolicy",
            document: new aws_iam_1.PolicyDocument({
                statements: [
                    new aws_iam_1.PolicyStatement({
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
                    new aws_iam_1.PolicyStatement({
                        actions: ["logs:PutLogEvents"],
                        resources: [
                            `arn:aws:logs:${aws_cdk_lib_1.Aws.REGION}:${aws_cdk_lib_1.Aws.ACCOUNT_ID}:log-group:${deliveryStreamLogGroup.logGroupName}:log-stream:${deliveryStreamLogStream.logStreamName}`,
                        ],
                    }),
                    new aws_iam_1.PolicyStatement({
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
        });
    }
}
exports.KinesisToDatadogStream = KinesisToDatadogStream;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGF0YWRvZy1jdy1raW5lc2lzLWRhdGFkb2ctY29uc3RydWN0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZGF0YWRvZy1jdy1raW5lc2lzLWRhdGFkb2ctY29uc3RydWN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLDZDQUEwRDtBQUMxRCx1REFBNkM7QUFDN0MsdUVBQStEO0FBQy9ELGlEQUE2RztBQUM3Ryx5RUFBbUU7QUFDbkUsdURBQTZFO0FBQzdFLG1EQUEyRztBQUMzRywrQ0FBOEQ7QUFDOUQsdUVBQXVEO0FBQ3ZELDJDQUFzQztBQWtCdEMsc0ZBQXNGO0FBQ3RGLE1BQWEsc0JBQXVCLFNBQVEsc0JBQVM7SUFTbkQsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxLQUFrQzs7UUFFMUUsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUVoQixLQUFLLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxFQUFFLEVBQUUsS0FBSyxFQUFFLEVBQUUsa0JBQWtCLEVBQUUsNkRBQTZELEVBQUUsQ0FBQyxDQUFBO1FBRXZILElBQUksQ0FBQyxjQUFjLENBQUMsS0FBSyxDQUFDLENBQUE7UUFDMUIsSUFBSSxDQUFDLHlDQUF5QyxFQUFFLENBQUE7UUFFaEQsdUNBQXVDO1FBQ3ZDLE1BQUEsS0FBSyxDQUFDLFNBQVMsMENBQUUsT0FBTyxDQUFDLENBQUMsUUFBUSxFQUFFLEtBQUssRUFBRSxFQUFFO1lBQzNDLElBQUksZ0NBQXFCLENBQUMsSUFBSSxFQUFFLHFCQUFxQixLQUFLLEVBQUUsRUFBRTtnQkFDNUQsWUFBWSxFQUFFLFFBQVEsQ0FBQyxZQUFZO2dCQUNuQyxjQUFjLEVBQUUsSUFBSSxDQUFDLHFCQUFxQixDQUFDLE9BQU87Z0JBQ2xELGFBQWEsRUFBRSx3QkFBYSxDQUFDLFNBQVMsRUFBRSxDQUFDLGdCQUFnQjtnQkFDekQsT0FBTyxFQUFFLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxPQUFPO2FBQ3pDLENBQUMs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OzRCQUNQLHdCQUF3Qjs0QkFDeEIsMEJBQTBCOzRCQUMxQixvQkFBb0I7eUJBQ3JCO3dCQUNELFNBQVMsRUFBRSxDQUFDLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxPQUFPLENBQUM7cUJBQ2hELENBQUM7aUJBQ0g7YUFDRixDQUFDO1lBQ0YsS0FBSyxFQUFFLENBQUMsZ0JBQWdCLENBQUM7U0FDMUIsQ0FBQyxDQUFBO0lBQ0osQ0FBQztDQUNGO0FBek5ELHdEQXlOQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IEF3cywgRHVyYXRpb24sIFJlbW92YWxQb2xpY3kgfSBmcm9tIFwiYXdzLWNkay1saWJcIlxuaW1wb3J0IHsgUnVsZSB9IGZyb20gXCJhd3MtY2RrLWxpYi9hd3MtZXZlbnRzXCJcbmltcG9ydCB7IExhbWJkYUZ1bmN0aW9uIH0gZnJvbSBcImF3cy1jZGstbGliL2F3cy1ldmVudHMtdGFyZ2V0c1wiXG5pbXBvcnQgeyBSb2xlLCBTZXJ2aWNlUHJpbmNpcGFsLCBQb2xpY3ksIFBvbGljeURvY3VtZW50LCBQb2xpY3lTdGF0ZW1lbnQsIEVmZmVjdCB9IGZyb20gXCJhd3MtY2RrLWxpYi9hd3MtaWFtXCJcbmltcG9ydCB7IENmbkRlbGl2ZXJ5U3RyZWFtIH0gZnJvbSBcImF3cy1jZGstbGliL2F3cy1raW5lc2lzZmlyZWhvc2VcIlxuaW1wb3J0IHsgQ29kZSwgUnVudGltZSwgRnVuY3Rpb24gYXMgTEZ1bmN0aW9uIH0gZnJvbSBcImF3cy1jZGstbGliL2F3cy1sYW1iZGFcIlxuaW1wb3J0IHsgQ2ZuU3Vic2NyaXB0aW9uRmlsdGVyLCBGaWx0ZXJQYXR0ZXJuLCBJTG9nR3JvdXAsIExvZ0dyb3VwLCBMb2dTdHJlYW0gfSBmcm9tIFwiYXdzLWNkay1saWIvYXdzLWxvZ3NcIlxuaW1wb3J0IHsgQmxvY2tQdWJsaWNBY2Nlc3MsIEJ1Y2tldCB9IGZyb20gXCJhd3MtY2RrLWxpYi9hd3MtczNcIlxuaW1wb3J0IHsgU2VjcmV0IH0gZnJvbSBcImF3cy1jZGstbGliL2F3cy1zZWNyZXRzbWFuYWdlclwiXG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tIFwiY29uc3RydWN0c1wiXG5cbmV4cG9ydCBpbnRlcmZhY2UgS2luZXNpc1RvRGF0YWRvZ1N0cmVhbVByb3BzIHtcbiAgLyoqXG4gICAqXG4gICAqIFRoZSBuYW1lIG9mIHRoZSBTZWNyZXRzTWFuYWdlciBzZWNyZXQgd2hlcmUgeW91ciBEYXRhZG9nIEFQSSBrZXkgaXMgc2F2ZWQuXG4gICAqIFRoZSBzZWNyZXQgbXVzdCBiZSBhIEpTT04gb2JqZWN0IG9uIHRoZSBmb3JtYXQgeyBcInZhbHVlXCI6IFwiU0VDUkVUXCIgfVxuICAgKlxuICAgKi9cbiAgZGF0YWRvZ0FwaUtleVNlY3JldE5hbWU6IHN0cmluZ1xuXG4gIGRhdGFkb2dFbmRwb2ludFVybD86IHN0cmluZ1xuICAvKipcbiAgICogVGhlIENsb3VkV2F0Y2ggbG9nIGdyb3VwcyBmcm9tIHlvdSBhcmUgc3RyZWFtaW5nIHRvIERhdGFkb2dcbiAgICovXG4gIGxvZ0dyb3Vwcz86IElMb2dHcm91cFtdXG59XG5cbi8vIGh0dHBzOi8vZG9jcy5kYXRhZG9naHEuY29tL3Jlc291cmNlcy9qc29uL2tpbmVzaXMtbG9ncy1jbG91ZGZvcm1hdGlvbi10ZW1wbGF0ZS5qc29uXG5leHBvcnQgY2xhc3MgS2luZXNpc1RvRGF0YWRvZ1N0cmVhbSBleHRlbmRzIENvbnN0cnVjdCB7XG4gIC8qKlxuICAgKiBUaGUgY29uc3RydWN0IGNyZWF0ZXMgS2luZXNpcyBGaXJlaG9zZSBEZWxpdmVyeSBTdHJlYW0sIFMzIGJ1Y2tldCBmb3IgZmFpbGVkIGV2ZW50cyxcbiAgICogQ3JlYXRlcyBsYW1iZGEgd2hpY2ggYXV0b21hdGVzIHN1YnNjcmlwdGlvbiBvZiBjbG91ZHdhdGNoIGxvZ3MgdG8gZGF0YWRvZyBhdXRvbWF0aWNhbGx5LlxuICAgKi9cblxuICBwcml2YXRlIGRhdGFkb2dEZWxpdmVyeVN0cmVhbTogQ2ZuRGVsaXZlcnlTdHJlYW1cbiAgcHJpdmF0ZSBjbG91ZFdhdGNoTG9nc1JvbGU6IFJvbGVcblxuICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nLCBwcm9wczogS2luZXNpc1RvRGF0YWRvZ1N0cmVhbVByb3BzKSB7XG5cbiAgICBzdXBlcihzY29wZSwgaWQpXG5cbiAgICBwcm9wcyA9IE9iamVjdC5hc3NpZ24oe30sIHByb3BzLCB7IGRhdGFkb2dFbmRwb2ludFVybDogJ2h0dHBzOi8vYXdzLWtpbmVzaXMtaHR0cC1pbnRha2UubG9ncy5kYXRhZG9naHEuY29tL3YxL2lucHV0JyB9KVxuXG4gICAgdGhpcy5zZXR1cExvZ1N0cmVhbShwcm9wcylcbiAgICB0aGlzLnNldHVwQXV0b21hdGljU3Vic2NyaXB0aW9uRm9yTmV3TG9nR3JvdXBzKClcblxuICAgIC8vIFNldHVwIGxvZ0dyb3VwcyBpZiBwYXNzZWQgb24gc3RhcnR1cFxuICAgIHByb3BzLmxvZ0dyb3Vwcz8uZm9yRWFjaCgobG9nR3JvdXAsIGluZGV4KSA9PiB7XG4gICAgICBuZXcgQ2ZuU3Vic2NyaXB0aW9uRmlsdGVyKHRoaXMsIGBTdWJzY3JpcHRpb25GaWx0ZXIke2luZGV4fWAsIHtcbiAgICAgICAgbG9nR3JvdXBOYW1lOiBsb2dHcm91cC5sb2dHcm91cE5hbWUsXG4gICAgICAgIGRlc3RpbmF0aW9uQXJuOiB0aGlzLmRhdGFkb2dEZWxpdmVyeVN0cmVhbS5hdHRyQXJuLFxuICAgICAgICBmaWx0ZXJQYXR0ZXJuOiBGaWx0ZXJQYXR0ZXJuLmFsbEV2ZW50cygpLmxvZ1BhdHRlcm5TdHJpbmcsXG4gICAgICAgIHJvbGVBcm46IHRoaXMuY2xvdWRXYXRjaExvZ3NSb2xlLnJvbGVBcm4sXG4gICAgICB9KVxuICAgIH0pXG4gIH1cblxuICBzZXR1cEF1dG9tYXRpY1N1YnNjcmlwdGlvbkZvck5ld0xvZ0dyb3VwcygpIHtcblxuICAgIGNvbnN0IGZuID0gbmV3IExGdW5jdGlvbih0aGlzLCAnQ3JlYXRlU3Vic2NyaXB0aW9uRmlsdGVyRnVuY3Rpb24nLCB7XG4gICAgICBydW50aW1lOiBSdW50aW1lLlBZVEhPTl8zXzksXG4gICAgICBoYW5kbGVyOiAnaW5kZXgubGFtYmRhX2hhbmRsZXInLFxuICAgICAgY29kZTogQ29kZS5mcm9tSW5saW5lKGBcbmltcG9ydCBib3RvM1xuXG5kZWYgbGFtYmRhX2hhbmRsZXIoZXZlbnQsIGNvbnRleHQpOlxuICBwcmludChcIlRoaXMgTGFtYmRhIEZ1bmN0aW9uIGNhbiBzdWJzY3JpYmUgYW55IG5ldyBsb2cgZ3JvdXAgdG8gVGFyZ2V0LT4gTGFtYmRhIEZ1bmN0aW9uXCIpXG4gICMgQ3JlYXRlIENsb3VkV2F0Y2hMb2dzIGNsaWVudFxuICBjbG91ZHdhdGNoX2xvZ3MgPSBib3RvMy5jbGllbnQoJ2xvZ3MnKVxuXG4gICMgUmVhZCBsb2dHcm91cCBuYW1lIGZyb20gdGhlIENyZWF0ZUxvZ0dyb3VwIGV2ZW50IHRyaWdnZXJlZCB3aGVuIG5ldyBsb2cgZ3JvdXAgY3JlYXRlZFxuICBsb2dfZ3JvdXBfdG9fc3Vic2NyaWJlID0gZXZlbnRbJ2RldGFpbCddWydyZXF1ZXN0UGFyYW1ldGVycyddWydsb2dHcm91cE5hbWUnXVxuXG4gIHByaW50KFwiVGhlIG5hbWUgb2YgTG9nIEdyb3VwIHRvIHN1YnNjcmliZSA6OlwiLGxvZ19ncm91cF90b19zdWJzY3JpYmUpXG5cbiAgRklMVEVSX05BTUUgPSAnQ1dfVE9fS0lORVNJU19UT19EQVRBRE9HJ1xuICBMT0dfR1JPVVAgPSBsb2dfZ3JvdXBfdG9fc3Vic2NyaWJlXG5cbiAgIyBDcmVhdGUgYSBzdWJzY3JpcHRpb24gZmlsdGVyXG4gIGNsb3Vkd2F0Y2hfbG9ncy5wdXRfc3Vic2NyaXB0aW9uX2ZpbHRlcihcbiAgICAgIGRlc3RpbmF0aW9uQXJuPVwiJHt0aGlzLmRhdGFkb2dEZWxpdmVyeVN0cmVhbS5hdHRyQXJufVwiLFxuICAgICAgZmlsdGVyTmFtZT0gRklMVEVSX05BTUUsXG4gICAgICBmaWx0ZXJQYXR0ZXJuPScgJyxcbiAgICAgIGxvZ0dyb3VwTmFtZT1MT0dfR1JPVVAsXG4gICAgICByb2xlQXJuPVwiJHt0aGlzLmNsb3VkV2F0Y2hMb2dzUm9sZS5yb2xlQXJufVwiXG4gIClcbiAgICAgIGApLFxuICAgIH0pO1xuXG5cbiAgICBmbi5hZGRUb1JvbGVQb2xpY3kobmV3IFBvbGljeVN0YXRlbWVudCh7XG4gICAgICBhY3Rpb25zOiBbXCJsb2dzOlB1dFN1YnNjcmlwdGlvbkZpbHRlclwiXSxcbiAgICAgIGVmZmVjdDogRWZmZWN0LkFMTE9XLFxuICAgICAgc2lkOiBcIkFsbG93Q3JlYXRlU3Vic2NyaXB0aW9uRmlsdGVyXCIsXG4gICAgICByZXNvdXJjZXM6IFtgYXJuOmF3czpsb2dzOiR7QXdzLlJFR0lPTn06JHtBd3MuQUNDT1VOVF9JRH06bG9nLWdyb3VwOio6KmBdXG4gICAgfSkpO1xuXG4gICAgLy8gQ2xvdWR3YXRjaCByb2xlIGdldHMgYXNzdW1lZCB3aGVuIGJvdG8gY2xpZW50IGlzIGNyZWF0ZWQuIFRoZXJlZm9yZSwgcGFzcyByb2xlIGlzIHJlcXVpcmVkLlxuICAgIGZuLmFkZFRvUm9sZVBvbGljeShuZXcgUG9saWN5U3RhdGVtZW50KHtcbiAgICAgIGFjdGlvbnM6IFsgXCJpYW06UGFzc1JvbGVcIl0sXG4gICAgICBlZmZlY3Q6IEVmZmVjdC5BTExPVyxcbiAgICAgIHNpZDogXCJBbGxvd1Bhc3NSb2xlXCIsXG4gICAgICByZXNvdXJjZXM6IFt0aGlzLmNsb3VkV2F0Y2hMb2dzUm9sZS5yb2xlQXJuXVxuICAgIH0pKTtcblxuICAgIGNvbnN0IHJ1bGUgPSBuZXcgUnVsZSh0aGlzLCAnRXZlbnRSdWxlJywge1xuICAgICAgZGVzY3JpcHRpb246ICdFdmVudCBydWxlJyxcbiAgICAgIGV2ZW50UGF0dGVybjoge1xuICAgICAgICBzb3VyY2U6IFtcImF3cy5sb2dzXCJdLFxuICAgICAgICBkZXRhaWxUeXBlOiBbXCJBV1MgQVBJIENhbGwgdmlhIENsb3VkVHJhaWxcIl0sXG4gICAgICAgIGRldGFpbDoge1xuICAgICAgICAgIFwiZXZlbnRTb3VyY2VcIjogW1wibG9ncy5hbWF6b25hd3MuY29tXCJdLFxuICAgICAgICAgIFwiZXZlbnROYW1lXCI6IFtcIkNyZWF0ZUxvZ0dyb3VwXCJdXG4gICAgICAgIH1cbiAgICAgIH0sXG4gICAgfSk7XG5cbiAgICBydWxlLmFkZFRhcmdldChuZXcgTGFtYmRhRnVuY3Rpb24oZm4sIHtcbiAgICAgIG1heEV2ZW50QWdlOiBEdXJhdGlvbi5ob3VycygyKSwgLy8gT3B0aW9uYWw6IHNldCB0aGUgbWF4RXZlbnRBZ2UgcmV0cnkgcG9saWN5XG4gICAgICByZXRyeUF0dGVtcHRzOiAyLCAvLyBPcHRpb25hbDogc2V0IHRoZSBtYXggbnVtYmVyIG9mIHJldHJ5IGF0dGVtcHRzLFxuICAgIH0pKVxuICB9XG5cbiAgc2V0dXBMb2dTdHJlYW0ocHJvcHM6IEtpbmVzaXNUb0RhdGFkb2dTdHJlYW1Qcm9wcykge1xuICAgIGNvbnN0IGRlbGl2ZXJ5U3RyZWFtTG9nR3JvdXAgPSBuZXcgTG9nR3JvdXAodGhpcywgXCJEZWxpdmVyeVN0cmVhbUxvZ0dyb3VwXCIsIHsgbG9nR3JvdXBOYW1lOiAnL2RhdGFkb2cvZGVsaXZlcnktc3RyZWFtJyB9KTtcblxuICAgIGNvbnN0IGRlbGl2ZXJ5U3RyZWFtTG9nU3RyZWFtID0gbmV3IExvZ1N0cmVhbShcbiAgICAgIHRoaXMsXG4gICAgICBcIkRlbGl2ZXJ5U3RyZWFtTG9nU3RyZWFtXCIsXG4gICAgICB7XG4gICAgICAgIGxvZ0dyb3VwOiBkZWxpdmVyeVN0cmVhbUxvZ0dyb3VwLFxuICAgICAgfSxcbiAgICApXG5cbiAgICBjb25zdCBmYWlsZWREYXRhQnVja2V0ID0gbmV3IEJ1Y2tldCh0aGlzLCBcIkZhaWxlZERhdGFkb2dEYXRhQnVja2V0XCIsIHtcbiAgICAgIGJsb2NrUHVibGljQWNjZXNzOiBCbG9ja1B1YmxpY0FjY2Vzcy5CTE9DS19BTEwsXG4gICAgICBlbmZvcmNlU1NMOiB0cnVlLFxuICAgICAgcHVibGljUmVhZEFjY2VzczogZmFsc2UsXG4gICAgICByZW1vdmFsUG9saWN5OiBSZW1vdmFsUG9saWN5LkRFU1RST1ksIC8vIFRPRE9cbiAgICAgIGJ1Y2tldE5hbWU6IGAke0F3cy5BQ0NPVU5UX0lEfS1kYXRhZG9nLWtpbmVzaXMtZmFpbGVkLWRhdGFgXG4gICAgfSlcblxuICAgIHRoaXMuY2xvdWRXYXRjaExvZ3NSb2xlID0gbmV3IFJvbGUodGhpcywgXCJDbG91ZFdhdGNoTG9nc1JvbGVcIiwge1xuICAgICAgcm9sZU5hbWU6IFwiRGF0YWRvZ0ludGVncmF0aW9uLUNXQXNzdW1lUm9sZVwiLFxuICAgICAgYXNzdW1lZEJ5OiBuZXcgU2VydmljZVByaW5jaXBhbChgbG9ncy4ke0F3cy5SRUdJT059LmFtYXpvbmF3cy5jb21gKSxcbiAgICB9KVxuXG4gICAgY29uc3QgZmlyZWhvc2VMb2dzUm9sZSA9IG5ldyBSb2xlKHRoaXMsIFwiRmlyZWhvc2VMb2dzUm9sZVwiLCB7XG4gICAgICByb2xlTmFtZTogJ0RhdGFkb2dJbnRlZ3JhdGlvbi1GaXJlaG9zZUFzc3VtZVJvbGUnLFxuICAgICAgYXNzdW1lZEJ5OiBuZXcgU2VydmljZVByaW5jaXBhbChcImZpcmVob3NlLmFtYXpvbmF3cy5jb21cIiksXG4gICAgfSlcblxuICAgIHRoaXMuZGF0YWRvZ0RlbGl2ZXJ5U3RyZWFtID0gbmV3IENmbkRlbGl2ZXJ5U3RyZWFtKFxuICAgICAgdGhpcyxcbiAgICAgIFwiRGVsaXZlcnlTdHJlYW1cIixcbiAgICAgIHtcbiAgICAgICAgZGVsaXZlcnlTdHJlYW1OYW1lOiAnQ1ctVG8tRGF0YWRvZy1EUycsXG4gICAgICAgIGRlbGl2ZXJ5U3RyZWFtVHlwZTogXCJEaXJlY3RQdXRcIixcbiAgICAgICAgaHR0cEVuZHBvaW50RGVzdGluYXRpb25Db25maWd1cmF0aW9uOiB7XG4gICAgICAgICAgcm9sZUFybjogZmlyZWhvc2VMb2dzUm9sZS5yb2xlQXJuLFxuICAgICAgICAgIGVuZHBvaW50Q29uZmlndXJhdGlvbjoge1xuICAgICAgICAgICAgdXJsOiBwcm9wcy5kYXRhZG9nRW5kcG9pbnRVcmwhLFxuICAgICAgICAgICAgYWNjZXNzS2V5OiBTZWNyZXQuZnJvbVNlY3JldE5hbWVWMihcbiAgICAgICAgICAgICAgdGhpcyxcbiAgICAgICAgICAgICAgXCJEYXRhZG9nQXBpS2V5U2VjcmV0XCIsXG4gICAgICAgICAgICAgIHByb3BzLmRhdGFkb2dBcGlLZXlTZWNyZXROYW1lLFxuICAgICAgICAgICAgKS5zZWNyZXRWYWx1ZS50b1N0cmluZygpLFxuICAgICAgICAgICAgbmFtZTogXCJkYXRhZG9nLWxvZ3MtZW5kcG9pbnRcIixcbiAgICAgICAgICB9LFxuICAgICAgICAgIHJlcXVlc3RDb25maWd1cmF0aW9uOiB7XG4gICAgICAgICAgICBjb250ZW50RW5jb2Rpbmc6IFwiR1pJUFwiLFxuICAgICAgICAgIH0sXG4gICAgICAgICAgY2xvdWRXYXRjaExvZ2dpbmdPcHRpb25zOiB7XG4gICAgICAgICAgICBlbmFibGVkOiB0cnVlLFxuICAgICAgICAgICAgbG9nR3JvdXBOYW1lOiBkZWxpdmVyeVN0cmVhbUxvZ0dyb3VwLmxvZ0dyb3VwTmFtZSxcbiAgICAgICAgICAgIGxvZ1N0cmVhbU5hbWU6IGRlbGl2ZXJ5U3RyZWFtTG9nU3RyZWFtLmxvZ1N0cmVhbU5hbWUsXG4gICAgICAgICAgfSxcbiAgICAgICAgICBidWZmZXJpbmdIaW50czoge1xuICAgICAgICAgICAgaW50ZXJ2YWxJblNlY29uZHM6IDYwLFxuICAgICAgICAgICAgc2l6ZUluTUJzOiA0LFxuICAgICAgICAgIH0sXG4gICAgICAgICAgcmV0cnlPcHRpb25zOiB7XG4gICAgICAgICAgICBkdXJhdGlvbkluU2Vjb25kczogNjAsXG4gICAgICAgICAgfSxcbiAgICAgICAgICBzM0JhY2t1cE1vZGU6IFwiRmFpbGVkRGF0YU9ubHlcIixcbiAgICAgICAgICBzM0NvbmZpZ3VyYXRpb246IHtcbiAgICAgICAgICAgIGJ1Y2tldEFybjogZmFpbGVkRGF0YUJ1Y2tldC5idWNrZXRBcm4sXG4gICAgICAgICAgICBjb21wcmVzc2lvbkZvcm1hdDogXCJVTkNPTVBSRVNTRURcIixcbiAgICAgICAgICAgIHJvbGVBcm46IGZpcmVob3NlTG9nc1JvbGUucm9sZUFybixcbiAgICAgICAgICB9LFxuICAgICAgICB9LFxuICAgICAgfSxcbiAgICApXG5cbiAgICBuZXcgUG9saWN5KHRoaXMsIFwiQ2xvdWRXYXRjaExvZ3NQb2xpY3lcIiwge1xuICAgICAgcG9saWN5TmFtZTogXCJDV1RvRmlyZWhvc2VQdXRQb2xpY3lcIixcbiAgICAgIGRvY3VtZW50OiBuZXcgUG9saWN5RG9jdW1lbnQoe1xuICAgICAgICBzdGF0ZW1lbnRzOiBbXG4gICAgICAgICAgbmV3IFBvbGljeVN0YXRlbWVudCh7XG4gICAgICAgICAgICBhY3Rpb25zOiBbXCJmaXJlaG9zZTpQdXRSZWNvcmRcIiwgXCJmaXJlaG9zZTpQdXRSZWNvcmRCYXRjaFwiXSxcbiAgICAgICAgICAgIHJlc291cmNlczogW3RoaXMuZGF0YWRvZ0RlbGl2ZXJ5U3RyZWFtLmF0dHJBcm5dLFxuICAgICAgICAgIH0pLFxuICAgICAgICBdLFxuICAgICAgfSksXG4gICAgICByb2xlczogW3RoaXMuY2xvdWRXYXRjaExvZ3NSb2xlXSxcbiAgICB9KVxuXG4gICAgbmV3IFBvbGljeSh0aGlzLCBcIkZpcmVob3NlTG9nc1BvbGljeVwiLCB7XG4gICAgICBwb2xpY3lOYW1lOiBcIkZpcmVob3NlVG9TM1B1dFBvbGljeVwiLFxuICAgICAgZG9jdW1lbnQ6IG5ldyBQb2xpY3lEb2N1bWVudCh7XG4gICAgICAgIHN0YXRlbWVudHM6IFtcbiAgICAgICAgICBuZXcgUG9saWN5U3RhdGVtZW50KHtcbiAgICAgICAgICAgIGFjdGlvbnM6IFtcbiAgICAgICAgICAgICAgXCJzMzpBYm9ydE11bHRpcGFydFVwbG9hZFwiLFxuICAgICAgICAgICAgICBcInMzOkdldEJ1Y2tldExvY2F0aW9uXCIsXG4gICAgICAgICAgICAgIFwiczM6R2V0T2JqZWN0XCIsXG4gICAgICAgICAgICAgIFwiczM6TGlzdEJ1Y2tldFwiLFxuICAgICAgICAgICAgICBcInMzOkxpc3RCdWNrZXRNdWx0aXBhcnRVcGxvYWRzXCIsXG4gICAgICAgICAgICAgIFwiczM6UHV0T2JqZWN0XCIsXG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgcmVzb3VyY2VzOiBbXG4gICAgICAgICAgICAgIGZhaWxlZERhdGFCdWNrZXQuYnVja2V0QXJuLFxuICAgICAgICAgICAgICBgJHtmYWlsZWREYXRhQnVja2V0LmJ1Y2tldEFybn0vKmAsXG4gICAgICAgICAgICBdLFxuICAgICAgICAgIH0pLFxuICAgICAgICAgIG5ldyBQb2xpY3lTdGF0ZW1lbnQoe1xuICAgICAgICAgICAgYWN0aW9uczogW1wibG9nczpQdXRMb2dFdmVudHNcIl0sXG4gICAgICAgICAgICByZXNvdXJjZXM6IFtcbiAgICAgICAgICAgICAgYGFybjphd3M6bG9nczoke0F3cy5SRUdJT059OiR7QXdzLkFDQ09VTlRfSUR9OmxvZy1ncm91cDoke2RlbGl2ZXJ5U3RyZWFtTG9nR3JvdXAubG9nR3JvdXBOYW1lfTpsb2ctc3RyZWFtOiR7ZGVsaXZlcnlTdHJlYW1Mb2dTdHJlYW0ubG9nU3RyZWFtTmFtZVxuICAgICAgICAgICAgICB9YCxcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgfSksXG4gICAgICAgICAgbmV3IFBvbGljeVN0YXRlbWVudCh7XG4gICAgICAgICAgICBhY3Rpb25zOiBbXG4gICAgICAgICAgICAgIFwia2luZXNpczpEZXNjcmliZVN0cmVhbVwiLFxuICAgICAgICAgICAgICBcImtpbmVzaXM6R2V0U2hhcmRJdGVyYXRvclwiLFxuICAgICAgICAgICAgICBcImtpbmVzaXM6R2V0UmVjb3Jkc1wiLFxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIHJlc291cmNlczogW3RoaXMuZGF0YWRvZ0RlbGl2ZXJ5U3RyZWFtLmF0dHJBcm5dLFxuICAgICAgICAgIH0pLFxuICAgICAgICBdLFxuICAgICAgfSksXG4gICAgICByb2xlczogW2ZpcmVob3NlTG9nc1JvbGVdLFxuICAgIH0pXG4gIH1cbn0iXX0=
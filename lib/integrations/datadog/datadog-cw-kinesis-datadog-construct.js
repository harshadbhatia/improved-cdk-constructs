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
            retryAttempts: 2, // Optional: set the max number of retry attempts,
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGF0YWRvZy1jdy1raW5lc2lzLWRhdGFkb2ctY29uc3RydWN0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZGF0YWRvZy1jdy1raW5lc2lzLWRhdGFkb2ctY29uc3RydWN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLDZDQUEwRDtBQUMxRCx1REFBNkM7QUFDN0MsdUVBQStEO0FBQy9ELGlEQUE2RztBQUM3Ryx5RUFBbUU7QUFDbkUsdURBQTZFO0FBQzdFLG1EQUEyRztBQUMzRywrQ0FBOEQ7QUFDOUQsdUVBQXVEO0FBQ3ZELDJDQUFzQztBQWtCdEMsc0ZBQXNGO0FBQ3RGLE1BQWEsc0JBQXVCLFNBQVEsc0JBQVM7SUFTbkQsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxLQUFrQzs7UUFFMUUsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUVoQixLQUFLLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxFQUFFLEVBQUUsS0FBSyxFQUFFLEVBQUUsa0JBQWtCLEVBQUUsNkRBQTZELEVBQUUsQ0FBQyxDQUFBO1FBRXZILElBQUksQ0FBQyxjQUFjLENBQUMsS0FBSyxDQUFDLENBQUE7UUFDMUIsSUFBSSxDQUFDLHlDQUF5QyxFQUFFLENBQUE7UUFFaEQsdUNBQXVDO1FBQ3ZDLE1BQUEsS0FBSyxDQUFDLFNBQVMsMENBQUUsT0FBTyxDQUFDLENBQUMsUUFBUSxFQUFFLEtBQUssRUFBRSxFQUFFO1lBQzNDLElBQUksZ0NBQXFCLENBQUMsSUFBSSxFQUFFLHFCQUFxQixLQUFLLEVBQUUsRUFBRTtnQkFDNUQsWUFBWSxFQUFFLFFBQVEsQ0FBQyxZQUFZO2dCQUNuQyxjQUFjLEVBQUUsSUFBSSxDQUFDLHFCQUFxQixDQUFDLE9BQU87Z0JBQ2xELGFBQWEsRUFBRSx3QkFBYSxDQUFDLFNBQVMsRUFBRSxDQUFDLGdCQUFnQjtnQkFDekQsT0FBTyxFQUFFLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxPQUFPO2FBQ3pDLENBQUMs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O3dCQUNsQixPQUFPLEVBQUU7NEJBQ1Asd0JBQXdCOzRCQUN4QiwwQkFBMEI7NEJBQzFCLG9CQUFvQjt5QkFDckI7d0JBQ0QsU0FBUyxFQUFFLENBQUMsSUFBSSxDQUFDLHFCQUFxQixDQUFDLE9BQU8sQ0FBQztxQkFDaEQsQ0FBQztpQkFDSDthQUNGLENBQUM7WUFDRixLQUFLLEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQztTQUMxQixDQUFDLENBQUE7SUFDSixDQUFDO0NBQ0Y7QUF6TkQsd0RBeU5DIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQXdzLCBEdXJhdGlvbiwgUmVtb3ZhbFBvbGljeSB9IGZyb20gXCJhd3MtY2RrLWxpYlwiXG5pbXBvcnQgeyBSdWxlIH0gZnJvbSBcImF3cy1jZGstbGliL2F3cy1ldmVudHNcIlxuaW1wb3J0IHsgTGFtYmRhRnVuY3Rpb24gfSBmcm9tIFwiYXdzLWNkay1saWIvYXdzLWV2ZW50cy10YXJnZXRzXCJcbmltcG9ydCB7IFJvbGUsIFNlcnZpY2VQcmluY2lwYWwsIFBvbGljeSwgUG9saWN5RG9jdW1lbnQsIFBvbGljeVN0YXRlbWVudCwgRWZmZWN0IH0gZnJvbSBcImF3cy1jZGstbGliL2F3cy1pYW1cIlxuaW1wb3J0IHsgQ2ZuRGVsaXZlcnlTdHJlYW0gfSBmcm9tIFwiYXdzLWNkay1saWIvYXdzLWtpbmVzaXNmaXJlaG9zZVwiXG5pbXBvcnQgeyBDb2RlLCBSdW50aW1lLCBGdW5jdGlvbiBhcyBMRnVuY3Rpb24gfSBmcm9tIFwiYXdzLWNkay1saWIvYXdzLWxhbWJkYVwiXG5pbXBvcnQgeyBDZm5TdWJzY3JpcHRpb25GaWx0ZXIsIEZpbHRlclBhdHRlcm4sIElMb2dHcm91cCwgTG9nR3JvdXAsIExvZ1N0cmVhbSB9IGZyb20gXCJhd3MtY2RrLWxpYi9hd3MtbG9nc1wiXG5pbXBvcnQgeyBCbG9ja1B1YmxpY0FjY2VzcywgQnVja2V0IH0gZnJvbSBcImF3cy1jZGstbGliL2F3cy1zM1wiXG5pbXBvcnQgeyBTZWNyZXQgfSBmcm9tIFwiYXdzLWNkay1saWIvYXdzLXNlY3JldHNtYW5hZ2VyXCJcbmltcG9ydCB7IENvbnN0cnVjdCB9IGZyb20gXCJjb25zdHJ1Y3RzXCJcblxuZXhwb3J0IGludGVyZmFjZSBLaW5lc2lzVG9EYXRhZG9nU3RyZWFtUHJvcHMge1xuICAvKipcbiAgICpcbiAgICogVGhlIG5hbWUgb2YgdGhlIFNlY3JldHNNYW5hZ2VyIHNlY3JldCB3aGVyZSB5b3VyIERhdGFkb2cgQVBJIGtleSBpcyBzYXZlZC5cbiAgICogVGhlIHNlY3JldCBtdXN0IGJlIGEgSlNPTiBvYmplY3Qgb24gdGhlIGZvcm1hdCB7IFwidmFsdWVcIjogXCJTRUNSRVRcIiB9XG4gICAqXG4gICAqL1xuICBkYXRhZG9nQXBpS2V5U2VjcmV0TmFtZTogc3RyaW5nXG5cbiAgZGF0YWRvZ0VuZHBvaW50VXJsPzogc3RyaW5nXG4gIC8qKlxuICAgKiBUaGUgQ2xvdWRXYXRjaCBsb2cgZ3JvdXBzIGZyb20geW91IGFyZSBzdHJlYW1pbmcgdG8gRGF0YWRvZ1xuICAgKi9cbiAgbG9nR3JvdXBzPzogSUxvZ0dyb3VwW11cbn1cblxuLy8gaHR0cHM6Ly9kb2NzLmRhdGFkb2docS5jb20vcmVzb3VyY2VzL2pzb24va2luZXNpcy1sb2dzLWNsb3VkZm9ybWF0aW9uLXRlbXBsYXRlLmpzb25cbmV4cG9ydCBjbGFzcyBLaW5lc2lzVG9EYXRhZG9nU3RyZWFtIGV4dGVuZHMgQ29uc3RydWN0IHtcbiAgLyoqXG4gICAqIFRoZSBjb25zdHJ1Y3QgY3JlYXRlcyBLaW5lc2lzIEZpcmVob3NlIERlbGl2ZXJ5IFN0cmVhbSwgUzMgYnVja2V0IGZvciBmYWlsZWQgZXZlbnRzLFxuICAgKiBDcmVhdGVzIGxhbWJkYSB3aGljaCBhdXRvbWF0ZXMgc3Vic2NyaXB0aW9uIG9mIGNsb3Vkd2F0Y2ggbG9ncyB0byBkYXRhZG9nIGF1dG9tYXRpY2FsbHkuXG4gICAqL1xuXG4gIHByaXZhdGUgZGF0YWRvZ0RlbGl2ZXJ5U3RyZWFtOiBDZm5EZWxpdmVyeVN0cmVhbVxuICBwcml2YXRlIGNsb3VkV2F0Y2hMb2dzUm9sZTogUm9sZVxuXG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcsIHByb3BzOiBLaW5lc2lzVG9EYXRhZG9nU3RyZWFtUHJvcHMpIHtcblxuICAgIHN1cGVyKHNjb3BlLCBpZClcblxuICAgIHByb3BzID0gT2JqZWN0LmFzc2lnbih7fSwgcHJvcHMsIHsgZGF0YWRvZ0VuZHBvaW50VXJsOiAnaHR0cHM6Ly9hd3Mta2luZXNpcy1odHRwLWludGFrZS5sb2dzLmRhdGFkb2docS5jb20vdjEvaW5wdXQnIH0pXG5cbiAgICB0aGlzLnNldHVwTG9nU3RyZWFtKHByb3BzKVxuICAgIHRoaXMuc2V0dXBBdXRvbWF0aWNTdWJzY3JpcHRpb25Gb3JOZXdMb2dHcm91cHMoKVxuXG4gICAgLy8gU2V0dXAgbG9nR3JvdXBzIGlmIHBhc3NlZCBvbiBzdGFydHVwXG4gICAgcHJvcHMubG9nR3JvdXBzPy5mb3JFYWNoKChsb2dHcm91cCwgaW5kZXgpID0+IHtcbiAgICAgIG5ldyBDZm5TdWJzY3JpcHRpb25GaWx0ZXIodGhpcywgYFN1YnNjcmlwdGlvbkZpbHRlciR7aW5kZXh9YCwge1xuICAgICAgICBsb2dHcm91cE5hbWU6IGxvZ0dyb3VwLmxvZ0dyb3VwTmFtZSxcbiAgICAgICAgZGVzdGluYXRpb25Bcm46IHRoaXMuZGF0YWRvZ0RlbGl2ZXJ5U3RyZWFtLmF0dHJBcm4sXG4gICAgICAgIGZpbHRlclBhdHRlcm46IEZpbHRlclBhdHRlcm4uYWxsRXZlbnRzKCkubG9nUGF0dGVyblN0cmluZyxcbiAgICAgICAgcm9sZUFybjogdGhpcy5jbG91ZFdhdGNoTG9nc1JvbGUucm9sZUFybixcbiAgICAgIH0pXG4gICAgfSlcbiAgfVxuXG4gIHNldHVwQXV0b21hdGljU3Vic2NyaXB0aW9uRm9yTmV3TG9nR3JvdXBzKCkge1xuXG4gICAgY29uc3QgZm4gPSBuZXcgTEZ1bmN0aW9uKHRoaXMsICdDcmVhdGVTdWJzY3JpcHRpb25GaWx0ZXJGdW5jdGlvbicsIHtcbiAgICAgIHJ1bnRpbWU6IFJ1bnRpbWUuUFlUSE9OXzNfOSxcbiAgICAgIGhhbmRsZXI6ICdpbmRleC5sYW1iZGFfaGFuZGxlcicsXG4gICAgICBjb2RlOiBDb2RlLmZyb21JbmxpbmUoYFxuaW1wb3J0IGJvdG8zXG5cbmRlZiBsYW1iZGFfaGFuZGxlcihldmVudCwgY29udGV4dCk6XG4gIHByaW50KFwiVGhpcyBMYW1iZGEgRnVuY3Rpb24gY2FuIHN1YnNjcmliZSBhbnkgbmV3IGxvZyBncm91cCB0byBUYXJnZXQtPiBMYW1iZGEgRnVuY3Rpb25cIilcbiAgIyBDcmVhdGUgQ2xvdWRXYXRjaExvZ3MgY2xpZW50XG4gIGNsb3Vkd2F0Y2hfbG9ncyA9IGJvdG8zLmNsaWVudCgnbG9ncycpXG5cbiAgIyBSZWFkIGxvZ0dyb3VwIG5hbWUgZnJvbSB0aGUgQ3JlYXRlTG9nR3JvdXAgZXZlbnQgdHJpZ2dlcmVkIHdoZW4gbmV3IGxvZyBncm91cCBjcmVhdGVkXG4gIGxvZ19ncm91cF90b19zdWJzY3JpYmUgPSBldmVudFsnZGV0YWlsJ11bJ3JlcXVlc3RQYXJhbWV0ZXJzJ11bJ2xvZ0dyb3VwTmFtZSddXG5cbiAgcHJpbnQoXCJUaGUgbmFtZSBvZiBMb2cgR3JvdXAgdG8gc3Vic2NyaWJlIDo6XCIsbG9nX2dyb3VwX3RvX3N1YnNjcmliZSlcblxuICBGSUxURVJfTkFNRSA9ICdDV19UT19LSU5FU0lTX1RPX0RBVEFET0cnXG4gIExPR19HUk9VUCA9IGxvZ19ncm91cF90b19zdWJzY3JpYmVcblxuICAjIENyZWF0ZSBhIHN1YnNjcmlwdGlvbiBmaWx0ZXJcbiAgY2xvdWR3YXRjaF9sb2dzLnB1dF9zdWJzY3JpcHRpb25fZmlsdGVyKFxuICAgICAgZGVzdGluYXRpb25Bcm49XCIke3RoaXMuZGF0YWRvZ0RlbGl2ZXJ5U3RyZWFtLmF0dHJBcm59XCIsXG4gICAgICBmaWx0ZXJOYW1lPSBGSUxURVJfTkFNRSxcbiAgICAgIGZpbHRlclBhdHRlcm49JyAnLFxuICAgICAgbG9nR3JvdXBOYW1lPUxPR19HUk9VUCxcbiAgICAgIHJvbGVBcm49XCIke3RoaXMuY2xvdWRXYXRjaExvZ3NSb2xlLnJvbGVBcm59XCJcbiAgKVxuICAgICAgYCksXG4gICAgfSk7XG5cblxuICAgIGZuLmFkZFRvUm9sZVBvbGljeShuZXcgUG9saWN5U3RhdGVtZW50KHtcbiAgICAgIGFjdGlvbnM6IFtcImxvZ3M6UHV0U3Vic2NyaXB0aW9uRmlsdGVyXCJdLFxuICAgICAgZWZmZWN0OiBFZmZlY3QuQUxMT1csXG4gICAgICBzaWQ6IFwiQWxsb3dDcmVhdGVTdWJzY3JpcHRpb25GaWx0ZXJcIixcbiAgICAgIHJlc291cmNlczogW2Bhcm46YXdzOmxvZ3M6JHtBd3MuUkVHSU9OfToke0F3cy5BQ0NPVU5UX0lEfTpsb2ctZ3JvdXA6KjoqYF1cbiAgICB9KSk7XG5cbiAgICAvLyBDbG91ZHdhdGNoIHJvbGUgZ2V0cyBhc3N1bWVkIHdoZW4gYm90byBjbGllbnQgaXMgY3JlYXRlZC4gVGhlcmVmb3JlLCBwYXNzIHJvbGUgaXMgcmVxdWlyZWQuXG4gICAgZm4uYWRkVG9Sb2xlUG9saWN5KG5ldyBQb2xpY3lTdGF0ZW1lbnQoe1xuICAgICAgYWN0aW9uczogWyBcImlhbTpQYXNzUm9sZVwiXSxcbiAgICAgIGVmZmVjdDogRWZmZWN0LkFMTE9XLFxuICAgICAgc2lkOiBcIkFsbG93UGFzc1JvbGVcIixcbiAgICAgIHJlc291cmNlczogW3RoaXMuY2xvdWRXYXRjaExvZ3NSb2xlLnJvbGVBcm5dXG4gICAgfSkpO1xuXG4gICAgY29uc3QgcnVsZSA9IG5ldyBSdWxlKHRoaXMsICdFdmVudFJ1bGUnLCB7XG4gICAgICBkZXNjcmlwdGlvbjogJ0V2ZW50IHJ1bGUnLFxuICAgICAgZXZlbnRQYXR0ZXJuOiB7XG4gICAgICAgIHNvdXJjZTogW1wiYXdzLmxvZ3NcIl0sXG4gICAgICAgIGRldGFpbFR5cGU6IFtcIkFXUyBBUEkgQ2FsbCB2aWEgQ2xvdWRUcmFpbFwiXSxcbiAgICAgICAgZGV0YWlsOiB7XG4gICAgICAgICAgXCJldmVudFNvdXJjZVwiOiBbXCJsb2dzLmFtYXpvbmF3cy5jb21cIl0sXG4gICAgICAgICAgXCJldmVudE5hbWVcIjogW1wiQ3JlYXRlTG9nR3JvdXBcIl1cbiAgICAgICAgfVxuICAgICAgfSxcbiAgICB9KTtcblxuICAgIHJ1bGUuYWRkVGFyZ2V0KG5ldyBMYW1iZGFGdW5jdGlvbihmbiwge1xuICAgICAgbWF4RXZlbnRBZ2U6IER1cmF0aW9uLmhvdXJzKDIpLCAvLyBPcHRpb25hbDogc2V0IHRoZSBtYXhFdmVudEFnZSByZXRyeSBwb2xpY3lcbiAgICAgIHJldHJ5QXR0ZW1wdHM6IDIsIC8vIE9wdGlvbmFsOiBzZXQgdGhlIG1heCBudW1iZXIgb2YgcmV0cnkgYXR0ZW1wdHMsXG4gICAgfSkpXG4gIH1cblxuICBzZXR1cExvZ1N0cmVhbShwcm9wczogS2luZXNpc1RvRGF0YWRvZ1N0cmVhbVByb3BzKSB7XG4gICAgY29uc3QgZGVsaXZlcnlTdHJlYW1Mb2dHcm91cCA9IG5ldyBMb2dHcm91cCh0aGlzLCBcIkRlbGl2ZXJ5U3RyZWFtTG9nR3JvdXBcIiwgeyBsb2dHcm91cE5hbWU6ICcvZGF0YWRvZy9kZWxpdmVyeS1zdHJlYW0nIH0pO1xuXG4gICAgY29uc3QgZGVsaXZlcnlTdHJlYW1Mb2dTdHJlYW0gPSBuZXcgTG9nU3RyZWFtKFxuICAgICAgdGhpcyxcbiAgICAgIFwiRGVsaXZlcnlTdHJlYW1Mb2dTdHJlYW1cIixcbiAgICAgIHtcbiAgICAgICAgbG9nR3JvdXA6IGRlbGl2ZXJ5U3RyZWFtTG9nR3JvdXAsXG4gICAgICB9LFxuICAgIClcblxuICAgIGNvbnN0IGZhaWxlZERhdGFCdWNrZXQgPSBuZXcgQnVja2V0KHRoaXMsIFwiRmFpbGVkRGF0YWRvZ0RhdGFCdWNrZXRcIiwge1xuICAgICAgYmxvY2tQdWJsaWNBY2Nlc3M6IEJsb2NrUHVibGljQWNjZXNzLkJMT0NLX0FMTCxcbiAgICAgIGVuZm9yY2VTU0w6IHRydWUsXG4gICAgICBwdWJsaWNSZWFkQWNjZXNzOiBmYWxzZSxcbiAgICAgIHJlbW92YWxQb2xpY3k6IFJlbW92YWxQb2xpY3kuREVTVFJPWSwgLy8gVE9ET1xuICAgICAgYnVja2V0TmFtZTogYCR7QXdzLkFDQ09VTlRfSUR9LWRhdGFkb2cta2luZXNpcy1mYWlsZWQtZGF0YWBcbiAgICB9KVxuXG4gICAgdGhpcy5jbG91ZFdhdGNoTG9nc1JvbGUgPSBuZXcgUm9sZSh0aGlzLCBcIkNsb3VkV2F0Y2hMb2dzUm9sZVwiLCB7XG4gICAgICByb2xlTmFtZTogXCJEYXRhZG9nSW50ZWdyYXRpb24tQ1dBc3N1bWVSb2xlXCIsXG4gICAgICBhc3N1bWVkQnk6IG5ldyBTZXJ2aWNlUHJpbmNpcGFsKGBsb2dzLiR7QXdzLlJFR0lPTn0uYW1hem9uYXdzLmNvbWApLFxuICAgIH0pXG5cbiAgICBjb25zdCBmaXJlaG9zZUxvZ3NSb2xlID0gbmV3IFJvbGUodGhpcywgXCJGaXJlaG9zZUxvZ3NSb2xlXCIsIHtcbiAgICAgIHJvbGVOYW1lOiAnRGF0YWRvZ0ludGVncmF0aW9uLUZpcmVob3NlQXNzdW1lUm9sZScsXG4gICAgICBhc3N1bWVkQnk6IG5ldyBTZXJ2aWNlUHJpbmNpcGFsKFwiZmlyZWhvc2UuYW1hem9uYXdzLmNvbVwiKSxcbiAgICB9KVxuXG4gICAgdGhpcy5kYXRhZG9nRGVsaXZlcnlTdHJlYW0gPSBuZXcgQ2ZuRGVsaXZlcnlTdHJlYW0oXG4gICAgICB0aGlzLFxuICAgICAgXCJEZWxpdmVyeVN0cmVhbVwiLFxuICAgICAge1xuICAgICAgICBkZWxpdmVyeVN0cmVhbU5hbWU6ICdDVy1Uby1EYXRhZG9nLURTJyxcbiAgICAgICAgZGVsaXZlcnlTdHJlYW1UeXBlOiBcIkRpcmVjdFB1dFwiLFxuICAgICAgICBodHRwRW5kcG9pbnREZXN0aW5hdGlvbkNvbmZpZ3VyYXRpb246IHtcbiAgICAgICAgICByb2xlQXJuOiBmaXJlaG9zZUxvZ3NSb2xlLnJvbGVBcm4sXG4gICAgICAgICAgZW5kcG9pbnRDb25maWd1cmF0aW9uOiB7XG4gICAgICAgICAgICB1cmw6IHByb3BzLmRhdGFkb2dFbmRwb2ludFVybCEsXG4gICAgICAgICAgICBhY2Nlc3NLZXk6IFNlY3JldC5mcm9tU2VjcmV0TmFtZVYyKFxuICAgICAgICAgICAgICB0aGlzLFxuICAgICAgICAgICAgICBcIkRhdGFkb2dBcGlLZXlTZWNyZXRcIixcbiAgICAgICAgICAgICAgcHJvcHMuZGF0YWRvZ0FwaUtleVNlY3JldE5hbWUsXG4gICAgICAgICAgICApLnNlY3JldFZhbHVlLnRvU3RyaW5nKCksXG4gICAgICAgICAgICBuYW1lOiBcImRhdGFkb2ctbG9ncy1lbmRwb2ludFwiLFxuICAgICAgICAgIH0sXG4gICAgICAgICAgcmVxdWVzdENvbmZpZ3VyYXRpb246IHtcbiAgICAgICAgICAgIGNvbnRlbnRFbmNvZGluZzogXCJHWklQXCIsXG4gICAgICAgICAgfSxcbiAgICAgICAgICBjbG91ZFdhdGNoTG9nZ2luZ09wdGlvbnM6IHtcbiAgICAgICAgICAgIGVuYWJsZWQ6IHRydWUsXG4gICAgICAgICAgICBsb2dHcm91cE5hbWU6IGRlbGl2ZXJ5U3RyZWFtTG9nR3JvdXAubG9nR3JvdXBOYW1lLFxuICAgICAgICAgICAgbG9nU3RyZWFtTmFtZTogZGVsaXZlcnlTdHJlYW1Mb2dTdHJlYW0ubG9nU3RyZWFtTmFtZSxcbiAgICAgICAgICB9LFxuICAgICAgICAgIGJ1ZmZlcmluZ0hpbnRzOiB7XG4gICAgICAgICAgICBpbnRlcnZhbEluU2Vjb25kczogNjAsXG4gICAgICAgICAgICBzaXplSW5NQnM6IDQsXG4gICAgICAgICAgfSxcbiAgICAgICAgICByZXRyeU9wdGlvbnM6IHtcbiAgICAgICAgICAgIGR1cmF0aW9uSW5TZWNvbmRzOiA2MCxcbiAgICAgICAgICB9LFxuICAgICAgICAgIHMzQmFja3VwTW9kZTogXCJGYWlsZWREYXRhT25seVwiLFxuICAgICAgICAgIHMzQ29uZmlndXJhdGlvbjoge1xuICAgICAgICAgICAgYnVja2V0QXJuOiBmYWlsZWREYXRhQnVja2V0LmJ1Y2tldEFybixcbiAgICAgICAgICAgIGNvbXByZXNzaW9uRm9ybWF0OiBcIlVOQ09NUFJFU1NFRFwiLFxuICAgICAgICAgICAgcm9sZUFybjogZmlyZWhvc2VMb2dzUm9sZS5yb2xlQXJuLFxuICAgICAgICAgIH0sXG4gICAgICAgIH0sXG4gICAgICB9LFxuICAgIClcblxuICAgIG5ldyBQb2xpY3kodGhpcywgXCJDbG91ZFdhdGNoTG9nc1BvbGljeVwiLCB7XG4gICAgICBwb2xpY3lOYW1lOiBcIkNXVG9GaXJlaG9zZVB1dFBvbGljeVwiLFxuICAgICAgZG9jdW1lbnQ6IG5ldyBQb2xpY3lEb2N1bWVudCh7XG4gICAgICAgIHN0YXRlbWVudHM6IFtcbiAgICAgICAgICBuZXcgUG9saWN5U3RhdGVtZW50KHtcbiAgICAgICAgICAgIGFjdGlvbnM6IFtcImZpcmVob3NlOlB1dFJlY29yZFwiLCBcImZpcmVob3NlOlB1dFJlY29yZEJhdGNoXCJdLFxuICAgICAgICAgICAgcmVzb3VyY2VzOiBbdGhpcy5kYXRhZG9nRGVsaXZlcnlTdHJlYW0uYXR0ckFybl0sXG4gICAgICAgICAgfSksXG4gICAgICAgIF0sXG4gICAgICB9KSxcbiAgICAgIHJvbGVzOiBbdGhpcy5jbG91ZFdhdGNoTG9nc1JvbGVdLFxuICAgIH0pXG5cbiAgICBuZXcgUG9saWN5KHRoaXMsIFwiRmlyZWhvc2VMb2dzUG9saWN5XCIsIHtcbiAgICAgIHBvbGljeU5hbWU6IFwiRmlyZWhvc2VUb1MzUHV0UG9saWN5XCIsXG4gICAgICBkb2N1bWVudDogbmV3IFBvbGljeURvY3VtZW50KHtcbiAgICAgICAgc3RhdGVtZW50czogW1xuICAgICAgICAgIG5ldyBQb2xpY3lTdGF0ZW1lbnQoe1xuICAgICAgICAgICAgYWN0aW9uczogW1xuICAgICAgICAgICAgICBcInMzOkFib3J0TXVsdGlwYXJ0VXBsb2FkXCIsXG4gICAgICAgICAgICAgIFwiczM6R2V0QnVja2V0TG9jYXRpb25cIixcbiAgICAgICAgICAgICAgXCJzMzpHZXRPYmplY3RcIixcbiAgICAgICAgICAgICAgXCJzMzpMaXN0QnVja2V0XCIsXG4gICAgICAgICAgICAgIFwiczM6TGlzdEJ1Y2tldE11bHRpcGFydFVwbG9hZHNcIixcbiAgICAgICAgICAgICAgXCJzMzpQdXRPYmplY3RcIixcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICByZXNvdXJjZXM6IFtcbiAgICAgICAgICAgICAgZmFpbGVkRGF0YUJ1Y2tldC5idWNrZXRBcm4sXG4gICAgICAgICAgICAgIGAke2ZhaWxlZERhdGFCdWNrZXQuYnVja2V0QXJufS8qYCxcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgfSksXG4gICAgICAgICAgbmV3IFBvbGljeVN0YXRlbWVudCh7XG4gICAgICAgICAgICBhY3Rpb25zOiBbXCJsb2dzOlB1dExvZ0V2ZW50c1wiXSxcbiAgICAgICAgICAgIHJlc291cmNlczogW1xuICAgICAgICAgICAgICBgYXJuOmF3czpsb2dzOiR7QXdzLlJFR0lPTn06JHtBd3MuQUNDT1VOVF9JRH06bG9nLWdyb3VwOiR7ZGVsaXZlcnlTdHJlYW1Mb2dHcm91cC5sb2dHcm91cE5hbWV9OmxvZy1zdHJlYW06JHtkZWxpdmVyeVN0cmVhbUxvZ1N0cmVhbS5sb2dTdHJlYW1OYW1lXG4gICAgICAgICAgICAgIH1gLFxuICAgICAgICAgICAgXSxcbiAgICAgICAgICB9KSxcbiAgICAgICAgICBuZXcgUG9saWN5U3RhdGVtZW50KHtcbiAgICAgICAgICAgIGFjdGlvbnM6IFtcbiAgICAgICAgICAgICAgXCJraW5lc2lzOkRlc2NyaWJlU3RyZWFtXCIsXG4gICAgICAgICAgICAgIFwia2luZXNpczpHZXRTaGFyZEl0ZXJhdG9yXCIsXG4gICAgICAgICAgICAgIFwia2luZXNpczpHZXRSZWNvcmRzXCIsXG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgcmVzb3VyY2VzOiBbdGhpcy5kYXRhZG9nRGVsaXZlcnlTdHJlYW0uYXR0ckFybl0sXG4gICAgICAgICAgfSksXG4gICAgICAgIF0sXG4gICAgICB9KSxcbiAgICAgIHJvbGVzOiBbZmlyZWhvc2VMb2dzUm9sZV0sXG4gICAgfSlcbiAgfVxufSJdfQ==
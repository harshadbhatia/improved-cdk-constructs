"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatadogIntegrationRoleStack = void 0;
const aws_cdk_lib_1 = require("aws-cdk-lib");
const aws_iam_1 = require("aws-cdk-lib/aws-iam");
class DatadogIntegrationRoleStack extends aws_cdk_lib_1.NestedStack {
    constructor(scope, id, props) {
        super(scope, id);
        /**
         * The stack is responsible for creating integration role which sets trust between datadog and AWS account.
         */
        this.DATADOG_AWS_ACCOUNT_ID = "464622532012"; // Datadog account id
        this.integrationRole(props);
        this.setOutputs();
    }
    integrationRole(props) {
        this.datadogRole = new aws_iam_1.Role(this, "DatadogAWSIntegrationRole", {
            roleName: "DatadogAWSIntegrationRole",
            description: "Allows Datadog integration to work",
            assumedBy: new aws_iam_1.AccountPrincipal(this.DATADOG_AWS_ACCOUNT_ID).withConditions({
                "StringEquals": {
                    "sts:ExternalId": props.externalId
                }
            }),
            inlinePolicies: { "datadogIntegrationRolePolicies": this.datadogRoleInlinePolicies() },
        });
    }
    ;
    datadogRoleInlinePolicies() {
        const datadogPolicy = new aws_iam_1.PolicyStatement({
            sid: "DatadogAWSIntegrationPolicy",
            effect: aws_iam_1.Effect.ALLOW,
            actions: [
                'backup:List*',
                's3:GetBucketLocation',
                's3:ListAllMyBuckets',
                's3:GetBucketTagging',
                's3:GetBucketLogging',
                's3:PutBucketNotification',
                's3:GetBucketNotification',
                'sqs:ListQueues',
                'logs:TestMetricFilter',
                'logs:PutSubscriptionFilter',
                'logs:DescribeSubscriptionFilters',
                'logs:DeleteSubscriptionFilter',
                'logs:FilterLogEvents',
                'logs:DescribeLogGroups',
                'logs:DescribeLogStreams',
                'es:DescribeElasticsearchDomains',
                'es:ListTags',
                'cloudwatch:Get*',
                'cloudwatch:Describe*',
                'cloudtrail:GetTrailStatus',
                'cloudfront:GetDistributionConfig',
                'codedeploy:BatchGet*',
                'budgets:ViewBudget',
                'cloudfront:ListDistributions',
                'cloudtrail:LookupEvents',
                'elasticfilesystem:DescribeFileSystems',
                'kinesis:List*',
                'redshift:DescribeLoggingStatus',
                'ses:Get*',
                'autoscaling:Describe*',
                'support:DescribeTrustedAdvisor*',
                'elasticloadbalancing:DescribeLoadBalancerAttributes',
                'support:RefreshTrustedAdvisorCheck',
                'directconnect:Describe*',
                'codedeploy:List*',
                'states:DescribeStateMachine',
                'ecs:List*',
                'sns:List*',
                'tag:GetTagKeys',
                'fsx:DescribeFileSystems',
                'elasticmapreduce:List*',
                'elasticfilesystem:DescribeAccessPoints',
                'elasticache:List*',
                'es:ListDomainNames',
                'fsx:ListTagsForResource',
                'states:ListStateMachines',
                'xray:GetTraceSummaries',
                'rds:List*',
                'elasticfilesystem:DescribeTags',
                'cloudtrail:DescribeTrails',
                'elasticmapreduce:Describe*',
                'tag:GetTagValues',
                'health:DescribeAffectedEntities',
                'ec2:Describe*',
                'organizations:DescribeOrganization',
                'tag:GetResources',
                'health:DescribeEvents',
                'rds:Describe*',
                'ecs:Describe*',
                'cloudwatch:List*',
                'route53:List*',
                'dynamodb:List*',
                'sns:Publish',
                'redshift:DescribeClusters',
                'xray:BatchGetTraces',
                'health:DescribeEventDetails',
                'elasticache:Describe*',
                'lambda:GetPolicy',
                'dynamodb:Describe*',
                'apigateway:GET',
                'lambda:List*',
                'elasticloadbalancing:DescribeLoadBalancers',
                'elasticloadbalancing:Describe*',
                'kinesis:Describe*',
                'eks:List*',
                'acm:List*',
                'eks:Describe*',
                'acm:Describe*',
                'iam:ListPolicies',
                'config:DescribeConfigurationRecorders',
                'config:DescribeConfigurationRecorderStatus',
                'iam:GetAccountPasswordPolicy',
                'iam:ListVirtualMFADevices',
                'iam:GetAccountSummary'
            ],
            resources: ["*"]
        });
        const document = new aws_iam_1.PolicyDocument();
        document.addStatements(datadogPolicy);
        return document;
    }
    setOutputs() {
        new aws_cdk_lib_1.CfnOutput(this, "DatadogIntegrationRoleARN", { value: this.datadogRole.roleArn });
    }
    ;
}
exports.DatadogIntegrationRoleStack = DatadogIntegrationRoleStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGF0YWRvZy1pbnRlZ3JhdGlvbi1yb2xlLXN0YWNrLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZGF0YWRvZy1pbnRlZ3JhdGlvbi1yb2xlLXN0YWNrLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLDZDQUFxRDtBQUNyRCxpREFBc0c7QUFJdEcsTUFBYSwyQkFBNEIsU0FBUSx5QkFBVztJQVN4RCxZQUFZLEtBQWdCLEVBQUUsRUFBVSxFQUFFLEtBQW1DO1FBQ3pFLEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFUckI7O1dBRUc7UUFFSywyQkFBc0IsR0FBRyxjQUFjLENBQUMsQ0FBQyxxQkFBcUI7UUFPbEUsSUFBSSxDQUFDLGVBQWUsQ0FBQyxLQUFNLENBQUMsQ0FBQztRQUM3QixJQUFJLENBQUMsVUFBVSxFQUFFLENBQUM7SUFDdEIsQ0FBQztJQUVELGVBQWUsQ0FBQyxLQUFrQztRQUU5QyxJQUFJLENBQUMsV0FBVyxHQUFHLElBQUksY0FBSSxDQUFDLElBQUksRUFBRSwyQkFBMkIsRUFBRTtZQUMzRCxRQUFRLEVBQUUsMkJBQTJCO1lBQ3JDLFdBQVcsRUFBRSxvQ0FBb0M7WUFDakQsU0FBUyxFQUFFLElBQUksMEJBQWdCLENBQUMsSUFBSSxDQUFDLHNCQUFzQixDQUFDLENBQUMsY0FBYyxDQUFDO2dCQUN4RSxjQUFjLEVBQUU7b0JBQ1osZ0JBQWdCLEVBQUUsS0FBSyxDQUFDLFVBQVU7aUJBQ3JDO2FBQ0osQ0FBQztZQUNGLGNBQWMsRUFBRSxFQUFFLGdDQUFnQyxFQUFFLElBQUksQ0FBQyx5QkFBeUIsRUFBRSxFQUFFO1NBQ3pGLENBQ0EsQ0FBQTtJQUVMLENBQUM7SUFBQSxDQUFDO0lBR0YseUJBQXlCO1FBQ3JCLE1BQU0sYUFBYSxHQUFHLElBQUkseUJBQWUsQ0FDckM7WUFDSSxHQUFHLEVBQUUsNkJBQTZCO1lBQ2xDLE1BQU0sRUFBRSxnQkFBTSxDQUFDLEtBQUs7WUFDcEIsT0FBTyxFQUFFO2dCQUNMLGNBQWM7Z0JBRWQsc0JBQXNCO2dCQUN0QixxQkFBcUI7Z0JBQ3JCLHFCQUFxQjtnQkFDckIscUJBQXFCO2dCQUNyQiwwQkFBMEI7Z0JBQzFCLDBCQUEwQjtnQkFFMUIsZ0JBQWdCO2dCQUVoQix1QkFBdUI7Z0JBQ3ZCLDRCQUE0QjtnQkFDNUIsa0NBQWtDO2dCQUNsQywrQkFBK0I7Z0JBQy9CLHNCQUFzQjtnQkFDdEIsd0JBQXdCO2dCQUN4Qix5QkFBeUI7Z0JBRXpCLGlDQUFpQztnQkFDakMsYUFBYTtnQkFFYixpQkFBaUI7Z0JBQ2pCLHNCQUFzQjtnQkFFdEIsMkJBQTJCO2dCQUUzQixrQ0FBa0M7Z0JBQ2xDLHNCQUFzQjtnQkFDdEIsb0JBQW9CO2dCQUNwQiw4QkFBOEI7Z0JBQzlCLHlCQUF5QjtnQkFFekIsdUNBQXVDO2dCQUN2QyxlQUFlO2dCQUVmLGdDQUFnQztnQkFFaEMsVUFBVTtnQkFDVix1QkFBdUI7Z0JBQ3ZCLGlDQUFpQztnQkFDakMscURBQXFEO2dCQUNyRCxvQ0FBb0M7Z0JBQ3BDLHlCQUF5QjtnQkFDekIsa0JBQWtCO2dCQUNsQiw2QkFBNkI7Z0JBQzdCLFdBQVc7Z0JBRVgsV0FBVztnQkFHWCxnQkFBZ0I7Z0JBQ2hCLHlCQUF5QjtnQkFDekIsd0JBQXdCO2dCQUN4Qix3Q0FBd0M7Z0JBQ3hDLG1CQUFtQjtnQkFFbkIsb0JBQW9CO2dCQUVwQix5QkFBeUI7Z0JBQ3pCLDBCQUEwQjtnQkFDMUIsd0JBQXdCO2dCQUV4QixXQUFXO2dCQUNYLGdDQUFnQztnQkFFaEMsMkJBQTJCO2dCQUMzQiw0QkFBNEI7Z0JBQzVCLGtCQUFrQjtnQkFDbEIsaUNBQWlDO2dCQUVqQyxlQUFlO2dCQUVmLG9DQUFvQztnQkFDcEMsa0JBQWtCO2dCQUNsQix1QkFBdUI7Z0JBR3ZCLGVBQWU7Z0JBQ2YsZUFBZTtnQkFDZixrQkFBa0I7Z0JBRWxCLGVBQWU7Z0JBRWYsZ0JBQWdCO2dCQUNoQixhQUFhO2dCQUNiLDJCQUEyQjtnQkFDM0IscUJBQXFCO2dCQUNyQiw2QkFBNkI7Z0JBQzdCLHVCQUF1QjtnQkFDdkIsa0JBQWtCO2dCQUNsQixvQkFBb0I7Z0JBRXBCLGdCQUFnQjtnQkFDaEIsY0FBYztnQkFDZCw0Q0FBNEM7Z0JBQzVDLGdDQUFnQztnQkFDaEMsbUJBQW1CO2dCQUNuQixXQUFXO2dCQUNYLFdBQVc7Z0JBQ1gsZUFBZTtnQkFDZixlQUFlO2dCQUVmLGtCQUFrQjtnQkFDbEIsdUNBQXVDO2dCQUN2Qyw0Q0FBNEM7Z0JBQzVDLDhCQUE4QjtnQkFDOUIsMkJBQTJCO2dCQUMzQix1QkFBdUI7YUFDMUI7WUFDRCxTQUFTLEVBQUUsQ0FBQyxHQUFHLENBQUM7U0FDbkIsQ0FDSixDQUFDO1FBRUYsTUFBTSxRQUFRLEdBQUcsSUFBSSx3QkFBYyxFQUFFLENBQUM7UUFDdEMsUUFBUSxDQUFDLGFBQWEsQ0FBQyxhQUFhLENBQUMsQ0FBQztRQUV0QyxPQUFPLFFBQVEsQ0FBQztJQUNwQixDQUFDO0lBRUQsVUFBVTtRQUNOLElBQUksdUJBQVMsQ0FBQyxJQUFJLEVBQ2QsMkJBQTJCLEVBQUUsRUFBRSxLQUFLLEVBQUUsSUFBSSxDQUFDLFdBQVcsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFBO0lBQ3pFLENBQUM7SUFBQSxDQUFDO0NBRUw7QUFwS0Qsa0VBb0tDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQ2ZuT3V0cHV0LCBOZXN0ZWRTdGFjayB9IGZyb20gJ2F3cy1jZGstbGliJztcbmltcG9ydCB7IEFjY291bnRQcmluY2lwYWwsIEVmZmVjdCwgUG9saWN5RG9jdW1lbnQsIFBvbGljeVN0YXRlbWVudCwgUm9sZSB9IGZyb20gJ2F3cy1jZGstbGliL2F3cy1pYW0nO1xuaW1wb3J0IHsgQ29uc3RydWN0IH0gZnJvbSAnY29uc3RydWN0cyc7XG5pbXBvcnQgeyBEYXRhZG9nSW50ZWdyYXRpb25Sb2xlUHJvcHMgfSBmcm9tICcuLi8uLi8uLi9pbnRlcmZhY2VzL2xpYi9pbnRlZ3JhdGlvbnMvZGF0YWRvZy9pbnRlZmFjZXMnO1xuXG5leHBvcnQgY2xhc3MgRGF0YWRvZ0ludGVncmF0aW9uUm9sZVN0YWNrIGV4dGVuZHMgTmVzdGVkU3RhY2sge1xuICAgIC8qKlxuICAgICAqIFRoZSBzdGFjayBpcyByZXNwb25zaWJsZSBmb3IgY3JlYXRpbmcgaW50ZWdyYXRpb24gcm9sZSB3aGljaCBzZXRzIHRydXN0IGJldHdlZW4gZGF0YWRvZyBhbmQgQVdTIGFjY291bnQuXG4gICAgICovXG5cbiAgICBwcml2YXRlIERBVEFET0dfQVdTX0FDQ09VTlRfSUQgPSBcIjQ2NDYyMjUzMjAxMlwiOyAvLyBEYXRhZG9nIGFjY291bnQgaWRcblxuICAgIGRhdGFkb2dSb2xlOiBSb2xlXG5cbiAgICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nLCBwcm9wcz86IERhdGFkb2dJbnRlZ3JhdGlvblJvbGVQcm9wcykge1xuICAgICAgICBzdXBlcihzY29wZSwgaWQpO1xuXG4gICAgICAgIHRoaXMuaW50ZWdyYXRpb25Sb2xlKHByb3BzISk7XG4gICAgICAgIHRoaXMuc2V0T3V0cHV0cygpO1xuICAgIH1cblxuICAgIGludGVncmF0aW9uUm9sZShwcm9wczogRGF0YWRvZ0ludGVncmF0aW9uUm9sZVByb3BzKTogdm9pZCB7XG5cbiAgICAgICAgdGhpcy5kYXRhZG9nUm9sZSA9IG5ldyBSb2xlKHRoaXMsIFwiRGF0YWRvZ0FXU0ludGVncmF0aW9uUm9sZVwiLCB7XG4gICAgICAgICAgICByb2xlTmFtZTogXCJEYXRhZG9nQVdTSW50ZWdyYXRpb25Sb2xlXCIsXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogXCJBbGxvd3MgRGF0YWRvZyBpbnRlZ3JhdGlvbiB0byB3b3JrXCIsXG4gICAgICAgICAgICBhc3N1bWVkQnk6IG5ldyBBY2NvdW50UHJpbmNpcGFsKHRoaXMuREFUQURPR19BV1NfQUNDT1VOVF9JRCkud2l0aENvbmRpdGlvbnMoe1xuICAgICAgICAgICAgICAgIFwiU3RyaW5nRXF1YWxzXCI6IHtcbiAgICAgICAgICAgICAgICAgICAgXCJzdHM6RXh0ZXJuYWxJZFwiOiBwcm9wcy5leHRlcm5hbElkXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSksXG4gICAgICAgICAgICBpbmxpbmVQb2xpY2llczogeyBcImRhdGFkb2dJbnRlZ3JhdGlvblJvbGVQb2xpY2llc1wiOiB0aGlzLmRhdGFkb2dSb2xlSW5saW5lUG9saWNpZXMoKSB9LFxuICAgICAgICB9XG4gICAgICAgIClcblxuICAgIH07XG5cblxuICAgIGRhdGFkb2dSb2xlSW5saW5lUG9saWNpZXMoKTogUG9saWN5RG9jdW1lbnQge1xuICAgICAgICBjb25zdCBkYXRhZG9nUG9saWN5ID0gbmV3IFBvbGljeVN0YXRlbWVudChcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBzaWQ6IFwiRGF0YWRvZ0FXU0ludGVncmF0aW9uUG9saWN5XCIsXG4gICAgICAgICAgICAgICAgZWZmZWN0OiBFZmZlY3QuQUxMT1csXG4gICAgICAgICAgICAgICAgYWN0aW9uczogW1xuICAgICAgICAgICAgICAgICAgICAnYmFja3VwOkxpc3QqJyxcblxuICAgICAgICAgICAgICAgICAgICAnczM6R2V0QnVja2V0TG9jYXRpb24nLFxuICAgICAgICAgICAgICAgICAgICAnczM6TGlzdEFsbE15QnVja2V0cycsXG4gICAgICAgICAgICAgICAgICAgICdzMzpHZXRCdWNrZXRUYWdnaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgJ3MzOkdldEJ1Y2tldExvZ2dpbmcnLFxuICAgICAgICAgICAgICAgICAgICAnczM6UHV0QnVja2V0Tm90aWZpY2F0aW9uJyxcbiAgICAgICAgICAgICAgICAgICAgJ3MzOkdldEJ1Y2tldE5vdGlmaWNhdGlvbicsXG5cbiAgICAgICAgICAgICAgICAgICAgJ3NxczpMaXN0UXVldWVzJyxcblxuICAgICAgICAgICAgICAgICAgICAnbG9nczpUZXN0TWV0cmljRmlsdGVyJyxcbiAgICAgICAgICAgICAgICAgICAgJ2xvZ3M6UHV0U3Vic2NyaXB0aW9uRmlsdGVyJyxcbiAgICAgICAgICAgICAgICAgICAgJ2xvZ3M6RGVzY3JpYmVTdWJzY3JpcHRpb25GaWx0ZXJzJyxcbiAgICAgICAgICAgICAgICAgICAgJ2xvZ3M6RGVsZXRlU3Vic2NyaXB0aW9uRmlsdGVyJyxcbiAgICAgICAgICAgICAgICAgICAgJ2xvZ3M6RmlsdGVyTG9nRXZlbnRzJyxcbiAgICAgICAgICAgICAgICAgICAgJ2xvZ3M6RGVzY3JpYmVMb2dHcm91cHMnLFxuICAgICAgICAgICAgICAgICAgICAnbG9nczpEZXNjcmliZUxvZ1N0cmVhbXMnLFxuXG4gICAgICAgICAgICAgICAgICAgICdlczpEZXNjcmliZUVsYXN0aWNzZWFyY2hEb21haW5zJyxcbiAgICAgICAgICAgICAgICAgICAgJ2VzOkxpc3RUYWdzJyxcblxuICAgICAgICAgICAgICAgICAgICAnY2xvdWR3YXRjaDpHZXQqJyxcbiAgICAgICAgICAgICAgICAgICAgJ2Nsb3Vkd2F0Y2g6RGVzY3JpYmUqJyxcblxuICAgICAgICAgICAgICAgICAgICAnY2xvdWR0cmFpbDpHZXRUcmFpbFN0YXR1cycsXG5cbiAgICAgICAgICAgICAgICAgICAgJ2Nsb3VkZnJvbnQ6R2V0RGlzdHJpYnV0aW9uQ29uZmlnJyxcbiAgICAgICAgICAgICAgICAgICAgJ2NvZGVkZXBsb3k6QmF0Y2hHZXQqJyxcbiAgICAgICAgICAgICAgICAgICAgJ2J1ZGdldHM6Vmlld0J1ZGdldCcsXG4gICAgICAgICAgICAgICAgICAgICdjbG91ZGZyb250Okxpc3REaXN0cmlidXRpb25zJyxcbiAgICAgICAgICAgICAgICAgICAgJ2Nsb3VkdHJhaWw6TG9va3VwRXZlbnRzJyxcblxuICAgICAgICAgICAgICAgICAgICAnZWxhc3RpY2ZpbGVzeXN0ZW06RGVzY3JpYmVGaWxlU3lzdGVtcycsXG4gICAgICAgICAgICAgICAgICAgICdraW5lc2lzOkxpc3QqJyxcblxuICAgICAgICAgICAgICAgICAgICAncmVkc2hpZnQ6RGVzY3JpYmVMb2dnaW5nU3RhdHVzJyxcblxuICAgICAgICAgICAgICAgICAgICAnc2VzOkdldConLFxuICAgICAgICAgICAgICAgICAgICAnYXV0b3NjYWxpbmc6RGVzY3JpYmUqJyxcbiAgICAgICAgICAgICAgICAgICAgJ3N1cHBvcnQ6RGVzY3JpYmVUcnVzdGVkQWR2aXNvcionLFxuICAgICAgICAgICAgICAgICAgICAnZWxhc3RpY2xvYWRiYWxhbmNpbmc6RGVzY3JpYmVMb2FkQmFsYW5jZXJBdHRyaWJ1dGVzJyxcbiAgICAgICAgICAgICAgICAgICAgJ3N1cHBvcnQ6UmVmcmVzaFRydXN0ZWRBZHZpc29yQ2hlY2snLFxuICAgICAgICAgICAgICAgICAgICAnZGlyZWN0Y29ubmVjdDpEZXNjcmliZSonLFxuICAgICAgICAgICAgICAgICAgICAnY29kZWRlcGxveTpMaXN0KicsXG4gICAgICAgICAgICAgICAgICAgICdzdGF0ZXM6RGVzY3JpYmVTdGF0ZU1hY2hpbmUnLFxuICAgICAgICAgICAgICAgICAgICAnZWNzOkxpc3QqJyxcblxuICAgICAgICAgICAgICAgICAgICAnc25zOkxpc3QqJyxcblxuXG4gICAgICAgICAgICAgICAgICAgICd0YWc6R2V0VGFnS2V5cycsXG4gICAgICAgICAgICAgICAgICAgICdmc3g6RGVzY3JpYmVGaWxlU3lzdGVtcycsXG4gICAgICAgICAgICAgICAgICAgICdlbGFzdGljbWFwcmVkdWNlOkxpc3QqJyxcbiAgICAgICAgICAgICAgICAgICAgJ2VsYXN0aWNmaWxlc3lzdGVtOkRlc2NyaWJlQWNjZXNzUG9pbnRzJyxcbiAgICAgICAgICAgICAgICAgICAgJ2VsYXN0aWNhY2hlOkxpc3QqJyxcblxuICAgICAgICAgICAgICAgICAgICAnZXM6TGlzdERvbWFpbk5hbWVzJyxcblxuICAgICAgICAgICAgICAgICAgICAnZnN4Okxpc3RUYWdzRm9yUmVzb3VyY2UnLFxuICAgICAgICAgICAgICAgICAgICAnc3RhdGVzOkxpc3RTdGF0ZU1hY2hpbmVzJyxcbiAgICAgICAgICAgICAgICAgICAgJ3hyYXk6R2V0VHJhY2VTdW1tYXJpZXMnLFxuXG4gICAgICAgICAgICAgICAgICAgICdyZHM6TGlzdConLFxuICAgICAgICAgICAgICAgICAgICAnZWxhc3RpY2ZpbGVzeXN0ZW06RGVzY3JpYmVUYWdzJyxcblxuICAgICAgICAgICAgICAgICAgICAnY2xvdWR0cmFpbDpEZXNjcmliZVRyYWlscycsXG4gICAgICAgICAgICAgICAgICAgICdlbGFzdGljbWFwcmVkdWNlOkRlc2NyaWJlKicsXG4gICAgICAgICAgICAgICAgICAgICd0YWc6R2V0VGFnVmFsdWVzJyxcbiAgICAgICAgICAgICAgICAgICAgJ2hlYWx0aDpEZXNjcmliZUFmZmVjdGVkRW50aXRpZXMnLFxuXG4gICAgICAgICAgICAgICAgICAgICdlYzI6RGVzY3JpYmUqJyxcblxuICAgICAgICAgICAgICAgICAgICAnb3JnYW5pemF0aW9uczpEZXNjcmliZU9yZ2FuaXphdGlvbicsXG4gICAgICAgICAgICAgICAgICAgICd0YWc6R2V0UmVzb3VyY2VzJyxcbiAgICAgICAgICAgICAgICAgICAgJ2hlYWx0aDpEZXNjcmliZUV2ZW50cycsXG5cblxuICAgICAgICAgICAgICAgICAgICAncmRzOkRlc2NyaWJlKicsXG4gICAgICAgICAgICAgICAgICAgICdlY3M6RGVzY3JpYmUqJyxcbiAgICAgICAgICAgICAgICAgICAgJ2Nsb3Vkd2F0Y2g6TGlzdConLFxuXG4gICAgICAgICAgICAgICAgICAgICdyb3V0ZTUzOkxpc3QqJyxcblxuICAgICAgICAgICAgICAgICAgICAnZHluYW1vZGI6TGlzdConLFxuICAgICAgICAgICAgICAgICAgICAnc25zOlB1Ymxpc2gnLFxuICAgICAgICAgICAgICAgICAgICAncmVkc2hpZnQ6RGVzY3JpYmVDbHVzdGVycycsXG4gICAgICAgICAgICAgICAgICAgICd4cmF5OkJhdGNoR2V0VHJhY2VzJyxcbiAgICAgICAgICAgICAgICAgICAgJ2hlYWx0aDpEZXNjcmliZUV2ZW50RGV0YWlscycsXG4gICAgICAgICAgICAgICAgICAgICdlbGFzdGljYWNoZTpEZXNjcmliZSonLFxuICAgICAgICAgICAgICAgICAgICAnbGFtYmRhOkdldFBvbGljeScsXG4gICAgICAgICAgICAgICAgICAgICdkeW5hbW9kYjpEZXNjcmliZSonLFxuXG4gICAgICAgICAgICAgICAgICAgICdhcGlnYXRld2F5OkdFVCcsXG4gICAgICAgICAgICAgICAgICAgICdsYW1iZGE6TGlzdConLFxuICAgICAgICAgICAgICAgICAgICAnZWxhc3RpY2xvYWRiYWxhbmNpbmc6RGVzY3JpYmVMb2FkQmFsYW5jZXJzJyxcbiAgICAgICAgICAgICAgICAgICAgJ2VsYXN0aWNsb2FkYmFsYW5jaW5nOkRlc2NyaWJlKicsXG4gICAgICAgICAgICAgICAgICAgICdraW5lc2lzOkRlc2NyaWJlKicsXG4gICAgICAgICAgICAgICAgICAgICdla3M6TGlzdConLCAvLyBEYXRhZG9nIHVpIGVycm9yXG4gICAgICAgICAgICAgICAgICAgICdhY206TGlzdConLCAvLyBTYW1lIGFzIGFib3ZlXG4gICAgICAgICAgICAgICAgICAgICdla3M6RGVzY3JpYmUqJyxcbiAgICAgICAgICAgICAgICAgICAgJ2FjbTpEZXNjcmliZSonLFxuXG4gICAgICAgICAgICAgICAgICAgICdpYW06TGlzdFBvbGljaWVzJyxcbiAgICAgICAgICAgICAgICAgICAgJ2NvbmZpZzpEZXNjcmliZUNvbmZpZ3VyYXRpb25SZWNvcmRlcnMnLFxuICAgICAgICAgICAgICAgICAgICAnY29uZmlnOkRlc2NyaWJlQ29uZmlndXJhdGlvblJlY29yZGVyU3RhdHVzJyxcbiAgICAgICAgICAgICAgICAgICAgJ2lhbTpHZXRBY2NvdW50UGFzc3dvcmRQb2xpY3knLFxuICAgICAgICAgICAgICAgICAgICAnaWFtOkxpc3RWaXJ0dWFsTUZBRGV2aWNlcycsXG4gICAgICAgICAgICAgICAgICAgICdpYW06R2V0QWNjb3VudFN1bW1hcnknXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICByZXNvdXJjZXM6IFtcIipcIl1cbiAgICAgICAgICAgIH1cbiAgICAgICAgKTtcblxuICAgICAgICBjb25zdCBkb2N1bWVudCA9IG5ldyBQb2xpY3lEb2N1bWVudCgpO1xuICAgICAgICBkb2N1bWVudC5hZGRTdGF0ZW1lbnRzKGRhdGFkb2dQb2xpY3kpO1xuXG4gICAgICAgIHJldHVybiBkb2N1bWVudDtcbiAgICB9XG5cbiAgICBzZXRPdXRwdXRzKCk6IHZvaWQge1xuICAgICAgICBuZXcgQ2ZuT3V0cHV0KHRoaXMsXG4gICAgICAgICAgICBcIkRhdGFkb2dJbnRlZ3JhdGlvblJvbGVBUk5cIiwgeyB2YWx1ZTogdGhpcy5kYXRhZG9nUm9sZS5yb2xlQXJuIH0pXG4gICAgfTtcblxufVxuIl19
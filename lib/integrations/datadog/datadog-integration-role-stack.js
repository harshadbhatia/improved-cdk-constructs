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
                'logs:TestMetricFilter',
                'sqs:ListQueues',
                'cloudtrail:GetTrailStatus',
                'redshift:DescribeLoggingStatus',
                'cloudwatch:Describe*',
                'budgets:ViewBudget',
                'cloudfront:ListDistributions',
                'cloudwatch:Get*',
                's3:ListAllMyBuckets',
                'elasticfilesystem:DescribeFileSystems',
                'kinesis:List*',
                's3:GetBucketTagging',
                'logs:PutSubscriptionFilter',
                'ses:Get*',
                'autoscaling:Describe*',
                'support:DescribeTrustedAdvisor*',
                'elasticloadbalancing:DescribeLoadBalancerAttributes',
                'support:RefreshTrustedAdvisorCheck',
                'directconnect:Describe*',
                'codedeploy:List*',
                'states:DescribeStateMachine',
                'ecs:List*',
                'route53:List*',
                'sns:List*',
                'backup:List*',
                's3:PutBucketNotification',
                'tag:GetTagKeys',
                'fsx:DescribeFileSystems',
                'elasticmapreduce:List*',
                'elasticfilesystem:DescribeAccessPoints',
                'elasticache:List*',
                's3:GetBucketLogging',
                'es:ListDomainNames',
                'cloudfront:GetDistributionConfig',
                'codedeploy:BatchGet*',
                'fsx:ListTagsForResource',
                'states:ListStateMachines',
                'xray:GetTraceSummaries',
                'logs:DescribeLogGroups',
                'rds:List*',
                'elasticfilesystem:DescribeTags',
                'logs:DescribeSubscriptionFilters',
                'cloudtrail:DescribeTrails',
                'elasticmapreduce:Describe*',
                'tag:GetTagValues',
                'health:DescribeAffectedEntities',
                'logs:DeleteSubscriptionFilter',
                'logs:FilterLogEvents',
                'ec2:Describe*',
                's3:GetBucketNotification',
                'organizations:DescribeOrganization',
                'tag:GetResources',
                'health:DescribeEvents',
                'es:DescribeElasticsearchDomains',
                'es:ListTags',
                'cloudtrail:LookupEvents',
                'rds:Describe*',
                'ecs:Describe*',
                'cloudwatch:List*',
                'logs:DescribeLogStreams',
                'dynamodb:List*',
                'sns:Publish',
                'redshift:DescribeClusters',
                'xray:BatchGetTraces',
                'health:DescribeEventDetails',
                'elasticache:Describe*',
                'lambda:GetPolicy',
                'dynamodb:Describe*',
                's3:GetBucketLocation',
                'apigateway:GET',
                'lambda:List*',
                'elasticloadbalancing:DescribeLoadBalancers',
                'elasticloadbalancing:Describe*',
                'kinesis:Describe*',
                'eks:List*',
                'acm:List*' // Same as above
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGF0YWRvZy1pbnRlZ3JhdGlvbi1yb2xlLXN0YWNrLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZGF0YWRvZy1pbnRlZ3JhdGlvbi1yb2xlLXN0YWNrLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLDZDQUFxRDtBQUNyRCxpREFBc0c7QUFJdEcsTUFBYSwyQkFBNEIsU0FBUSx5QkFBVztJQVN4RCxZQUFZLEtBQWdCLEVBQUUsRUFBVSxFQUFFLEtBQW1DO1FBQ3pFLEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFUckI7O1dBRUc7UUFFSywyQkFBc0IsR0FBRyxjQUFjLENBQUMsQ0FBQyxxQkFBcUI7UUFPbEUsSUFBSSxDQUFDLGVBQWUsQ0FBQyxLQUFNLENBQUMsQ0FBQztRQUM3QixJQUFJLENBQUMsVUFBVSxFQUFFLENBQUM7SUFDdEIsQ0FBQztJQUVELGVBQWUsQ0FBQyxLQUFrQztRQUU5QyxJQUFJLENBQUMsV0FBVyxHQUFHLElBQUksY0FBSSxDQUFDLElBQUksRUFBRSwyQkFBMkIsRUFBRTtZQUMzRCxRQUFRLEVBQUUsMkJBQTJCO1lBQ3JDLFdBQVcsRUFBRSxvQ0FBb0M7WUFDakQsU0FBUyxFQUFFLElBQUksMEJBQWdCLENBQUMsSUFBSSxDQUFDLHNCQUFzQixDQUFDLENBQUMsY0FBYyxDQUFDO2dCQUN4RSxjQUFjLEVBQUU7b0JBQ1osZ0JBQWdCLEVBQUUsS0FBSyxDQUFDLFVBQVU7aUJBQ3JDO2FBQ0osQ0FBQztZQUNGLGNBQWMsRUFBRSxFQUFFLGdDQUFnQyxFQUFFLElBQUksQ0FBQyx5QkFBeUIsRUFBRSxFQUFFO1NBQ3pGLENBQ0EsQ0FBQTtJQUVMLENBQUM7SUFBQSxDQUFDO0lBR0YseUJBQXlCO1FBQ3JCLE1BQU0sYUFBYSxHQUFHLElBQUkseUJBQWUsQ0FDckM7WUFDSSxHQUFHLEVBQUUsNkJBQTZCO1lBQ2xDLE1BQU0sRUFBRSxnQkFBTSxDQUFDLEtBQUs7WUFDcEIsT0FBTyxFQUFFO2dCQUNMLHVCQUF1QjtnQkFDdkIsZ0JBQWdCO2dCQUNoQiwyQkFBMkI7Z0JBQzNCLGdDQUFnQztnQkFDaEMsc0JBQXNCO2dCQUN0QixvQkFBb0I7Z0JBQ3BCLDhCQUE4QjtnQkFDOUIsaUJBQWlCO2dCQUNqQixxQkFBcUI7Z0JBQ3JCLHVDQUF1QztnQkFDdkMsZUFBZTtnQkFDZixxQkFBcUI7Z0JBQ3JCLDRCQUE0QjtnQkFDNUIsVUFBVTtnQkFDVix1QkFBdUI7Z0JBQ3ZCLGlDQUFpQztnQkFDakMscURBQXFEO2dCQUNyRCxvQ0FBb0M7Z0JBQ3BDLHlCQUF5QjtnQkFDekIsa0JBQWtCO2dCQUNsQiw2QkFBNkI7Z0JBQzdCLFdBQVc7Z0JBQ1gsZUFBZTtnQkFDZixXQUFXO2dCQUNYLGNBQWM7Z0JBQ2QsMEJBQTBCO2dCQUMxQixnQkFBZ0I7Z0JBQ2hCLHlCQUF5QjtnQkFDekIsd0JBQXdCO2dCQUN4Qix3Q0FBd0M7Z0JBQ3hDLG1CQUFtQjtnQkFDbkIscUJBQXFCO2dCQUNyQixvQkFBb0I7Z0JBQ3BCLGtDQUFrQztnQkFDbEMsc0JBQXNCO2dCQUN0Qix5QkFBeUI7Z0JBQ3pCLDBCQUEwQjtnQkFDMUIsd0JBQXdCO2dCQUN4Qix3QkFBd0I7Z0JBQ3hCLFdBQVc7Z0JBQ1gsZ0NBQWdDO2dCQUNoQyxrQ0FBa0M7Z0JBQ2xDLDJCQUEyQjtnQkFDM0IsNEJBQTRCO2dCQUM1QixrQkFBa0I7Z0JBQ2xCLGlDQUFpQztnQkFDakMsK0JBQStCO2dCQUMvQixzQkFBc0I7Z0JBQ3RCLGVBQWU7Z0JBQ2YsMEJBQTBCO2dCQUMxQixvQ0FBb0M7Z0JBQ3BDLGtCQUFrQjtnQkFDbEIsdUJBQXVCO2dCQUN2QixpQ0FBaUM7Z0JBQ2pDLGFBQWE7Z0JBQ2IseUJBQXlCO2dCQUN6QixlQUFlO2dCQUNmLGVBQWU7Z0JBQ2Ysa0JBQWtCO2dCQUNsQix5QkFBeUI7Z0JBQ3pCLGdCQUFnQjtnQkFDaEIsYUFBYTtnQkFDYiwyQkFBMkI7Z0JBQzNCLHFCQUFxQjtnQkFDckIsNkJBQTZCO2dCQUM3Qix1QkFBdUI7Z0JBQ3ZCLGtCQUFrQjtnQkFDbEIsb0JBQW9CO2dCQUNwQixzQkFBc0I7Z0JBQ3RCLGdCQUFnQjtnQkFDaEIsY0FBYztnQkFDZCw0Q0FBNEM7Z0JBQzVDLGdDQUFnQztnQkFDaEMsbUJBQW1CO2dCQUNuQixXQUFXO2dCQUNYLFdBQVcsQ0FBQyxnQkFBZ0I7YUFDL0I7WUFDRCxTQUFTLEVBQUUsQ0FBQyxHQUFHLENBQUM7U0FDbkIsQ0FDSixDQUFDO1FBRUYsTUFBTSxRQUFRLEdBQUcsSUFBSSx3QkFBYyxFQUFFLENBQUM7UUFDdEMsUUFBUSxDQUFDLGFBQWEsQ0FBQyxhQUFhLENBQUMsQ0FBQztRQUV0QyxPQUFPLFFBQVEsQ0FBQztJQUNwQixDQUFDO0lBRUQsVUFBVTtRQUNOLElBQUksdUJBQVMsQ0FBQyxJQUFJLEVBQ2QsMkJBQTJCLEVBQUUsRUFBRSxLQUFLLEVBQUUsSUFBSSxDQUFDLFdBQVcsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFBO0lBQ3pFLENBQUM7SUFBQSxDQUFDO0NBRUw7QUFuSUQsa0VBbUlDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQ2ZuT3V0cHV0LCBOZXN0ZWRTdGFjayB9IGZyb20gJ2F3cy1jZGstbGliJztcbmltcG9ydCB7IEFjY291bnRQcmluY2lwYWwsIEVmZmVjdCwgUG9saWN5RG9jdW1lbnQsIFBvbGljeVN0YXRlbWVudCwgUm9sZSB9IGZyb20gJ2F3cy1jZGstbGliL2F3cy1pYW0nO1xuaW1wb3J0IHsgQ29uc3RydWN0IH0gZnJvbSAnY29uc3RydWN0cyc7XG5pbXBvcnQgeyBEYXRhZG9nSW50ZWdyYXRpb25Sb2xlUHJvcHMgfSBmcm9tICcuLi8uLi8uLi9pbnRlcmZhY2VzL2xpYi9pbnRlZ3JhdGlvbnMvZGF0YWRvZy9pbnRlZmFjZXMnO1xuXG5leHBvcnQgY2xhc3MgRGF0YWRvZ0ludGVncmF0aW9uUm9sZVN0YWNrIGV4dGVuZHMgTmVzdGVkU3RhY2sge1xuICAgIC8qKlxuICAgICAqIFRoZSBzdGFjayBpcyByZXNwb25zaWJsZSBmb3IgY3JlYXRpbmcgaW50ZWdyYXRpb24gcm9sZSB3aGljaCBzZXRzIHRydXN0IGJldHdlZW4gZGF0YWRvZyBhbmQgQVdTIGFjY291bnQuXG4gICAgICovXG5cbiAgICBwcml2YXRlIERBVEFET0dfQVdTX0FDQ09VTlRfSUQgPSBcIjQ2NDYyMjUzMjAxMlwiOyAvLyBEYXRhZG9nIGFjY291bnQgaWRcblxuICAgIGRhdGFkb2dSb2xlOiBSb2xlXG5cbiAgICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nLCBwcm9wcz86IERhdGFkb2dJbnRlZ3JhdGlvblJvbGVQcm9wcykge1xuICAgICAgICBzdXBlcihzY29wZSwgaWQpO1xuXG4gICAgICAgIHRoaXMuaW50ZWdyYXRpb25Sb2xlKHByb3BzISk7XG4gICAgICAgIHRoaXMuc2V0T3V0cHV0cygpO1xuICAgIH1cblxuICAgIGludGVncmF0aW9uUm9sZShwcm9wczogRGF0YWRvZ0ludGVncmF0aW9uUm9sZVByb3BzKTogdm9pZCB7XG5cbiAgICAgICAgdGhpcy5kYXRhZG9nUm9sZSA9IG5ldyBSb2xlKHRoaXMsIFwiRGF0YWRvZ0FXU0ludGVncmF0aW9uUm9sZVwiLCB7XG4gICAgICAgICAgICByb2xlTmFtZTogXCJEYXRhZG9nQVdTSW50ZWdyYXRpb25Sb2xlXCIsXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogXCJBbGxvd3MgRGF0YWRvZyBpbnRlZ3JhdGlvbiB0byB3b3JrXCIsXG4gICAgICAgICAgICBhc3N1bWVkQnk6IG5ldyBBY2NvdW50UHJpbmNpcGFsKHRoaXMuREFUQURPR19BV1NfQUNDT1VOVF9JRCkud2l0aENvbmRpdGlvbnMoe1xuICAgICAgICAgICAgICAgIFwiU3RyaW5nRXF1YWxzXCI6IHtcbiAgICAgICAgICAgICAgICAgICAgXCJzdHM6RXh0ZXJuYWxJZFwiOiBwcm9wcy5leHRlcm5hbElkXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSksXG4gICAgICAgICAgICBpbmxpbmVQb2xpY2llczogeyBcImRhdGFkb2dJbnRlZ3JhdGlvblJvbGVQb2xpY2llc1wiOiB0aGlzLmRhdGFkb2dSb2xlSW5saW5lUG9saWNpZXMoKSB9LFxuICAgICAgICB9XG4gICAgICAgIClcblxuICAgIH07XG5cblxuICAgIGRhdGFkb2dSb2xlSW5saW5lUG9saWNpZXMoKTogUG9saWN5RG9jdW1lbnQge1xuICAgICAgICBjb25zdCBkYXRhZG9nUG9saWN5ID0gbmV3IFBvbGljeVN0YXRlbWVudChcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBzaWQ6IFwiRGF0YWRvZ0FXU0ludGVncmF0aW9uUG9saWN5XCIsXG4gICAgICAgICAgICAgICAgZWZmZWN0OiBFZmZlY3QuQUxMT1csXG4gICAgICAgICAgICAgICAgYWN0aW9uczogW1xuICAgICAgICAgICAgICAgICAgICAnbG9nczpUZXN0TWV0cmljRmlsdGVyJyxcbiAgICAgICAgICAgICAgICAgICAgJ3NxczpMaXN0UXVldWVzJyxcbiAgICAgICAgICAgICAgICAgICAgJ2Nsb3VkdHJhaWw6R2V0VHJhaWxTdGF0dXMnLFxuICAgICAgICAgICAgICAgICAgICAncmVkc2hpZnQ6RGVzY3JpYmVMb2dnaW5nU3RhdHVzJyxcbiAgICAgICAgICAgICAgICAgICAgJ2Nsb3Vkd2F0Y2g6RGVzY3JpYmUqJyxcbiAgICAgICAgICAgICAgICAgICAgJ2J1ZGdldHM6Vmlld0J1ZGdldCcsXG4gICAgICAgICAgICAgICAgICAgICdjbG91ZGZyb250Okxpc3REaXN0cmlidXRpb25zJyxcbiAgICAgICAgICAgICAgICAgICAgJ2Nsb3Vkd2F0Y2g6R2V0KicsXG4gICAgICAgICAgICAgICAgICAgICdzMzpMaXN0QWxsTXlCdWNrZXRzJyxcbiAgICAgICAgICAgICAgICAgICAgJ2VsYXN0aWNmaWxlc3lzdGVtOkRlc2NyaWJlRmlsZVN5c3RlbXMnLFxuICAgICAgICAgICAgICAgICAgICAna2luZXNpczpMaXN0KicsXG4gICAgICAgICAgICAgICAgICAgICdzMzpHZXRCdWNrZXRUYWdnaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgJ2xvZ3M6UHV0U3Vic2NyaXB0aW9uRmlsdGVyJyxcbiAgICAgICAgICAgICAgICAgICAgJ3NlczpHZXQqJyxcbiAgICAgICAgICAgICAgICAgICAgJ2F1dG9zY2FsaW5nOkRlc2NyaWJlKicsXG4gICAgICAgICAgICAgICAgICAgICdzdXBwb3J0OkRlc2NyaWJlVHJ1c3RlZEFkdmlzb3IqJyxcbiAgICAgICAgICAgICAgICAgICAgJ2VsYXN0aWNsb2FkYmFsYW5jaW5nOkRlc2NyaWJlTG9hZEJhbGFuY2VyQXR0cmlidXRlcycsXG4gICAgICAgICAgICAgICAgICAgICdzdXBwb3J0OlJlZnJlc2hUcnVzdGVkQWR2aXNvckNoZWNrJyxcbiAgICAgICAgICAgICAgICAgICAgJ2RpcmVjdGNvbm5lY3Q6RGVzY3JpYmUqJyxcbiAgICAgICAgICAgICAgICAgICAgJ2NvZGVkZXBsb3k6TGlzdConLFxuICAgICAgICAgICAgICAgICAgICAnc3RhdGVzOkRlc2NyaWJlU3RhdGVNYWNoaW5lJyxcbiAgICAgICAgICAgICAgICAgICAgJ2VjczpMaXN0KicsXG4gICAgICAgICAgICAgICAgICAgICdyb3V0ZTUzOkxpc3QqJyxcbiAgICAgICAgICAgICAgICAgICAgJ3NuczpMaXN0KicsXG4gICAgICAgICAgICAgICAgICAgICdiYWNrdXA6TGlzdConLFxuICAgICAgICAgICAgICAgICAgICAnczM6UHV0QnVja2V0Tm90aWZpY2F0aW9uJyxcbiAgICAgICAgICAgICAgICAgICAgJ3RhZzpHZXRUYWdLZXlzJyxcbiAgICAgICAgICAgICAgICAgICAgJ2ZzeDpEZXNjcmliZUZpbGVTeXN0ZW1zJyxcbiAgICAgICAgICAgICAgICAgICAgJ2VsYXN0aWNtYXByZWR1Y2U6TGlzdConLFxuICAgICAgICAgICAgICAgICAgICAnZWxhc3RpY2ZpbGVzeXN0ZW06RGVzY3JpYmVBY2Nlc3NQb2ludHMnLFxuICAgICAgICAgICAgICAgICAgICAnZWxhc3RpY2FjaGU6TGlzdConLFxuICAgICAgICAgICAgICAgICAgICAnczM6R2V0QnVja2V0TG9nZ2luZycsXG4gICAgICAgICAgICAgICAgICAgICdlczpMaXN0RG9tYWluTmFtZXMnLFxuICAgICAgICAgICAgICAgICAgICAnY2xvdWRmcm9udDpHZXREaXN0cmlidXRpb25Db25maWcnLFxuICAgICAgICAgICAgICAgICAgICAnY29kZWRlcGxveTpCYXRjaEdldConLFxuICAgICAgICAgICAgICAgICAgICAnZnN4Okxpc3RUYWdzRm9yUmVzb3VyY2UnLFxuICAgICAgICAgICAgICAgICAgICAnc3RhdGVzOkxpc3RTdGF0ZU1hY2hpbmVzJyxcbiAgICAgICAgICAgICAgICAgICAgJ3hyYXk6R2V0VHJhY2VTdW1tYXJpZXMnLFxuICAgICAgICAgICAgICAgICAgICAnbG9nczpEZXNjcmliZUxvZ0dyb3VwcycsXG4gICAgICAgICAgICAgICAgICAgICdyZHM6TGlzdConLFxuICAgICAgICAgICAgICAgICAgICAnZWxhc3RpY2ZpbGVzeXN0ZW06RGVzY3JpYmVUYWdzJyxcbiAgICAgICAgICAgICAgICAgICAgJ2xvZ3M6RGVzY3JpYmVTdWJzY3JpcHRpb25GaWx0ZXJzJyxcbiAgICAgICAgICAgICAgICAgICAgJ2Nsb3VkdHJhaWw6RGVzY3JpYmVUcmFpbHMnLFxuICAgICAgICAgICAgICAgICAgICAnZWxhc3RpY21hcHJlZHVjZTpEZXNjcmliZSonLFxuICAgICAgICAgICAgICAgICAgICAndGFnOkdldFRhZ1ZhbHVlcycsXG4gICAgICAgICAgICAgICAgICAgICdoZWFsdGg6RGVzY3JpYmVBZmZlY3RlZEVudGl0aWVzJyxcbiAgICAgICAgICAgICAgICAgICAgJ2xvZ3M6RGVsZXRlU3Vic2NyaXB0aW9uRmlsdGVyJyxcbiAgICAgICAgICAgICAgICAgICAgJ2xvZ3M6RmlsdGVyTG9nRXZlbnRzJyxcbiAgICAgICAgICAgICAgICAgICAgJ2VjMjpEZXNjcmliZSonLFxuICAgICAgICAgICAgICAgICAgICAnczM6R2V0QnVja2V0Tm90aWZpY2F0aW9uJyxcbiAgICAgICAgICAgICAgICAgICAgJ29yZ2FuaXphdGlvbnM6RGVzY3JpYmVPcmdhbml6YXRpb24nLFxuICAgICAgICAgICAgICAgICAgICAndGFnOkdldFJlc291cmNlcycsXG4gICAgICAgICAgICAgICAgICAgICdoZWFsdGg6RGVzY3JpYmVFdmVudHMnLFxuICAgICAgICAgICAgICAgICAgICAnZXM6RGVzY3JpYmVFbGFzdGljc2VhcmNoRG9tYWlucycsXG4gICAgICAgICAgICAgICAgICAgICdlczpMaXN0VGFncycsXG4gICAgICAgICAgICAgICAgICAgICdjbG91ZHRyYWlsOkxvb2t1cEV2ZW50cycsXG4gICAgICAgICAgICAgICAgICAgICdyZHM6RGVzY3JpYmUqJyxcbiAgICAgICAgICAgICAgICAgICAgJ2VjczpEZXNjcmliZSonLFxuICAgICAgICAgICAgICAgICAgICAnY2xvdWR3YXRjaDpMaXN0KicsXG4gICAgICAgICAgICAgICAgICAgICdsb2dzOkRlc2NyaWJlTG9nU3RyZWFtcycsXG4gICAgICAgICAgICAgICAgICAgICdkeW5hbW9kYjpMaXN0KicsXG4gICAgICAgICAgICAgICAgICAgICdzbnM6UHVibGlzaCcsXG4gICAgICAgICAgICAgICAgICAgICdyZWRzaGlmdDpEZXNjcmliZUNsdXN0ZXJzJyxcbiAgICAgICAgICAgICAgICAgICAgJ3hyYXk6QmF0Y2hHZXRUcmFjZXMnLFxuICAgICAgICAgICAgICAgICAgICAnaGVhbHRoOkRlc2NyaWJlRXZlbnREZXRhaWxzJyxcbiAgICAgICAgICAgICAgICAgICAgJ2VsYXN0aWNhY2hlOkRlc2NyaWJlKicsXG4gICAgICAgICAgICAgICAgICAgICdsYW1iZGE6R2V0UG9saWN5JyxcbiAgICAgICAgICAgICAgICAgICAgJ2R5bmFtb2RiOkRlc2NyaWJlKicsXG4gICAgICAgICAgICAgICAgICAgICdzMzpHZXRCdWNrZXRMb2NhdGlvbicsXG4gICAgICAgICAgICAgICAgICAgICdhcGlnYXRld2F5OkdFVCcsXG4gICAgICAgICAgICAgICAgICAgICdsYW1iZGE6TGlzdConLFxuICAgICAgICAgICAgICAgICAgICAnZWxhc3RpY2xvYWRiYWxhbmNpbmc6RGVzY3JpYmVMb2FkQmFsYW5jZXJzJyxcbiAgICAgICAgICAgICAgICAgICAgJ2VsYXN0aWNsb2FkYmFsYW5jaW5nOkRlc2NyaWJlKicsXG4gICAgICAgICAgICAgICAgICAgICdraW5lc2lzOkRlc2NyaWJlKicsXG4gICAgICAgICAgICAgICAgICAgICdla3M6TGlzdConLCAvLyBEYXRhZG9nIHVpIGVycm9yXG4gICAgICAgICAgICAgICAgICAgICdhY206TGlzdConIC8vIFNhbWUgYXMgYWJvdmVcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgIHJlc291cmNlczogW1wiKlwiXVxuICAgICAgICAgICAgfVxuICAgICAgICApO1xuXG4gICAgICAgIGNvbnN0IGRvY3VtZW50ID0gbmV3IFBvbGljeURvY3VtZW50KCk7XG4gICAgICAgIGRvY3VtZW50LmFkZFN0YXRlbWVudHMoZGF0YWRvZ1BvbGljeSk7XG5cbiAgICAgICAgcmV0dXJuIGRvY3VtZW50O1xuICAgIH1cblxuICAgIHNldE91dHB1dHMoKTogdm9pZCB7XG4gICAgICAgIG5ldyBDZm5PdXRwdXQodGhpcyxcbiAgICAgICAgICAgIFwiRGF0YWRvZ0ludGVncmF0aW9uUm9sZUFSTlwiLCB7IHZhbHVlOiB0aGlzLmRhdGFkb2dSb2xlLnJvbGVBcm4gfSlcbiAgICB9O1xuXG59XG4iXX0=
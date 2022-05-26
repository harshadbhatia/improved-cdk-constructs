import { CfnOutput, NestedStack } from 'aws-cdk-lib';
import { AccountPrincipal, Effect, PolicyDocument, PolicyStatement, Role } from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import { DatadogIntegrationRoleProps } from '../../../interfaces/lib/integrations/datadog/intefaces';

export class DatadogIntegrationRoleStack extends NestedStack {
    /**
     * The stack is responsible for creating integration role which sets trust between datadog and AWS account.
     */

    private DATADOG_AWS_ACCOUNT_ID = "464622532012"; // Datadog account id

    datadogRole: Role

    constructor(scope: Construct, id: string, props?: DatadogIntegrationRoleProps) {
        super(scope, id);

        this.integrationRole(props!);
        this.setOutputs();
    }

    integrationRole(props: DatadogIntegrationRoleProps): void {

        this.datadogRole = new Role(this, "DatadogAWSIntegrationRole", {
            roleName: "DatadogAWSIntegrationRole",
            description: "Allows Datadog integration to work",
            assumedBy: new AccountPrincipal(this.DATADOG_AWS_ACCOUNT_ID).withConditions({
                "StringEquals": {
                    "sts:ExternalId": props.externalId
                }
            }),
            inlinePolicies: { "datadogIntegrationRolePolicies": this.datadogRoleInlinePolicies() },
        }
        )

    };


    datadogRoleInlinePolicies(): PolicyDocument {
        const datadogPolicy = new PolicyStatement(
            {
                sid: "DatadogAWSIntegrationPolicy",
                effect: Effect.ALLOW,
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
                    'eks:List*', // Datadog ui error
                    'acm:List*' // Same as above
                ],
                resources: ["*"]
            }
        );

        const document = new PolicyDocument();
        document.addStatements(datadogPolicy);

        return document;
    }

    setOutputs(): void {
        new CfnOutput(this,
            "DatadogIntegrationRoleARN", { value: this.datadogRole.roleArn })
    };

}

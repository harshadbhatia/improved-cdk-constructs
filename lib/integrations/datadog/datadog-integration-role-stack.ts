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
                    'eks:List*', // Datadog ui error
                    'acm:List*', // Same as above
                    'eks:Describe*',
                    'acm:Describe*'
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

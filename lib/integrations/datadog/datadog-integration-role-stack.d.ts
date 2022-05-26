import { NestedStack } from 'aws-cdk-lib';
import { PolicyDocument, Role } from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import { DatadogIntegrationRoleProps } from '../../../interfaces/lib/integrations/datadog/intefaces';
export declare class DatadogIntegrationRoleStack extends NestedStack {
    /**
     * The stack is responsible for creating integration role which sets trust between datadog and AWS account.
     */
    private DATADOG_AWS_ACCOUNT_ID;
    datadogRole: Role;
    constructor(scope: Construct, id: string, props?: DatadogIntegrationRoleProps);
    integrationRole(props: DatadogIntegrationRoleProps): void;
    datadogRoleInlinePolicies(): PolicyDocument;
    setOutputs(): void;
}

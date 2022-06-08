import { Stack } from "aws-cdk-lib";
import { Construct } from "constructs";
import { DatadogAWSIntegrationStackProps } from "../../../interfaces/lib/integrations/datadog/intefaces";
import { DatadogIntegrationStackPropsWithDefaults } from "./config";
export declare class DatadogIntegration extends Construct {
    /**
     * Based on https://github.com/DataDog/cloudformation-template/blob/master/aws/main.yaml
     */
    constructor(scope: Construct, id: string, props: DatadogAWSIntegrationStackProps);
    createIntegrationRoleStack(props: DatadogIntegrationStackPropsWithDefaults): Stack;
}

import { CfnStack, Stack } from "aws-cdk-lib";
import { Secret } from "aws-cdk-lib/aws-secretsmanager";
import { Construct } from "constructs";
import { DatadogAWSIntegrationStackProps } from "../../../interfaces/lib/integrations/datadog/intefaces";
import { applyDataDogDefaultsToConfig, DatadogIntegrationStackPropsWithDefaults } from "./config";
import { DatadogIntegrationRoleStack } from "./datadog-integration-role-stack";


export class DatadogIntegration extends Construct {
    /**
     * Based on https://github.com/DataDog/cloudformation-template/blob/master/aws/main.yaml
     */

    constructor(scope: Construct, id: string, props: DatadogAWSIntegrationStackProps) {
        super(scope, id)

        const propsWithDefaults = applyDataDogDefaultsToConfig(props)
        this.createIntegrationRoleStack(propsWithDefaults)
    }

    createIntegrationRoleStack(props: DatadogIntegrationStackPropsWithDefaults): Stack {
        return new DatadogIntegrationRoleStack(this, 'DatadogIntegrationRole', props)
    }

}
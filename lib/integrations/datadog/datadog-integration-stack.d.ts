import { Stack } from "aws-cdk-lib";
import { Construct } from "constructs";
import { DatadogAWSIntegrationStackProps } from "../../../interfaces/lib/integrations/datadog/intefaces";
export declare class DatadogAWSIntegrationStack extends Stack {
    constructor(scope: Construct, id: string, props: DatadogAWSIntegrationStackProps);
}

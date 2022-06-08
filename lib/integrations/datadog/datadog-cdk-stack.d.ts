import { Stack } from "aws-cdk-lib";
import { Construct } from "constructs";
import { Datadog } from "datadog-cdk-constructs-v2";
import { DatadogStackProps } from "../../../interfaces/lib/integrations/datadog/intefaces";
export declare class DatadogStack extends Stack {
    datadogCDK: Datadog;
    constructor(scope: Construct, id: string, props: DatadogStackProps);
}

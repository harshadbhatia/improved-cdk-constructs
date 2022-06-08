import { Stack } from "aws-cdk-lib";
import { Construct } from "constructs";
import { DatadogOperatorStackProps } from "../../../interfaces/lib/integrations/datadog/intefaces";
export declare class DatadogOperatorStack extends Stack {
    DATADOG_OPERATOR_VERSION: string;
    constructor(scope: Construct, id: string, props: DatadogOperatorStackProps);
    installDatadogOperator(props: DatadogOperatorStackProps): Stack;
}

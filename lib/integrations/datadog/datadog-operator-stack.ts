import { Stack } from "aws-cdk-lib";
import { Construct } from "constructs";
import { DatadogOperatorStackProps } from "../../../interfaces/lib/integrations/datadog/intefaces";
import { DatadogOperator } from "./datadog-operator-construct";

export class DatadogOperatorStack extends Stack {
  constructor(scope: Construct, id: string, props: DatadogOperatorStackProps) {
    super(scope, id, props);

    new DatadogOperator(this, 'DatadogOperator', props)

  }
}
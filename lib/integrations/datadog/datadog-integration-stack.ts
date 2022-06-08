import { Stack } from "aws-cdk-lib";
import { Construct } from "constructs";
import { DatadogAWSIntegrationStackProps } from "../../../interfaces/lib/integrations/datadog/intefaces";
import { KinesisToDatadogStream } from "./datadog-cw-kinesis-datadog-construct";
import { DatadogIntegration } from "./datadog-integration-construct";
import { DatadogOperator } from "./datadog-operator-construct";

export class DatadogAWSIntegrationStack extends Stack {
    constructor(scope: Construct, id: string, props: DatadogAWSIntegrationStackProps) {
        super(scope, id, props);

        new DatadogIntegration(this, 'DatadogIntegrationConstruct', props)
        new KinesisToDatadogStream(this, 'DatadogKinesisIntegration', {
            datadogApiKeySecretName: props.apiKey
        });

    }
}
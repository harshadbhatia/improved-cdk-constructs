import { Stack } from "aws-cdk-lib";
import { Secret } from "aws-cdk-lib/aws-secretsmanager";
import { Construct } from "constructs";
import { DatadogAWSIntegrationStackProps } from "../../../interfaces/lib/integrations/datadog/intefaces";
import { KinesisToDatadogStream } from "./datadog-cw-kinesis-datadog-construct";
import { DatadogIntegration } from "./datadog-integration-construct";

export class DatadogAWSIntegrationStack extends Stack {
    constructor(scope: Construct, id: string, props: DatadogAWSIntegrationStackProps) {
        super(scope, id, props);

        new Secret(this, 'DatadogAPISecret', { secretName: '/account/datadog/api-key', description: 'Datadog API key'})
        new Secret(this, 'DatadogAPPSecret', { secretName: '/account/datadog/app-key', description: 'Datadog APP key'})

        new DatadogIntegration(this, 'DatadogIntegrationConstruct', props)
        new KinesisToDatadogStream(this, 'DatadogKinesisIntegration', {
            datadogApiKeySecretName: '/account/datadog/api-key'
        });

    }
}
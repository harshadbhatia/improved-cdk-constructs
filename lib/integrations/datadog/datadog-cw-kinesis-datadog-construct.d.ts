import { ILogGroup } from "aws-cdk-lib/aws-logs";
import { Construct } from "constructs";
export interface KinesisToDatadogStreamProps {
    /**
     *
     * The name of the SecretsManager secret where your Datadog API key is saved.
     * The secret must be a JSON object on the format { "value": "SECRET" }
     *
     */
    datadogApiKeySecretName: string;
    datadogEndpointUrl?: string;
    /**
     * The CloudWatch log groups from you are streaming to Datadog
     */
    logGroups?: ILogGroup[];
}
export declare class KinesisToDatadogStream extends Construct {
    /**
     * The construct creates Kinesis Firehose Delivery Stream, S3 bucket for failed events,
     * Creates lambda which automates subscription of cloudwatch logs to datadog automatically.
     */
    private datadogDeliveryStream;
    private cloudWatchLogsRole;
    constructor(scope: Construct, id: string, props: KinesisToDatadogStreamProps);
    setupAutomaticSubscriptionForNewLogGroups(): void;
    setupLogStream(props: KinesisToDatadogStreamProps): void;
}

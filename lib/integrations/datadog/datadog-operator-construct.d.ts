import { ICluster, KubernetesManifest, ServiceAccount } from "aws-cdk-lib/aws-eks";
import { Construct } from "constructs";
import { DatadogAWSIntegrationStackProps } from "../../../interfaces/lib/integrations/datadog/intefaces";
export declare class DatadogOperator extends Construct {
    DATADOG_OPERATOR_VERSION: string;
    constructor(scope: Construct, id: string, props: DatadogAWSIntegrationStackProps);
    installDatadogOperator(props: DatadogAWSIntegrationStackProps): void;
    createServiceAccount(props: DatadogAWSIntegrationStackProps, cluster: ICluster): ServiceAccount;
    createSecretProviderClass(cluster: ICluster): KubernetesManifest;
    installDatadogAgentWithExistingSecret(props: DatadogAWSIntegrationStackProps, cluster: ICluster): KubernetesManifest;
    installDatadogAgentWithVolumeMounts(cluster: ICluster, apiKey: string, appKey: string): KubernetesManifest;
}

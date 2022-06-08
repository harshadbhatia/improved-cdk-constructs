import { ICluster, KubernetesManifest, ServiceAccount } from "aws-cdk-lib/aws-eks";
import { Construct } from "constructs";
import { DatadogOperatorStackProps } from "../../../interfaces/lib/integrations/datadog/intefaces";
export declare class DatadogOperator extends Construct {
    DATADOG_OPERATOR_VERSION: string;
    constructor(scope: Construct, id: string, props: DatadogOperatorStackProps);
    installDatadogOperator(props: DatadogOperatorStackProps): void;
    createServiceAccount(props: DatadogOperatorStackProps, cluster: ICluster): ServiceAccount;
    createSecretProviderClass(props: DatadogOperatorStackProps, cluster: ICluster): KubernetesManifest;
    installDatadogAgentWithExistingSecret(props: DatadogOperatorStackProps, cluster: ICluster): KubernetesManifest;
    installDatadogAgentWithVolumeMounts(cluster: ICluster, apiKey: string, appKey: string): KubernetesManifest;
}

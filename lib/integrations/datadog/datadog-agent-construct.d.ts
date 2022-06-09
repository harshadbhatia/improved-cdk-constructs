import { ICluster, KubernetesManifest, ServiceAccount } from "aws-cdk-lib/aws-eks";
import { Construct } from "constructs";
import { DatadogOperatorStackProps } from "../../../interfaces/lib/integrations/datadog/intefaces";
export declare class DatadogAgent extends Construct {
    constructor(scope: Construct, id: string, props: DatadogOperatorStackProps);
    installAgentManifest(props: DatadogOperatorStackProps): KubernetesManifest;
    createServiceAccount(props: DatadogOperatorStackProps, cluster: ICluster): ServiceAccount;
    createSecretProviderClass(props: DatadogOperatorStackProps, cluster: ICluster): KubernetesManifest;
    installDatadogAgentWithExistingSecret(props: DatadogOperatorStackProps, cluster: ICluster): KubernetesManifest;
    installDatadogAgentWithVolumeMounts(cluster: ICluster, apiKey: string, appKey: string): KubernetesManifest;
}

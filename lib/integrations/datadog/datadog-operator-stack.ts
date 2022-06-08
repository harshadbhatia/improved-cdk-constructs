import { Aspects, Stack } from "aws-cdk-lib";
import { Cluster } from "aws-cdk-lib/aws-eks";
import { OpenIdConnectProvider } from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";
import { EKSChart } from "../../../interfaces/lib/eks/interfaces";
import { DatadogOperatorStackProps } from "../../../interfaces/lib/integrations/datadog/intefaces";
import { HelmChartStack } from "../../eks/helm-chart";
import { PermissionsBoundaryAspect } from "../../utils/permissions-boundary-aspect";
import { DatadogAgent } from "./datadog-operator-construct";

export class DatadogOperatorStack extends Stack {

  DATADOG_OPERATOR_VERSION = "0.8.0"

  constructor(scope: Construct, id: string, props: DatadogOperatorStackProps) {
    super(scope, id, props);
    const h = this.installDatadogOperator(props)
    const a = new DatadogAgent(this, 'DatadogOperator', props)

    a.node.addDependency(h)

  }

  installDatadogOperator(props: DatadogOperatorStackProps): Stack {

    const chart: EKSChart = {
      name: "DatadogOperator",
      chart: "datadog-operator",
      namespace: "datadog",
      release: `v${this.DATADOG_OPERATOR_VERSION}`,
      version: `${this.DATADOG_OPERATOR_VERSION}`,
      enabled: true,
      repository: "https://helm.datadoghq.com",
      description: `Datadog operator installation v${this.DATADOG_OPERATOR_VERSION}`,
      createNamespace: true,
      values: {}
    }

    const cluster = Cluster.fromClusterAttributes(this, `${props.clusterName}Ref`, {
      clusterName: props.clusterName!,
      kubectlRoleArn: props.kubectlRoleArn!,
      openIdConnectProvider: OpenIdConnectProvider.fromOpenIdConnectProviderArn(this, 'OpenIDConnectProvider', props.openIdConnectProviderArn!),
    });
    // ..TODO.. harshad - This solves the stack name problem - Long term fix required
    const h = new HelmChartStack(this.node.root, 'DOH', chart, props.clusterName!, props.kubectlRoleArn!, {
      stackName: 'DatadogOperatorHelm',
      env: props.env,
      synthesizer: props.operatorSynthesizer,
    });

    if (props.permissionBoundaryRole) { Aspects.of(h).add(new PermissionsBoundaryAspect()) }
    else { Aspects.of(h).add(new PermissionsBoundaryAspect()) }

    return h

  }
}
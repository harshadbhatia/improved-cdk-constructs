import eks = require('aws-cdk-lib/aws-eks');
import cdk = require('aws-cdk-lib');
import ssm = require('aws-cdk-lib/aws-ssm');
import { Construct } from 'constructs';
import { HelmStackProps } from '../../interfaces/lib/eks/interfaces';
import { SecretValue } from 'aws-cdk-lib';


export class HelmChartStack extends cdk.Stack {

  config: HelmStackProps

  constructor(scope: Construct, id: string, props?: HelmStackProps) {
    super(scope, id, props);

    this.config = props!
    this.installHelmChart();
  }

  installHelmChart() {
    // Get role from ssm if specificed or use arn instead
    let role = ""

    if (this.config.kubectlRoleSSM) {
      role = ssm.StringParameter.valueForStringParameter(this, this.config.kubectlRoleSSM!)
    } else {
      role = this.config.kubectlRoleArn!
    }

    const cluster = eks.Cluster.fromClusterAttributes(this, `${this.config.clusterName}Ref`, {
      clusterName: this.config.clusterName,
      kubectlRoleArn: role
    })

    cluster.addHelmChart(this.config.chart.name, {
      chart: this.config.chart.chart,
      namespace: this.config.chart.namespace,
      repository: this.config.chart.repository,
      values: this.config.chart.values,
      release: this.config.chart.release,
      version: this.config.chart.version,
      createNamespace: this.config.chart.createNamespace,
    });
  }
}

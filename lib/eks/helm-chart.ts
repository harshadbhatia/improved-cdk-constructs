import eks = require('aws-cdk-lib/aws-eks');
import cdk = require('aws-cdk-lib');
import { HelmChart } from 'aws-cdk-lib/aws-eks';
import { Construct } from 'constructs';
import { EKSChart } from '../../interfaces/lib/eks/interfaces';

export class HelmChartStack extends cdk.Stack {
  chart: EKSChart;

  constructor(scope: Construct, id: string, chart: EKSChart, clusterName: string, kubectlRoleArn: string, props?: cdk.StackProps) {
    super(scope, id, props);

    this.chart = chart;
    this.installHelmChart(clusterName, kubectlRoleArn);
  }

  installHelmChart(clusterName: string, kubectlRoleArn: string) {

    const cluster = eks.Cluster.fromClusterAttributes(this, `${clusterName}Ref`, {
      clusterName: clusterName,
      kubectlRoleArn: kubectlRoleArn
    })

    cluster.addHelmChart(this.chart.name, {
      chart: this.chart.chart,
      namespace: this.chart.namespace,
      repository: this.chart.repository,
      values: this.chart.values,
      release: this.chart.release,
      version: this.chart.version,
      createNamespace: this.chart.createNamespace,
    });
  }
}

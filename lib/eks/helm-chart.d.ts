import eks = require('aws-cdk-lib/aws-eks');
import cdk = require('aws-cdk-lib');
import { NestedStack } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { EKSChart } from '../../interfaces/lib/eks/interfaces';
export declare class HelmChartStack extends NestedStack {
    chart: EKSChart;
    constructor(scope: Construct, id: string, chart: EKSChart, cluster: eks.Cluster, props?: cdk.StackProps);
    installHelmChart(cluster: eks.Cluster): void;
}

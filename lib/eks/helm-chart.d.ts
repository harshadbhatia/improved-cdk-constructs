import cdk = require('aws-cdk-lib');
import { Construct } from 'constructs';
import { EKSChart } from '../../interfaces/lib/eks/interfaces';
export declare class HelmChartStack extends cdk.Stack {
    chart: EKSChart;
    constructor(scope: Construct, id: string, chart: EKSChart, clusterName: string, kubectlRoleArn: string, props?: cdk.StackProps);
    installHelmChart(clusterName: string, kubectlRoleArn: string): void;
}

import cdk = require('aws-cdk-lib');
import { Construct } from 'constructs';
import { HelmStackProps } from '../../interfaces/lib/eks/interfaces';
export declare class HelmChartStack extends cdk.Stack {
    config: HelmStackProps;
    constructor(scope: Construct, id: string, props?: cdk.StackProps);
    installHelmChart(): void;
}

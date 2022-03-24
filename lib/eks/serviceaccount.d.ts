import cdk = require('aws-cdk-lib');
import { StackProps } from 'aws-cdk-lib';
import { Construct } from "constructs";
import { EKSSAStackConfig } from '../../interfaces/lib/eks/interfaces';
import { Cluster } from 'aws-cdk-lib/aws-eks';
export declare class ServiceAccountStack extends cdk.Stack {
    config: EKSSAStackConfig;
    constructor(scope: Construct, id: string, config: EKSSAStackConfig, eksCluster: Cluster, props?: StackProps);
    createServiceAccount(cluster: Cluster): void;
}

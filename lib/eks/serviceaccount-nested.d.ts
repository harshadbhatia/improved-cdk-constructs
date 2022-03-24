import { NestedStack, StackProps } from 'aws-cdk-lib';
import { Cluster } from 'aws-cdk-lib/aws-eks';
import { Construct } from "constructs";
import { ServiceAccountCfg } from '../../interfaces/lib/eks/interfaces';
export declare class ServiceAccountNestedStack extends NestedStack {
    body: Construct;
    bodies: Construct[];
    config: ServiceAccountCfg;
    constructor(scope: Construct, id: string, eksCluster: Cluster, svcAccountsCfg: ServiceAccountCfg, props?: StackProps);
    createServiceAccount(cluster: Cluster): void;
}

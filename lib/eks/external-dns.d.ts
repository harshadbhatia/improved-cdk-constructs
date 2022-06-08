import { NestedStack, StackProps } from 'aws-cdk-lib';
import { Cluster } from 'aws-cdk-lib/aws-eks';
import { Role } from 'aws-cdk-lib/aws-iam';
import { Construct } from "constructs";
import { ExternalDNSConfig } from '../../interfaces/lib/eks/interfaces';
export declare class ExternalDNSNested extends NestedStack {
    body: Construct;
    bodies: Construct[];
    config: ExternalDNSConfig;
    constructor(scope: Construct, id: string, eksCluster: Cluster, externalDNSConfig: ExternalDNSConfig, props?: StackProps);
    createDNSRole(): Role;
    deployManifest(cluster: Cluster): void;
}

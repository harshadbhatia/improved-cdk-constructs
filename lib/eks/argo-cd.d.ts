import { NestedStack, NestedStackProps } from 'aws-cdk-lib';
import { Cluster } from 'aws-cdk-lib/aws-eks';
import { Construct } from "constructs";
export interface ArgoCDProps extends NestedStackProps {
    eksCluster: Cluster;
    clusterName: string;
}
export declare class ArgoCD extends NestedStack {
    body: Construct;
    bodies: Construct[];
    config: ArgoCDProps;
    constructor(scope: Construct, id: string, props?: ArgoCDProps);
    deployManifest(): void;
}

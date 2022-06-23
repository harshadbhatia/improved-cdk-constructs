import { NestedStack, NestedStackProps } from 'aws-cdk-lib';
import { Cluster } from 'aws-cdk-lib/aws-eks';
import { Construct } from "constructs";
export interface ExternalDNSProps extends NestedStackProps {
    eksCluster: Cluster;
    domainFilter: string;
    clusterName: string;
}
export declare class ExternalDNS extends NestedStack {
    body: Construct;
    bodies: Construct[];
    config: ExternalDNSProps;
    constructor(scope: Construct, id: string, props?: ExternalDNSProps);
    deployManifest(): void;
}

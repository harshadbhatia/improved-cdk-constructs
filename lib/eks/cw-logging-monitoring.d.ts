import { NestedStack, StackProps } from 'aws-cdk-lib';
import { Cluster } from 'aws-cdk-lib/aws-eks';
import { Construct } from "constructs";
export declare class CloudwatchLoggingNested extends NestedStack {
    body: Construct;
    bodies: Construct[];
    eksCluster: Cluster;
    constructor(scope: Construct, id: string, eksCluster: Cluster, props?: StackProps);
    deployLogging(): void;
    deployMonitoring(): void;
}

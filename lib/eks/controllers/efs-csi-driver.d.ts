import { NestedStack, NestedStackProps } from 'aws-cdk-lib';
import { Cluster } from 'aws-cdk-lib/aws-eks';
import { Construct } from "constructs";
export interface AwsEFSCSIDriverProps extends NestedStackProps {
    enabled: boolean;
    installIAM: boolean;
    installHelm: boolean;
}
export declare class AwsEFSCSIDriver extends NestedStack {
    body: Construct;
    constructor(scope: Construct, id: string, cluster: Cluster, props?: AwsEFSCSIDriverProps);
    createPolicyAndSA(scope: Construct, cluster: Cluster): void;
    installHelmChart(cluster: Cluster): void;
}

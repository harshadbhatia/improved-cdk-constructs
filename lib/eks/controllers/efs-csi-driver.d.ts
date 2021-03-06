import { NestedStack } from 'aws-cdk-lib';
import { Cluster } from 'aws-cdk-lib/aws-eks';
import { Construct } from "constructs";
export declare class AwsEFSCSIDriver extends NestedStack {
    body: Construct;
    constructor(scope: Construct, id: string, cluster: Cluster);
}

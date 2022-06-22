import { Cluster } from 'aws-cdk-lib/aws-eks';
import { Construct } from "constructs";
import { NestedStack } from 'aws-cdk-lib';
export declare class AwsLoadBalancerController extends NestedStack {
    body: Construct;
    constructor(scope: Construct, id: string, cluster: Cluster);
}

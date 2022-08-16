import { Cluster } from 'aws-cdk-lib/aws-eks';
import { Construct } from "constructs";
import { Stack, StackProps } from 'aws-cdk-lib';
export interface AwsLoadBalancerControllerProps extends StackProps {
    enabled: boolean;
    installIAM: boolean;
    installHelm: boolean;
}
export declare class AwsLoadBalancerController extends Stack {
    body: Construct;
    constructor(scope: Construct, id: string, cluster: Cluster, props?: AwsLoadBalancerControllerProps);
    createPolicyAndSA(scope: Construct, cluster: Cluster): void;
    installHelmChart(cluster: Cluster): void;
}

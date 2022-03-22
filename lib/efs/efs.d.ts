import { NestedStack, StackProps } from 'aws-cdk-lib';
import { FileSystem } from "aws-cdk-lib/aws-efs";
import { IVpc, SecurityGroup } from "aws-cdk-lib/aws-ec2";
import { Construct } from 'constructs';
import { EKSEFSConfig } from '../../interfaces/lib/eks/interfaces';
export declare class EFSNestedStack extends NestedStack {
    clusterName: string;
    config: EKSEFSConfig;
    vpc: IVpc;
    efs: FileSystem;
    sg: SecurityGroup;
    constructor(scope: Construct, id: string, eksCluster: string, config: EKSEFSConfig, vpc: IVpc, eksClusterSG: string, props?: StackProps);
    createEfs(): void;
    createParams(): void;
}

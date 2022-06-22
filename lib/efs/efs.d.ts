import { Stack } from 'aws-cdk-lib';
import { IVpc, SecurityGroup } from "aws-cdk-lib/aws-ec2";
import { FileSystem } from "aws-cdk-lib/aws-efs";
import { Construct } from 'constructs';
import { EFSStackProps } from '../../interfaces/lib/eks/interfaces';
/**
 * EFS Stack is only responsible for creating efs and access point only.
 * Security groups are created by the Shared Stack.
 */
export declare class EFSStack extends Stack {
    config: EFSStackProps;
    efs: FileSystem;
    sg: SecurityGroup;
    constructor(scope: Construct, id: string, props?: EFSStackProps);
    getVPC(): IVpc;
    createEfs(): void;
    createParams(): void;
}

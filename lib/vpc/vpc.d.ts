import { Stack, StackProps } from 'aws-cdk-lib';
import { Vpc } from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';
import { VPCConfig } from '../../interfaces/lib/vpc/interfaces';
export declare class VPCStack extends Stack {
    vpc: Vpc;
    config: VPCConfig;
    constructor(scope: Construct, id: string, config: VPCConfig, props?: StackProps);
    createVPC(): void;
    createParams(): void;
    addTags(): void;
}

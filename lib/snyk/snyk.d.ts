import { Stack, StackProps } from 'aws-cdk-lib';
import { PolicyDocument, Role } from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import { SnykConfig } from '../../interfaces/lib/snyk/interfaces';
export declare class SnykStack extends Stack {
    config: SnykConfig;
    snykRole: Role;
    constructor(scope: Construct, id: string, config: SnykConfig, props?: StackProps);
    snykReadOnlyAccess(): void;
    snykInlinePolicies(): PolicyDocument;
    setOutputs(): void;
}

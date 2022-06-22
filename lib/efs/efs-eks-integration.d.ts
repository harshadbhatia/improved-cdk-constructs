import { Stack } from 'aws-cdk-lib';
import { IFileSystem } from "aws-cdk-lib/aws-efs";
import { KubernetesManifest } from 'aws-cdk-lib/aws-eks';
import { Construct } from 'constructs';
import { EFSEKSIntegrationStackProps } from '../../interfaces/lib/eks/interfaces';
/**
 * EFS Shared stack - Useful for combining multiple integrations
 */
export declare class EFSEKSIntegrationStack extends Stack {
    config: EFSEKSIntegrationStackProps;
    efs: IFileSystem;
    constructor(scope: Construct, id: string, props?: EFSEKSIntegrationStackProps);
    getEFS(): void;
    updateEFS(): void;
    createStorageClass(): KubernetesManifest;
}

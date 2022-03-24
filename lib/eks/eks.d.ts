import iam = require('aws-cdk-lib/aws-iam');
import ec2 = require('aws-cdk-lib/aws-ec2');
import eks = require('aws-cdk-lib/aws-eks');
import cdk = require('aws-cdk-lib');
import { IVpc } from 'aws-cdk-lib/aws-ec2';
import { Cluster, KubernetesManifest } from 'aws-cdk-lib/aws-eks';
import { Role } from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import { EKSStackConfig } from '../../interfaces/lib/eks/interfaces';
import { Selector } from 'aws-cdk-lib/aws-eks';
export declare class EKSCluster extends cdk.Stack {
    config: EKSStackConfig;
    eksCluster: Cluster;
    constructor(scope: Construct, id: string, config: EKSStackConfig, props?: cdk.StackProps);
    createStorageClass(fsID: string): KubernetesManifest;
    getVPC(): ec2.IVpc;
    createClusterHandlerRole(): Role;
    createEKSCluster(vpc: ec2.IVpc, config: EKSStackConfig, clusterHandlerRole: iam.Role): eks.Cluster;
    createWorkerNodeGroup(eksCluster: eks.Cluster, workerNodeRole: Role, vpc: IVpc): void;
    createFargateProfiles(cluster: eks.Cluster, vpc: IVpc, ns: eks.KubernetesManifest[]): eks.FargateProfile[];
    createNamespaces(selectors: Selector[], cluster: eks.Cluster): eks.KubernetesManifest[];
    createS3Buckets(): void;
}

import iam = require('aws-cdk-lib/aws-iam');
import ec2 = require('aws-cdk-lib/aws-ec2');
import eks = require('aws-cdk-lib/aws-eks');
import cdk = require('aws-cdk-lib');
import { IVpc } from 'aws-cdk-lib/aws-ec2';
import { Cluster, Selector } from 'aws-cdk-lib/aws-eks';
import { Policy, Role } from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import { EKSStackConfig } from '../../interfaces/lib/eks/interfaces';
export declare class EKSCluster extends cdk.Stack {
    config: EKSStackConfig;
    eksCluster: Cluster;
    constructor(scope: Construct, id: string, config: EKSStackConfig, props?: cdk.StackProps);
    getVPC(): ec2.IVpc;
    createClusterHandlerRole(): Role;
    createEKSCluster(vpc: ec2.IVpc, config: EKSStackConfig, clusterHandlerRole: iam.Role): eks.Cluster;
    createWorkerNodeGroup(eksCluster: eks.Cluster, workerNodeRole: Role, vpc: IVpc): void;
    createFargateProfiles(cluster: eks.Cluster, vpc: IVpc, ns: eks.KubernetesManifest[]): eks.FargateProfile[];
    createEKSFargateCloudwatchPolicy(): Policy;
    createNamespaces(selectors: Selector[], cluster: eks.Cluster): eks.KubernetesManifest[];
    createS3Buckets(): void;
    createParams(): void;
    installArgoCD(cluster: eks.Cluster): void;
}

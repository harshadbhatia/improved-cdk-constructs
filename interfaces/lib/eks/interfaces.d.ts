import { StackProps } from "aws-cdk-lib";
import { IConnectable } from "aws-cdk-lib/aws-ec2";
import { ICluster, Selector } from "aws-cdk-lib/aws-eks";
import { S3BucketCfg } from "../s3/interfaces";
export interface EKSStackConfig {
    stackName: string;
    stackDescription: string;
    clusterName: string;
    workerInstanceTypes: string;
    workerCapacityType: string;
    workerMinSize: number;
    workerMaxSize: number;
    workerDesiredSize: number;
    workerGroupName: string;
    allowAdminRole?: string;
    efs: EKSEFSConfig;
    namespaces?: Selector[];
    externalDNS: ExternalDNSConfig;
    fargateProfiles?: FargateProfileConfig[];
    s3Buckets?: S3BucketCfg[];
    isPrivateCluster?: boolean;
}
export interface HelmChartStackConfig {
    stackName: string;
    stackDescription: string;
    clusterName: string;
    kubectlRoleArn: string;
    charts?: EKSChart[];
}
export interface EKSSAStackConfig {
    stackName: string;
    stackDescription: string;
    clusterName: string;
    kubectlRoleArn: string;
    namespaces?: Selector[];
    serviceAccounts?: ServiceAccountCfg[];
}
export interface EKSChart {
    name: string;
    chart: string;
    namespace: string;
    release: string;
    values: {
        [key: string]: any;
    };
    repository: string;
    description: string;
    version: string;
    enabled: boolean;
    createNamespace: boolean;
}
export interface EFSStackProps extends StackProps {
    fsName: string;
    vpcId: string;
    accessPoints: AccessPoint[];
    cluster: ICluster;
}
export interface EFSEKSIntegrationStackProps extends StackProps {
    fsId: string;
    fsSg: string;
    cluster?: ICluster;
    sgs: IConnectable[];
}
export interface EKSEFSConfig {
    fsName: string;
    ingress: SecurityGroup[];
    accessPoints: AccessPoint[];
}
interface SecurityGroup {
    fromSG: string;
    port: number;
    description: string;
}
interface AccessPoint {
    logicalId: string;
    path: string;
    posixUser?: {
        gid: string;
        uid: string;
        secondaryGids: [];
    };
    acls?: {
        ownerGid: string;
        ownerUid: string;
        permissions: string;
    };
}
export interface ExternalDNSConfig {
    domainFilter: string;
}
export interface ServiceAccountCfg {
    name: string;
    namespace: string;
    policyName?: string;
    policy?: string;
    k8RoleAndBinding?: RoleCfg[];
}
export interface FargateProfileConfig {
    selectors: Selector[];
    name: string;
    createNamespace: boolean;
}
export interface RoleCfg {
    name: string;
    rules: RoleRules[];
    subjects?: RoleBindingSubjects[];
}
export interface RoleRules {
    apiGroups: string[];
    resources: string[];
    verbs: string[];
}
export interface RoleBindingSubjects {
    kind: string;
    name: string;
    namespace: string;
}
export interface HelmStackProps extends StackProps {
    chart: EKSChart;
    clusterName: string;
    kubectlRoleArn?: string;
    kubectlRoleSSM?: string;
}
export {};

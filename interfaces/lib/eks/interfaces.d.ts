import { Selector } from "aws-cdk-lib/aws-eks";
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
    charts?: EKSChart[];
    serviceAccounts?: ServiceAccountCfg[];
    externalDNS: ExternalDNSConfig;
    fargateProfiles?: FargateProfileConfig[];
    s3Buckets?: S3BucketCfg[];
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
export interface S3BucketCfg {
    name: string;
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
export {};

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

  // For storage we will have rules and access point definitions
  efs: EKSEFSConfig
  // To break dependency on between SA and charts
  namespaces?: Selector[];

  externalDNS: ExternalDNSConfig;
  //  Used to create fargate profiles on the cluster
  fargateProfiles?: FargateProfileConfig[];

  // any possible buckets to create
  s3Buckets?: S3BucketCfg[];

}

export interface EKSSAStackConfig {
  stackName: string;
  stackDescription: string;
  clusterName: string;
  kubectlRoleArn: string;
  namespaces?: Selector[]; // Future
  serviceAccounts?: ServiceAccountCfg[];
 
}

export interface EKSChart {
  name: string;
  chart: string;
  namespace: string;
  release: string;
  values: { [key: string]: any };
  repository: string;
  description: string;
  version: string;
  enabled: boolean;
  createNamespace: boolean;
}

export interface EKSEFSConfig {
  fsName: string
  ingress: SecurityGroup[]
  accessPoints: AccessPoint[]

}

interface SecurityGroup {
  fromSG: string;
  port: number;
  description: string;
}

interface AccessPoint {
  logicalId: string
  path: string;
  posixUser?: {
    gid: string,
    uid: string,
    secondaryGids: []
  }
  acls?: {
    ownerGid: string;
    ownerUid: string;
    permissions: string;
  }
}

export interface ExternalDNSConfig {
  domainFilter: string;
}

export interface ServiceAccountCfg {
  name: string
  namespace: string
  policyName?: string
  policy?: string

  // Optional Role and RoleBinding creation
  k8RoleAndBinding?: RoleCfg[]
}

export interface FargateProfileConfig {
  selectors: Selector[]
  name: string
  createNamespace: boolean
}

export interface S3BucketCfg {
  name: string
}

export interface RoleCfg {
  name: string
  rules: RoleRules[]
  subjects?: RoleBindingSubjects[]
}

export interface RoleRules {
  apiGroups: string[]
  resources: string[]
  verbs: string[]
}

export interface RoleBindingSubjects {
  kind: string
  name: string
  namespace: string

}
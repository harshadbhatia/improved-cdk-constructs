
import { AwsEFSCSIDriverProps } from "../../../lib/eks/controllers/efs-csi-driver.ts";
import { AwsLoadBalancerControllerProps } from "../../../lib/eks/controllers/load-balancer-controller.ts";

import { cdk, ec2, eks } from "../../../deps.ts";
import { S3BucketCfg } from "../index.ts";

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
  namespaces?: eks.Selector[];

  externalDNS: ExternalDNSConfig;
  //  Used to create fargate profiles on the cluster
  fargateProfiles?: FargateProfileConfig[];

  // any possible buckets to create
  s3Buckets?: S3BucketCfg[];

  isPrivateCluster?: boolean
  installArgoCD?: boolean
  placeClusterHandlerInVpc?: boolean

  addons?: Addons

}

export interface Addons {
  loadBalancer?: AwsLoadBalancerControllerProps
  efs?: AwsEFSCSIDriverProps
}

export interface HelmChartStackConfig {
  stackName: string;
  stackDescription: string;
  clusterName: string;
  kubectlRoleArn: string;

  charts?: EKSChart[]
}

export interface EKSSAStackConfig {
  stackName: string;
  stackDescription: string;
  clusterName: string;
  kubectlRoleArn: string;
  namespaces?: eks.Selector[]; // Future
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

// EFS vanilla - only efs and props
export interface EFSStackProps extends cdk.StackProps {
  fsName: string
  vpcId: string

  accessPoints: AccessPoint[]
  cluster: eks.ICluster
}
// EFS Shared - allows integration between other stacks
export interface EFSEKSIntegrationStackProps extends cdk.StackProps {
  fsId: string
  fsSg: string // EFS Security Group required to access EFS

  cluster?: eks.ICluster // Used to create SC
  sgs: ec2.IConnectable[]
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
  selectors: eks.Selector[]
  name: string
  createNamespace: boolean
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

// Helm stack
export interface HelmStackProps extends cdk.StackProps {
  chart: EKSChart
  clusterName: string
  kubectlRoleArn?: string
  kubectlRoleSSM?: string
}
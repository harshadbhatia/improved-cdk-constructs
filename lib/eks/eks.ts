import iam = require('aws-cdk-lib/aws-iam');
import ec2 = require('aws-cdk-lib/aws-ec2');
import eks = require('aws-cdk-lib/aws-eks');
import ssm = require('aws-cdk-lib/aws-ssm');
import cdk = require('aws-cdk-lib');
import { Aws, RemovalPolicy } from 'aws-cdk-lib';
import { IVpc } from 'aws-cdk-lib/aws-ec2';
import { CapacityType, Cluster, KubernetesManifest } from 'aws-cdk-lib/aws-eks';
import {
  CompositePrincipal,
  Effect,
  PolicyDocument,
  PolicyStatement,
  Role,
  ServicePrincipal,
} from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import { EKSStackConfig } from '../../interfaces/lib/eks/interfaces';
import { convertStringToArray } from '../utils/common';
import { EFSNestedStack } from '../efs/efs';
import { AwsEFSCSIDriverNested } from './controllers/efs-csi-driver';
import { AwsLoadBalancerControllerNested } from './controllers/load-balancer-controller';
import { CloudwatchLoggingNested } from './cw-logging-monitoring';
import { ExternalDNSNested } from './external-dns';
import { Selector } from 'aws-cdk-lib/aws-eks';
import { BlockPublicAccess, Bucket, BucketEncryption } from 'aws-cdk-lib/aws-s3';
import { AwsSecretsCSIDriverNested } from './controllers/secrets-csi-driver';

export class EKSCluster extends cdk.Stack {
  config: EKSStackConfig;
  eksCluster: Cluster;

  constructor(scope: Construct, id: string, config: EKSStackConfig, props?: cdk.StackProps) {
    super(scope, id, props);
    this.config = config;

    const vpc = this.getVPC();

    const clusterHandlerRole = this.createClusterHandlerRole();

    // IAM role for our EC2 worker nodes
    const workerRole = new iam.Role(this, 'EKSWorkerRole', {
      assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonEKSWorkerNodePolicy'),
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonEC2ContainerRegistryReadOnly'),
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonEKS_CNI_Policy'),
        iam.ManagedPolicy.fromAwsManagedPolicyName('CloudWatchAgentServerPolicy'),
      ],
    });

    this.eksCluster = this.createEKSCluster(vpc, config, clusterHandlerRole);

    if (this.config.allowAdminRole) {
      const role = Role.fromRoleArn(
        this,
        'AdminRoleAuth',
        `arn:aws:iam::${Aws.ACCOUNT_ID}:role/${this.config.allowAdminRole}`,
      );

      this.eksCluster.awsAuth.addRoleMapping(role, {
        groups: ['system:masters'],
        username: 'admin',
      });
    }

    // We want to create namespaces first, so the dependencies are resolved between SA and chart installation.
    // Do it sooner as there is a small delay between creation of namespace and creation of service account
    var ns: eks.KubernetesManifest[] = [];
    if (this.config.namespaces) {
      ns = this.createNamespaces(this.config.namespaces, this.eksCluster);
    }
    // We create profiles once all namespaces are created.
    var profiles: eks.FargateProfile[] = [];

    profiles = this.createFargateProfiles(this.eksCluster, vpc, ns);
    this.createWorkerNodeGroup(this.eksCluster, workerRole, vpc);


    // Enable cluster logging and Monitoring
    new CloudwatchLoggingNested(this, 'CloudWatchLoggingNested', this.eksCluster);

    // Exteranl DNS related stack
    // new PrometheusStack(this, 'PrometheusStack', eksCluster)

    new AwsLoadBalancerControllerNested(this, 'AwsLoadBalancerController', this.eksCluster);
    new AwsEFSCSIDriverNested(this, 'AwsEFSCSIDriverNested', this.eksCluster);
    new AwsSecretsCSIDriverNested(this, 'AwsSecretsCSIDriverNested', this.eksCluster);
    new ExternalDNSNested(this, 'ExternalDNS', this.eksCluster, this.config.externalDNS);

    // Create EFS as nested resource -- *** This will also deploy Storageclass to the cluster
    const s = new EFSNestedStack(
      this,
      'EFSNestedStack',
      this.config.clusterName,
      this.config.efs,
      vpc,
      this.eksCluster.clusterSecurityGroupId,
    );
    // Sometimes eks completion happens sooner. To ensure everything is finished before next item is executed
    ns.map(n => s.node.addDependency(n))

    // We create this as a storage class
    const sc = this.createStorageClass(s.efs.fileSystemId);

    // Install other bits like S3 , postgres etc which needs to be before the charts are installed
    this.createS3Buckets();

  }

  createStorageClass(fsID: string): KubernetesManifest {
    const sc = this.eksCluster.addManifest('EFSSC', {
      apiVersion: 'storage.k8s.io/v1',
      kind: 'StorageClass',
      metadata: {
        name: 'efs-sc',
      },
      provisioner: 'efs.csi.aws.com',
      parameters: {
        provisioningMode: 'efs-ap',
        fileSystemId: fsID,
        directoryPerms: '0700',
      },
    });

    return sc
  }

  getVPC(): ec2.IVpc {
    const vpcId = ssm.StringParameter.valueFromLookup(this, '/account/vpc/id');
    const vpc = ec2.Vpc.fromLookup(this, 'VPC', { vpcId: vpcId });

    return vpc;
  }

  createClusterHandlerRole(): Role {
    // When this is passed as role, EKS cluster successfully created(I think there is a bug in CDK).
    const policyStatement = new PolicyStatement({
      sid: 'FakePolciStatement',
      actions: ['logs:PutLogEvents'],
      effect: Effect.ALLOW,
      resources: ['*'],
    });

    const policyDocument = new PolicyDocument({
      statements: [policyStatement],
    });

    const clusterHandlerRole = new Role(this, `ClusterHandlerRole`, {
      roleName: `${Aws.STACK_NAME}-ClusterHandlerRole`,
      description: `Role for lambda handler`,
      assumedBy: new CompositePrincipal(new ServicePrincipal('lambda.amazonaws.com')),
      inlinePolicies: {
        AccessPolicy: policyDocument,
      },
    });

    return clusterHandlerRole;
  }

  createEKSCluster(vpc: ec2.IVpc, config: EKSStackConfig, clusterHandlerRole: iam.Role): eks.Cluster {
    const role = Role.fromRoleArn(
      this,
      'AdminRole',
      `arn:aws:iam::${Aws.ACCOUNT_ID}:role/${Aws.REGION}/${this.config.allowAdminRole}`,
    );

    const cluster = new eks.Cluster(this, 'Cluster', {
      clusterName: config.clusterName,
      vpc: vpc,
      defaultCapacity: 0, // we want to manage capacity our selves
      version: eks.KubernetesVersion.V1_21,
      clusterHandlerEnvironment: {
        roleArn: clusterHandlerRole.roleArn,
      },
      vpcSubnets: [{ subnetType: ec2.SubnetType.PRIVATE_WITH_NAT }],
      securityGroup: new ec2.SecurityGroup(this, 'ClusterControlPaneSecurityGroup', {
        vpc: vpc,
        description: 'Security group for EKS cluster control plane',
      }),
      // mastersRole: role // Or else we are unable to login
    });

    return cluster;
  }

  createWorkerNodeGroup(eksCluster: eks.Cluster, workerNodeRole: Role, vpc: IVpc) {
    eksCluster.addNodegroupCapacity(this.config.workerGroupName, {
      instanceTypes: convertStringToArray(this.config.workerInstanceTypes).map(
        (instanceType) => new ec2.InstanceType(instanceType),
      ),
      nodegroupName: this.config.workerGroupName,
      nodeRole: workerNodeRole,
      capacityType: this.config.workerCapacityType === 'SPOT' ? CapacityType.SPOT : CapacityType.ON_DEMAND,
      subnets: vpc.selectSubnets({ subnetType: ec2.SubnetType.PRIVATE_WITH_NAT }),
      desiredSize: Number(this.config.workerDesiredSize),
      minSize: Number(this.config.workerMinSize),
      maxSize: Number(this.config.workerMaxSize),
    });
  }

  // When using fargate for first time you may have to create the service linked role
  // aws iam create-service-linked-role \
  // --aws-service-name eks-fargate.amazonaws.com \
  // --description "Service-linked role to support fargate"

  createFargateProfiles(cluster: eks.Cluster, vpc: IVpc, ns: eks.KubernetesManifest[]): eks.FargateProfile[] {
    var profiles: eks.FargateProfile[] = [];
    this.config.fargateProfiles?.forEach((profile) => {

      const p = new eks.FargateProfile(this, profile.name, {
        cluster,
        selectors: profile.selectors,
        vpc: vpc,
        subnetSelection: vpc.selectSubnets({ subnetType: ec2.SubnetType.PRIVATE_WITH_NAT }),
      });

      profiles.push(p);

    });

    return profiles;
  }

  createNamespaces(selectors: Selector[], cluster: eks.Cluster): eks.KubernetesManifest[] {
    // Creates namespace  for fargate profiles

    var ns: eks.KubernetesManifest[] = [];

    selectors.forEach((selector) => {
      const namespace = {
        apiVersion: 'v1',
        kind: 'Namespace',
        metadata: { name: selector.namespace },
      };

      ns.push(
        new eks.KubernetesManifest(this, `${selector.namespace}NS`, {
          cluster,
          manifest: [namespace],
        }),
      );
    });

    return ns;
  }

  createS3Buckets(): void {
    this.config.s3Buckets?.forEach((bucket) => {
      const b = new Bucket(this, bucket.name, {
        bucketName: bucket.name,
        encryption: BucketEncryption.S3_MANAGED,
        enforceSSL: true,
        publicReadAccess: false,
        blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
        versioned: true,
        removalPolicy: RemovalPolicy.DESTROY,
      });
    });
  }
}

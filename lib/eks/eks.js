"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EKSCluster = void 0;
const iam = require("aws-cdk-lib/aws-iam");
const ec2 = require("aws-cdk-lib/aws-ec2");
const eks = require("aws-cdk-lib/aws-eks");
const ssm = require("aws-cdk-lib/aws-ssm");
const cdk = require("aws-cdk-lib");
const aws_cdk_lib_1 = require("aws-cdk-lib");
const aws_eks_1 = require("aws-cdk-lib/aws-eks");
const aws_iam_1 = require("aws-cdk-lib/aws-iam");
const common_1 = require("../utils/common");
const efs_1 = require("../efs/efs");
const efs_csi_driver_1 = require("./controllers/efs-csi-driver");
const load_balancer_controller_1 = require("./controllers/load-balancer-controller");
const cw_logging_monitoring_1 = require("./cw-logging-monitoring");
const external_dns_1 = require("./external-dns");
const aws_s3_1 = require("aws-cdk-lib/aws-s3");
const secrets_csi_driver_1 = require("./controllers/secrets-csi-driver");
class EKSCluster extends cdk.Stack {
    constructor(scope, id, config, props) {
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
            const role = aws_iam_1.Role.fromRoleArn(this, 'AdminRoleAuth', `arn:aws:iam::${aws_cdk_lib_1.Aws.ACCOUNT_ID}:role/${this.config.allowAdminRole}`);
            this.eksCluster.awsAuth.addRoleMapping(role, {
                groups: ['system:masters'],
                username: 'admin',
            });
        }
        // We want to create namespaces first, so the dependencies are resolved between SA and chart installation.
        // Do it sooner as there is a small delay between creation of namespace and creation of service account
        var ns = [];
        if (this.config.namespaces) {
            ns = this.createNamespaces(this.config.namespaces, this.eksCluster);
        }
        // We create profiles once all namespaces are created.
        var profiles = [];
        profiles = this.createFargateProfiles(this.eksCluster, vpc, ns);
        this.createWorkerNodeGroup(this.eksCluster, workerRole, vpc);
        // Enable cluster logging and Monitoring
        new cw_logging_monitoring_1.CloudwatchLoggingNested(this, 'CloudWatchLoggingNested', this.eksCluster);
        // Exteranl DNS related stack
        // new PrometheusStack(this, 'PrometheusStack', eksCluster)
        new load_balancer_controller_1.AwsLoadBalancerControllerNested(this, 'AwsLoadBalancerController', this.eksCluster);
        new efs_csi_driver_1.AwsEFSCSIDriverNested(this, 'AwsEFSCSIDriverNested', this.eksCluster);
        new secrets_csi_driver_1.AwsSecretsCSIDriverNested(this, 'AwsSecretsCSIDriverNested', this.eksCluster);
        new external_dns_1.ExternalDNSNested(this, 'ExternalDNS', this.eksCluster, this.config.externalDNS);
        // Create EFS as nested resource -- *** This will also deploy Storageclass to the cluster
        const s = new efs_1.EFSNestedStack(this, 'EFSNestedStack', this.config.clusterName, this.config.efs, vpc, this.eksCluster.clusterSecurityGroupId);
        // We create this as a storage class
        this.createStorageClass(s.efs.fileSystemId);
        // Install other bits like S3 , postgres etc which needs to be before the charts are installed
        this.createS3Buckets();
    }
    createStorageClass(fsID) {
        return this.eksCluster.addManifest('EFSSC', {
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
    }
    getVPC() {
        const vpcId = ssm.StringParameter.valueFromLookup(this, '/account/vpc/id');
        const vpc = ec2.Vpc.fromLookup(this, 'VPC', { vpcId: vpcId });
        return vpc;
    }
    createClusterHandlerRole() {
        // When this is passed as role, EKS cluster successfully created(I think there is a bug in CDK).
        const policyStatement = new aws_iam_1.PolicyStatement({
            sid: 'FakePolciStatement',
            actions: ['logs:PutLogEvents'],
            effect: aws_iam_1.Effect.ALLOW,
            resources: ['*'],
        });
        const policyDocument = new aws_iam_1.PolicyDocument({
            statements: [policyStatement],
        });
        const clusterHandlerRole = new aws_iam_1.Role(this, `ClusterHandlerRole`, {
            roleName: `${aws_cdk_lib_1.Aws.STACK_NAME}-ClusterHandlerRole`,
            description: `Role for lambda handler`,
            assumedBy: new aws_iam_1.CompositePrincipal(new aws_iam_1.ServicePrincipal('lambda.amazonaws.com')),
            inlinePolicies: {
                AccessPolicy: policyDocument,
            },
        });
        return clusterHandlerRole;
    }
    createEKSCluster(vpc, config, clusterHandlerRole) {
        const role = aws_iam_1.Role.fromRoleArn(this, 'AdminRole', `arn:aws:iam::${aws_cdk_lib_1.Aws.ACCOUNT_ID}:role/${aws_cdk_lib_1.Aws.REGION}/${this.config.allowAdminRole}`);
        const cluster = new eks.Cluster(this, 'Cluster', {
            clusterName: config.clusterName,
            vpc: vpc,
            defaultCapacity: 0,
            version: eks.KubernetesVersion.V1_21,
            clusterHandlerEnvironment: {
                roleArn: clusterHandlerRole.roleArn,
            },
            vpcSubnets: [{ subnetType: ec2.SubnetType.PRIVATE_WITH_NAT }],
            securityGroup: new ec2.SecurityGroup(this, 'ClusterControlPaneSecurityGroup', {
                vpc: vpc,
                description: 'Security group for EKS cluster control plane',
            }),
        });
        return cluster;
    }
    createWorkerNodeGroup(eksCluster, workerNodeRole, vpc) {
        eksCluster.addNodegroupCapacity(this.config.workerGroupName, {
            instanceTypes: common_1.convertStringToArray(this.config.workerInstanceTypes).map((instanceType) => new ec2.InstanceType(instanceType)),
            nodegroupName: this.config.workerGroupName,
            nodeRole: workerNodeRole,
            capacityType: this.config.workerCapacityType === 'SPOT' ? aws_eks_1.CapacityType.SPOT : aws_eks_1.CapacityType.ON_DEMAND,
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
    createFargateProfiles(cluster, vpc, ns) {
        var _a;
        var profiles = [];
        (_a = this.config.fargateProfiles) === null || _a === void 0 ? void 0 : _a.forEach((profile) => {
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
    createNamespaces(selectors, cluster) {
        // Creates namespace  for fargate profiles
        var ns = [];
        selectors.forEach((selector) => {
            const namespace = {
                apiVersion: 'v1',
                kind: 'Namespace',
                metadata: { name: selector.namespace },
            };
            ns.push(new eks.KubernetesManifest(this, `${selector.namespace}NS`, {
                cluster,
                manifest: [namespace],
            }));
        });
        return ns;
    }
    createS3Buckets() {
        var _a;
        (_a = this.config.s3Buckets) === null || _a === void 0 ? void 0 : _a.forEach((bucket) => {
            const b = new aws_s3_1.Bucket(this, bucket.name, {
                bucketName: bucket.name,
                encryption: aws_s3_1.BucketEncryption.S3_MANAGED,
                enforceSSL: true,
                publicReadAccess: false,
                blockPublicAccess: aws_s3_1.BlockPublicAccess.BLOCK_ALL,
                versioned: true,
                removalPolicy: aws_cdk_lib_1.RemovalPolicy.DESTROY,
            });
        });
    }
}
exports.EKSCluster = EKSCluster;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWtzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZWtzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLDJDQUE0QztBQUM1QywyQ0FBNEM7QUFDNUMsMkNBQTRDO0FBQzVDLDJDQUE0QztBQUM1QyxtQ0FBb0M7QUFDcEMsNkNBQWlEO0FBRWpELGlEQUE2RjtBQUM3RixpREFPNkI7QUFHN0IsNENBQXVEO0FBQ3ZELG9DQUE0QztBQUM1QyxpRUFBcUU7QUFDckUscUZBQXlGO0FBQ3pGLG1FQUFrRTtBQUNsRSxpREFBbUQ7QUFHbkQsK0NBQWlGO0FBQ2pGLHlFQUE2RTtBQUU3RSxNQUFhLFVBQVcsU0FBUSxHQUFHLENBQUMsS0FBSztJQUl2QyxZQUFZLEtBQWdCLEVBQUUsRUFBVSxFQUFFLE1BQXNCLEVBQUUsS0FBc0I7UUFDdEYsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDeEIsSUFBSSxDQUFDLE1BQU0sR0FBRyxNQUFNLENBQUM7UUFFckIsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO1FBRTFCLE1BQU0sa0JBQWtCLEdBQUcsSUFBSSxDQUFDLHdCQUF3QixFQUFFLENBQUM7UUFFM0Qsb0NBQW9DO1FBQ3BDLE1BQU0sVUFBVSxHQUFHLElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsZUFBZSxFQUFFO1lBQ3JELFNBQVMsRUFBRSxJQUFJLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxtQkFBbUIsQ0FBQztZQUN4RCxlQUFlLEVBQUU7Z0JBQ2YsR0FBRyxDQUFDLGFBQWEsQ0FBQyx3QkFBd0IsQ0FBQywyQkFBMkIsQ0FBQztnQkFDdkUsR0FBRyxDQUFDLGFBQWEsQ0FBQyx3QkFBd0IsQ0FBQyxvQ0FBb0MsQ0FBQztnQkFDaEYsR0FBRyxDQUFDLGFBQWEsQ0FBQyx3QkFBd0IsQ0FBQyxzQkFBc0IsQ0FBQztnQkFDbEUsR0FBRyxDQUFDLGFBQWEsQ0FBQyx3QkFB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Q0Y7QUFwT0QsZ0NBb09DIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IGlhbSA9IHJlcXVpcmUoJ2F3cy1jZGstbGliL2F3cy1pYW0nKTtcbmltcG9ydCBlYzIgPSByZXF1aXJlKCdhd3MtY2RrLWxpYi9hd3MtZWMyJyk7XG5pbXBvcnQgZWtzID0gcmVxdWlyZSgnYXdzLWNkay1saWIvYXdzLWVrcycpO1xuaW1wb3J0IHNzbSA9IHJlcXVpcmUoJ2F3cy1jZGstbGliL2F3cy1zc20nKTtcbmltcG9ydCBjZGsgPSByZXF1aXJlKCdhd3MtY2RrLWxpYicpO1xuaW1wb3J0IHsgQXdzLCBSZW1vdmFsUG9saWN5IH0gZnJvbSAnYXdzLWNkay1saWInO1xuaW1wb3J0IHsgSVZwYyB9IGZyb20gJ2F3cy1jZGstbGliL2F3cy1lYzInO1xuaW1wb3J0IHsgQ2FwYWNpdHlUeXBlLCBDbHVzdGVyLCBLdWJlcm5ldGVzTWFuaWZlc3QsIFRhaW50RWZmZWN0IH0gZnJvbSAnYXdzLWNkay1saWIvYXdzLWVrcyc7XG5pbXBvcnQge1xuICBDb21wb3NpdGVQcmluY2lwYWwsXG4gIEVmZmVjdCxcbiAgUG9saWN5RG9jdW1lbnQsXG4gIFBvbGljeVN0YXRlbWVudCxcbiAgUm9sZSxcbiAgU2VydmljZVByaW5jaXBhbCxcbn0gZnJvbSAnYXdzLWNkay1saWIvYXdzLWlhbSc7XG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tICdjb25zdHJ1Y3RzJztcbmltcG9ydCB7IEVLU1N0YWNrQ29uZmlnIH0gZnJvbSAnLi4vLi4vaW50ZXJmYWNlcy9saWIvZWtzL2ludGVyZmFjZXMnO1xuaW1wb3J0IHsgY29udmVydFN0cmluZ1RvQXJyYXkgfSBmcm9tICcuLi91dGlscy9jb21tb24nO1xuaW1wb3J0IHsgRUZTTmVzdGVkU3RhY2sgfSBmcm9tICcuLi9lZnMvZWZzJztcbmltcG9ydCB7IEF3c0VGU0NTSURyaXZlck5lc3RlZCB9IGZyb20gJy4vY29udHJvbGxlcnMvZWZzLWNzaS1kcml2ZXInO1xuaW1wb3J0IHsgQXdzTG9hZEJhbGFuY2VyQ29udHJvbGxlck5lc3RlZCB9IGZyb20gJy4vY29udHJvbGxlcnMvbG9hZC1iYWxhbmNlci1jb250cm9sbGVyJztcbmltcG9ydCB7IENsb3Vkd2F0Y2hMb2dnaW5nTmVzdGVkIH0gZnJvbSAnLi9jdy1sb2dnaW5nLW1vbml0b3JpbmcnO1xuaW1wb3J0IHsgRXh0ZXJuYWxETlNOZXN0ZWQgfSBmcm9tICcuL2V4dGVybmFsLWRucyc7XG5pbXBvcnQgeyBIZWxtQ2hhcnROZXN0ZWRTdGFjayB9IGZyb20gJy4vaGVsbS1jaGFydC1uZXN0ZWQnO1xuaW1wb3J0IHsgU2VsZWN0b3IgfSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtZWtzJztcbmltcG9ydCB7IEJsb2NrUHVibGljQWNjZXNzLCBCdWNrZXQsIEJ1Y2tldEVuY3J5cHRpb24gfSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtczMnO1xuaW1wb3J0IHsgQXdzU2VjcmV0c0NTSURyaXZlck5lc3RlZCB9IGZyb20gJy4vY29udHJvbGxlcnMvc2VjcmV0cy1jc2ktZHJpdmVyJztcblxuZXhwb3J0IGNsYXNzIEVLU0NsdXN0ZXIgZXh0ZW5kcyBjZGsuU3RhY2sge1xuICBjb25maWc6IEVLU1N0YWNrQ29uZmlnO1xuICBla3NDbHVzdGVyOiBDbHVzdGVyO1xuXG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcsIGNvbmZpZzogRUtTU3RhY2tDb25maWcsIHByb3BzPzogY2RrLlN0YWNrUHJvcHMpIHtcbiAgICBzdXBlcihzY29wZSwgaWQsIHByb3BzKTtcbiAgICB0aGlzLmNvbmZpZyA9IGNvbmZpZztcblxuICAgIGNvbnN0IHZwYyA9IHRoaXMuZ2V0VlBDKCk7XG5cbiAgICBjb25zdCBjbHVzdGVySGFuZGxlclJvbGUgPSB0aGlzLmNyZWF0ZUNsdXN0ZXJIYW5kbGVyUm9sZSgpO1xuXG4gICAgLy8gSUFNIHJvbGUgZm9yIG91ciBFQzIgd29ya2VyIG5vZGVzXG4gICAgY29uc3Qgd29ya2VyUm9sZSA9IG5ldyBpYW0uUm9sZSh0aGlzLCAnRUtTV29ya2VyUm9sZScsIHtcbiAgICAgIGFzc3VtZWRCeTogbmV3IGlhbS5TZXJ2aWNlUHJpbmNpcGFsKCdlYzIuYW1hem9uYXdzLmNvbScpLFxuICAgICAgbWFuYWdlZFBvbGljaWVzOiBbXG4gICAgICAgIGlhbS5NYW5hZ2VkUG9saWN5LmZyb21Bd3NNYW5hZ2VkUG9saWN5TmFtZSgnQW1hem9uRUtTV29ya2VyTm9kZVBvbGljeScpLFxuICAgICAgICBpYW0uTWFuYWdlZFBvbGljeS5mcm9tQXdzTWFuYWdlZFBvbGljeU5hbWUoJ0FtYXpvbkVDMkNvbnRhaW5lclJlZ2lzdHJ5UmVhZE9ubHknKSxcbiAgICAgICAgaWFtLk1hbmFnZWRQb2xpY3kuZnJvbUF3c01hbmFnZWRQb2xpY3lOYW1lKCdBbWF6b25FS1NfQ05JX1BvbGljeScpLFxuICAgICAgICBpYW0uTWFuYWdlZFBvbGljeS5mcm9tQXdzTWFuYWdlZFBvbGljeU5hbWUoJ0Nsb3VkV2F0Y2hBZ2VudFNlcnZlclBvbGljeScpLFxuICAgICAgXSxcbiAgICB9KTtcblxuICAgIHRoaXMuZWtzQ2x1c3RlciA9IHRoaXMuY3JlYXRlRUtTQ2x1c3Rlcih2cGMsIGNvbmZpZywgY2x1c3RlckhhbmRsZXJSb2xlKTtcblxuICAgIGlmICh0aGlzLmNvbmZpZy5hbGxvd0FkbWluUm9sZSkge1xuICAgICAgY29uc3Qgcm9sZSA9IFJvbGUuZnJvbVJvbGVBcm4oXG4gICAgICAgIHRoaXMsXG4gICAgICAgICdBZG1pblJvbGVBdXRoJyxcbiAgICAgICAgYGFybjphd3M6aWFtOjoke0F3cy5BQ0NPVU5UX0lEfTpyb2xlLyR7dGhpcy5jb25maWcuYWxsb3dBZG1pblJvbGV9YCxcbiAgICAgICk7XG5cbiAgICAgIHRoaXMuZWtzQ2x1c3Rlci5hd3NBdXRoLmFkZFJvbGVNYXBwaW5nKHJvbGUsIHtcbiAgICAgICAgZ3JvdXBzOiBbJ3N5c3RlbTptYXN0ZXJzJ10sXG4gICAgICAgIHVzZXJuYW1lOiAnYWRtaW4nLFxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgLy8gV2Ugd2FudCB0byBjcmVhdGUgbmFtZXNwYWNlcyBmaXJzdCwgc28gdGhlIGRlcGVuZGVuY2llcyBhcmUgcmVzb2x2ZWQgYmV0d2VlbiBTQSBhbmQgY2hhcnQgaW5zdGFsbGF0aW9uLlxuICAgIC8vIERvIGl0IHNvb25lciBhcyB0aGVyZSBpcyBhIHNtYWxsIGRlbGF5IGJldHdlZW4gY3JlYXRpb24gb2YgbmFtZXNwYWNlIGFuZCBjcmVhdGlvbiBvZiBzZXJ2aWNlIGFjY291bnRcbiAgICB2YXIgbnM6IGVrcy5LdWJlcm5ldGVzTWFuaWZlc3RbXSA9IFtdO1xuICAgIGlmICh0aGlzLmNvbmZpZy5uYW1lc3BhY2VzKSB7XG4gICAgICBucyA9IHRoaXMuY3JlYXRlTmFtZXNwYWNlcyh0aGlzLmNvbmZpZy5uYW1lc3BhY2VzLCB0aGlzLmVrc0NsdXN0ZXIpO1xuICAgIH1cbiAgICAvLyBXZSBjcmVhdGUgcHJvZmlsZXMgb25jZSBhbGwgbmFtZXNwYWNlcyBhcmUgY3JlYXRlZC5cbiAgICB2YXIgcHJvZmlsZXM6IGVrcy5GYXJnYXRlUHJvZmlsZVtdID0gW107XG5cbiAgICBwcm9maWxlcyA9IHRoaXMuY3JlYXRlRmFyZ2F0ZVByb2ZpbGVzKHRoaXMuZWtzQ2x1c3RlciwgdnBjLCBucyk7XG4gICAgdGhpcy5jcmVhdGVXb3JrZXJOb2RlR3JvdXAodGhpcy5la3NDbHVzdGVyLCB3b3JrZXJSb2xlLCB2cGMpO1xuXG5cbiAgICAvLyBFbmFibGUgY2x1c3RlciBsb2dnaW5nIGFuZCBNb25pdG9yaW5nXG4gICAgbmV3IENsb3Vkd2F0Y2hMb2dnaW5nTmVzdGVkKHRoaXMsICdDbG91ZFdhdGNoTG9nZ2luZ05lc3RlZCcsIHRoaXMuZWtzQ2x1c3Rlcik7XG5cbiAgICAvLyBFeHRlcmFubCBETlMgcmVsYXRlZCBzdGFja1xuICAgIC8vIG5ldyBQcm9tZXRoZXVzU3RhY2sodGhpcywgJ1Byb21ldGhldXNTdGFjaycsIGVrc0NsdXN0ZXIpXG5cbiAgICBuZXcgQXdzTG9hZEJhbGFuY2VyQ29udHJvbGxlck5lc3RlZCh0aGlzLCAnQXdzTG9hZEJhbGFuY2VyQ29udHJvbGxlcicsIHRoaXMuZWtzQ2x1c3Rlcik7XG4gICAgbmV3IEF3c0VGU0NTSURyaXZlck5lc3RlZCh0aGlzLCAnQXdzRUZTQ1NJRHJpdmVyTmVzdGVkJywgdGhpcy5la3NDbHVzdGVyKTtcbiAgICBuZXcgQXdzU2VjcmV0c0NTSURyaXZlck5lc3RlZCh0aGlzLCAnQXdzU2VjcmV0c0NTSURyaXZlck5lc3RlZCcsIHRoaXMuZWtzQ2x1c3Rlcik7XG4gICAgbmV3IEV4dGVybmFsRE5TTmVzdGVkKHRoaXMsICdFeHRlcm5hbEROUycsIHRoaXMuZWtzQ2x1c3RlciwgdGhpcy5jb25maWcuZXh0ZXJuYWxETlMpO1xuXG4gICAgLy8gQ3JlYXRlIEVGUyBhcyBuZXN0ZWQgcmVzb3VyY2UgLS0gKioqIFRoaXMgd2lsbCBhbHNvIGRlcGxveSBTdG9yYWdlY2xhc3MgdG8gdGhlIGNsdXN0ZXJcbiAgICBjb25zdCBzID0gbmV3IEVGU05lc3RlZFN0YWNrKFxuICAgICAgdGhpcyxcbiAgICAgICdFRlNOZXN0ZWRTdGFjaycsXG4gICAgICB0aGlzLmNvbmZpZy5jbHVzdGVyTmFtZSxcbiAgICAgIHRoaXMuY29uZmlnLmVmcyxcbiAgICAgIHZwYyxcbiAgICAgIHRoaXMuZWtzQ2x1c3Rlci5jbHVzdGVyU2VjdXJpdHlHcm91cElkLFxuICAgICk7XG5cbiAgICAvLyBXZSBjcmVhdGUgdGhpcyBhcyBhIHN0b3JhZ2UgY2xhc3NcbiAgICB0aGlzLmNyZWF0ZVN0b3JhZ2VDbGFzcyhzLmVmcy5maWxlU3lzdGVtSWQpO1xuXG4gICAgLy8gSW5zdGFsbCBvdGhlciBiaXRzIGxpa2UgUzMgLCBwb3N0Z3JlcyBldGMgd2hpY2ggbmVlZHMgdG8gYmUgYmVmb3JlIHRoZSBjaGFydHMgYXJlIGluc3RhbGxlZFxuICAgIHRoaXMuY3JlYXRlUzNCdWNrZXRzKCk7XG5cbiAgfVxuXG4gIGNyZWF0ZVN0b3JhZ2VDbGFzcyhmc0lEOiBzdHJpbmcpOiBLdWJlcm5ldGVzTWFuaWZlc3Qge1xuICAgIHJldHVybiB0aGlzLmVrc0NsdXN0ZXIuYWRkTWFuaWZlc3QoJ0VGU1NDJywge1xuICAgICAgYXBpVmVyc2lvbjogJ3N0b3JhZ2UuazhzLmlvL3YxJyxcbiAgICAgIGtpbmQ6ICdTdG9yYWdlQ2xhc3MnLFxuICAgICAgbWV0YWRhdGE6IHtcbiAgICAgICAgbmFtZTogJ2Vmcy1zYycsXG4gICAgICB9LFxuICAgICAgcHJvdmlzaW9uZXI6ICdlZnMuY3NpLmF3cy5jb20nLFxuICAgICAgcGFyYW1ldGVyczoge1xuICAgICAgICBwcm92aXNpb25pbmdNb2RlOiAnZWZzLWFwJyxcbiAgICAgICAgZmlsZVN5c3RlbUlkOiBmc0lELFxuICAgICAgICBkaXJlY3RvcnlQZXJtczogJzA3MDAnLFxuICAgICAgfSxcbiAgICB9KTtcbiAgfVxuXG4gIGdldFZQQygpOiBlYzIuSVZwYyB7XG4gICAgY29uc3QgdnBjSWQgPSBzc20uU3RyaW5nUGFyYW1ldGVyLnZhbHVlRnJvbUxvb2t1cCh0aGlzLCAnL2FjY291bnQvdnBjL2lkJyk7XG4gICAgY29uc3QgdnBjID0gZWMyLlZwYy5mcm9tTG9va3VwKHRoaXMsICdWUEMnLCB7IHZwY0lkOiB2cGNJZCB9KTtcblxuICAgIHJldHVybiB2cGM7XG4gIH1cblxuICBjcmVhdGVDbHVzdGVySGFuZGxlclJvbGUoKTogUm9sZSB7XG4gICAgLy8gV2hlbiB0aGlzIGlzIHBhc3NlZCBhcyByb2xlLCBFS1MgY2x1c3RlciBzdWNjZXNzZnVsbHkgY3JlYXRlZChJIHRoaW5rIHRoZXJlIGlzIGEgYnVnIGluIENESykuXG4gICAgY29uc3QgcG9saWN5U3RhdGVtZW50ID0gbmV3IFBvbGljeVN0YXRlbWVudCh7XG4gICAgICBzaWQ6ICdGYWtlUG9sY2lTdGF0ZW1lbnQnLFxuICAgICAgYWN0aW9uczogWydsb2dzOlB1dExvZ0V2ZW50cyddLFxuICAgICAgZWZmZWN0OiBFZmZlY3QuQUxMT1csXG4gICAgICByZXNvdXJjZXM6IFsnKiddLFxuICAgIH0pO1xuXG4gICAgY29uc3QgcG9saWN5RG9jdW1lbnQgPSBuZXcgUG9saWN5RG9jdW1lbnQoe1xuICAgICAgc3RhdGVtZW50czogW3BvbGljeVN0YXRlbWVudF0sXG4gICAgfSk7XG5cbiAgICBjb25zdCBjbHVzdGVySGFuZGxlclJvbGUgPSBuZXcgUm9sZSh0aGlzLCBgQ2x1c3RlckhhbmRsZXJSb2xlYCwge1xuICAgICAgcm9sZU5hbWU6IGAke0F3cy5TVEFDS19OQU1FfS1DbHVzdGVySGFuZGxlclJvbGVgLFxuICAgICAgZGVzY3JpcHRpb246IGBSb2xlIGZvciBsYW1iZGEgaGFuZGxlcmAsXG4gICAgICBhc3N1bWVkQnk6IG5ldyBDb21wb3NpdGVQcmluY2lwYWwobmV3IFNlcnZpY2VQcmluY2lwYWwoJ2xhbWJkYS5hbWF6b25hd3MuY29tJykpLFxuICAgICAgaW5saW5lUG9saWNpZXM6IHtcbiAgICAgICAgQWNjZXNzUG9saWN5OiBwb2xpY3lEb2N1bWVudCxcbiAgICAgIH0sXG4gICAgfSk7XG5cbiAgICByZXR1cm4gY2x1c3RlckhhbmRsZXJSb2xlO1xuICB9XG5cbiAgY3JlYXRlRUtTQ2x1c3Rlcih2cGM6IGVjMi5JVnBjLCBjb25maWc6IEVLU1N0YWNrQ29uZmlnLCBjbHVzdGVySGFuZGxlclJvbGU6IGlhbS5Sb2xlKTogZWtzLkNsdXN0ZXIge1xuICAgIGNvbnN0IHJvbGUgPSBSb2xlLmZyb21Sb2xlQXJuKFxuICAgICAgdGhpcyxcbiAgICAgICdBZG1pblJvbGUnLFxuICAgICAgYGFybjphd3M6aWFtOjoke0F3cy5BQ0NPVU5UX0lEfTpyb2xlLyR7QXdzLlJFR0lPTn0vJHt0aGlzLmNvbmZpZy5hbGxvd0FkbWluUm9sZX1gLFxuICAgICk7XG5cbiAgICBjb25zdCBjbHVzdGVyID0gbmV3IGVrcy5DbHVzdGVyKHRoaXMsICdDbHVzdGVyJywge1xuICAgICAgY2x1c3Rlck5hbWU6IGNvbmZpZy5jbHVzdGVyTmFtZSxcbiAgICAgIHZwYzogdnBjLFxuICAgICAgZGVmYXVsdENhcGFjaXR5OiAwLCAvLyB3ZSB3YW50IHRvIG1hbmFnZSBjYXBhY2l0eSBvdXIgc2VsdmVzXG4gICAgICB2ZXJzaW9uOiBla3MuS3ViZXJuZXRlc1ZlcnNpb24uVjFfMjEsXG4gICAgICBjbHVzdGVySGFuZGxlckVudmlyb25tZW50OiB7XG4gICAgICAgIHJvbGVBcm46IGNsdXN0ZXJIYW5kbGVyUm9sZS5yb2xlQXJuLFxuICAgICAgfSxcbiAgICAgIHZwY1N1Ym5ldHM6IFt7IHN1Ym5ldFR5cGU6IGVjMi5TdWJuZXRUeXBlLlBSSVZBVEVfV0lUSF9OQVQgfV0sXG4gICAgICBzZWN1cml0eUdyb3VwOiBuZXcgZWMyLlNlY3VyaXR5R3JvdXAodGhpcywgJ0NsdXN0ZXJDb250cm9sUGFuZVNlY3VyaXR5R3JvdXAnLCB7XG4gICAgICAgIHZwYzogdnBjLFxuICAgICAgICBkZXNjcmlwdGlvbjogJ1NlY3VyaXR5IGdyb3VwIGZvciBFS1MgY2x1c3RlciBjb250cm9sIHBsYW5lJyxcbiAgICAgIH0pLFxuICAgICAgLy8gbWFzdGVyc1JvbGU6IHJvbGUgLy8gT3IgZWxzZSB3ZSBhcmUgdW5hYmxlIHRvIGxvZ2luXG4gICAgfSk7XG5cbiAgICByZXR1cm4gY2x1c3RlcjtcbiAgfVxuXG4gIGNyZWF0ZVdvcmtlck5vZGVHcm91cChla3NDbHVzdGVyOiBla3MuQ2x1c3Rlciwgd29ya2VyTm9kZVJvbGU6IFJvbGUsIHZwYzogSVZwYykge1xuICAgIGVrc0NsdXN0ZXIuYWRkTm9kZWdyb3VwQ2FwYWNpdHkodGhpcy5jb25maWcud29ya2VyR3JvdXBOYW1lLCB7XG4gICAgICBpbnN0YW5jZVR5cGVzOiBjb252ZXJ0U3RyaW5nVG9BcnJheSh0aGlzLmNvbmZpZy53b3JrZXJJbnN0YW5jZVR5cGVzKS5tYXAoXG4gICAgICAgIChpbnN0YW5jZVR5cGUpID0+IG5ldyBlYzIuSW5zdGFuY2VUeXBlKGluc3RhbmNlVHlwZSksXG4gICAgICApLFxuICAgICAgbm9kZWdyb3VwTmFtZTogdGhpcy5jb25maWcud29ya2VyR3JvdXBOYW1lLFxuICAgICAgbm9kZVJvbGU6IHdvcmtlck5vZGVSb2xlLFxuICAgICAgY2FwYWNpdHlUeXBlOiB0aGlzLmNvbmZpZy53b3JrZXJDYXBhY2l0eVR5cGUgPT09ICdTUE9UJyA/IENhcGFjaXR5VHlwZS5TUE9UIDogQ2FwYWNpdHlUeXBlLk9OX0RFTUFORCxcbiAgICAgIHN1Ym5ldHM6IHZwYy5zZWxlY3RTdWJuZXRzKHsgc3VibmV0VHlwZTogZWMyLlN1Ym5ldFR5cGUuUFJJVkFURV9XSVRIX05BVCB9KSxcbiAgICAgIGRlc2lyZWRTaXplOiBOdW1iZXIodGhpcy5jb25maWcud29ya2VyRGVzaXJlZFNpemUpLFxuICAgICAgbWluU2l6ZTogTnVtYmVyKHRoaXMuY29uZmlnLndvcmtlck1pblNpemUpLFxuICAgICAgbWF4U2l6ZTogTnVtYmVyKHRoaXMuY29uZmlnLndvcmtlck1heFNpemUpLFxuICAgIH0pO1xuICB9XG5cbiAgLy8gV2hlbiB1c2luZyBmYXJnYXRlIGZvciBmaXJzdCB0aW1lIHlvdSBtYXkgaGF2ZSB0byBjcmVhdGUgdGhlIHNlcnZpY2UgbGlua2VkIHJvbGVcbiAgLy8gYXdzIGlhbSBjcmVhdGUtc2VydmljZS1saW5rZWQtcm9sZSBcXFxuICAvLyAtLWF3cy1zZXJ2aWNlLW5hbWUgZWtzLWZhcmdhdGUuYW1hem9uYXdzLmNvbSBcXFxuICAvLyAtLWRlc2NyaXB0aW9uIFwiU2VydmljZS1saW5rZWQgcm9sZSB0byBzdXBwb3J0IGZhcmdhdGVcIlxuXG4gIGNyZWF0ZUZhcmdhdGVQcm9maWxlcyhjbHVzdGVyOiBla3MuQ2x1c3RlciwgdnBjOiBJVnBjLCBuczogZWtzLkt1YmVybmV0ZXNNYW5pZmVzdFtdKTogZWtzLkZhcmdhdGVQcm9maWxlW10ge1xuICAgIHZhciBwcm9maWxlczogZWtzLkZhcmdhdGVQcm9maWxlW10gPSBbXTtcbiAgICB0aGlzLmNvbmZpZy5mYXJnYXRlUHJvZmlsZXM/LmZvckVhY2goKHByb2ZpbGUpID0+IHtcblxuICAgICAgY29uc3QgIHAgPSBuZXcgZWtzLkZhcmdhdGVQcm9maWxlKHRoaXMsIHByb2ZpbGUubmFtZSwge1xuICAgICAgICBjbHVzdGVyLFxuICAgICAgICBzZWxlY3RvcnM6IHByb2ZpbGUuc2VsZWN0b3JzLFxuICAgICAgICB2cGM6IHZwYyxcbiAgICAgICAgc3VibmV0U2VsZWN0aW9uOiB2cGMuc2VsZWN0U3VibmV0cyh7IHN1Ym5ldFR5cGU6IGVjMi5TdWJuZXRUeXBlLlBSSVZBVEVfV0lUSF9OQVQgfSksXG4gICAgICB9KTtcbiAgICAgIFxuICAgICAgcHJvZmlsZXMucHVzaChwKTtcblxuICAgIH0pO1xuXG4gICAgcmV0dXJuIHByb2ZpbGVzO1xuICB9XG5cbiAgY3JlYXRlTmFtZXNwYWNlcyhzZWxlY3RvcnM6IFNlbGVjdG9yW10sIGNsdXN0ZXI6IGVrcy5DbHVzdGVyKTogZWtzLkt1YmVybmV0ZXNNYW5pZmVzdFtdIHtcbiAgICAvLyBDcmVhdGVzIG5hbWVzcGFjZSAgZm9yIGZhcmdhdGUgcHJvZmlsZXNcblxuICAgIHZhciBuczogZWtzLkt1YmVybmV0ZXNNYW5pZmVzdFtdID0gW107XG5cbiAgICBzZWxlY3RvcnMuZm9yRWFjaCgoc2VsZWN0b3IpID0+IHtcbiAgICAgIGNvbnN0IG5hbWVzcGFjZSA9IHtcbiAgICAgICAgYXBpVmVyc2lvbjogJ3YxJyxcbiAgICAgICAga2luZDogJ05hbWVzcGFjZScsXG4gICAgICAgIG1ldGFkYXRhOiB7IG5hbWU6IHNlbGVjdG9yLm5hbWVzcGFjZSB9LFxuICAgICAgfTtcblxuICAgICAgbnMucHVzaChcbiAgICAgICAgbmV3IGVrcy5LdWJlcm5ldGVzTWFuaWZlc3QodGhpcywgYCR7c2VsZWN0b3IubmFtZXNwYWNlfU5TYCwge1xuICAgICAgICAgIGNsdXN0ZXIsXG4gICAgICAgICAgbWFuaWZlc3Q6IFtuYW1lc3BhY2VdLFxuICAgICAgICB9KSxcbiAgICAgICk7XG4gICAgfSk7XG5cbiAgICByZXR1cm4gbnM7XG4gIH1cblxuICBjcmVhdGVTM0J1Y2tldHMoKTogdm9pZCB7XG4gICAgdGhpcy5jb25maWcuczNCdWNrZXRzPy5mb3JFYWNoKChidWNrZXQpID0+IHtcbiAgICAgIGNvbnN0IGIgPSBuZXcgQnVja2V0KHRoaXMsIGJ1Y2tldC5uYW1lLCB7XG4gICAgICAgIGJ1Y2tldE5hbWU6IGJ1Y2tldC5uYW1lLFxuICAgICAgICBlbmNyeXB0aW9uOiBCdWNrZXRFbmNyeXB0aW9uLlMzX01BTkFHRUQsXG4gICAgICAgIGVuZm9yY2VTU0w6IHRydWUsXG4gICAgICAgIHB1YmxpY1JlYWRBY2Nlc3M6IGZhbHNlLFxuICAgICAgICBibG9ja1B1YmxpY0FjY2VzczogQmxvY2tQdWJsaWNBY2Nlc3MuQkxPQ0tfQUxMLFxuICAgICAgICB2ZXJzaW9uZWQ6IHRydWUsXG4gICAgICAgIHJlbW92YWxQb2xpY3k6IFJlbW92YWxQb2xpY3kuREVTVFJPWSxcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9XG59XG4iXX0=
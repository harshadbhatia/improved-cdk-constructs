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
        // Sometimes eks completion happens sooner. To ensure everything is finished before next item is executed
        ns.map(n => s.node.addDependency(n));
        // We create this as a storage class
        const sc = this.createStorageClass(s.efs.fileSystemId);
        // Install other bits like S3 , postgres etc which needs to be before the charts are installed
        this.createS3Buckets();
    }
    createStorageClass(fsID) {
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
        return sc;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWtzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZWtzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLDJDQUE0QztBQUM1QywyQ0FBNEM7QUFDNUMsMkNBQTRDO0FBQzVDLDJDQUE0QztBQUM1QyxtQ0FBb0M7QUFDcEMsNkNBQWlEO0FBRWpELGlEQUFnRjtBQUNoRixpREFPNkI7QUFHN0IsNENBQXVEO0FBQ3ZELG9DQUE0QztBQUM1QyxpRUFBcUU7QUFDckUscUZBQXlGO0FBQ3pGLG1FQUFrRTtBQUNsRSxpREFBbUQ7QUFFbkQsK0NBQWlGO0FBQ2pGLHlFQUE2RTtBQUU3RSxNQUFhLFVBQVcsU0FBUSxHQUFHLENBQUMsS0FBSztJQUl2QyxZQUFZLEtBQWdCLEVBQUUsRUFBVSxFQUFFLE1BQXNCLEVBQUUsS0FBc0I7UUFDdEYsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDeEIsSUFBSSxDQUFDLE1BQU0sR0FBRyxNQUFNLENBQUM7UUFFckIsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO1FBRTFCLE1BQU0sa0JBQWtCLEdBQUcsSUFBSSxDQUFDLHdCQUF3QixFQUFFLENBQUM7UUFFM0Qsb0NBQW9DO1FBQ3BDLE1BQU0sVUFBVSxHQUFHLElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsZUFBZSxFQUFFO1lBQ3JELFNBQVMsRUFBRSxJQUFJLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxtQkFBbUIsQ0FBQztZQUN4RCxlQUFlLEVBQUU7Z0JBQ2YsR0FBRyxDQUFDLGFBQWEsQ0FBQyx3QkFBd0IsQ0FBQywyQkFBMkIsQ0FBQztnQkFDdkUsR0FBRyxDQUFDLGFBQWEsQ0FBQyx3QkFBd0IsQ0FBQyxvQ0FBb0MsQ0FBQztnQkFDaEYsR0FBRyxDQUFDLGFBQWEsQ0FBQyx3QkFBd0IsQ0FBQyxzQkFBc0IsQ0FBQztnQkFDbEUsR0FBRyxDQUFDLGFBQWEsQ0FBQyx3QkFB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Q2hCLGdCQUFnQixFQUFFLEtBQUs7Z0JBQ3ZCLGlCQUFpQixFQUFFLDBCQUFpQixDQUFDLFNBQVM7Z0JBQzlDLFNBQVMsRUFBRSxJQUFJO2dCQUNmLGFBQWEsRUFBRSwyQkFBYSxDQUFDLE9BQU87YUFDckMsQ0FBQyxDQUFDO1FBQ0wsQ0FBQyxFQUFFO0lBQ0wsQ0FBQztDQUNGO0FBeE9ELGdDQXdPQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBpYW0gPSByZXF1aXJlKCdhd3MtY2RrLWxpYi9hd3MtaWFtJyk7XG5pbXBvcnQgZWMyID0gcmVxdWlyZSgnYXdzLWNkay1saWIvYXdzLWVjMicpO1xuaW1wb3J0IGVrcyA9IHJlcXVpcmUoJ2F3cy1jZGstbGliL2F3cy1la3MnKTtcbmltcG9ydCBzc20gPSByZXF1aXJlKCdhd3MtY2RrLWxpYi9hd3Mtc3NtJyk7XG5pbXBvcnQgY2RrID0gcmVxdWlyZSgnYXdzLWNkay1saWInKTtcbmltcG9ydCB7IEF3cywgUmVtb3ZhbFBvbGljeSB9IGZyb20gJ2F3cy1jZGstbGliJztcbmltcG9ydCB7IElWcGMgfSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtZWMyJztcbmltcG9ydCB7IENhcGFjaXR5VHlwZSwgQ2x1c3RlciwgS3ViZXJuZXRlc01hbmlmZXN0IH0gZnJvbSAnYXdzLWNkay1saWIvYXdzLWVrcyc7XG5pbXBvcnQge1xuICBDb21wb3NpdGVQcmluY2lwYWwsXG4gIEVmZmVjdCxcbiAgUG9saWN5RG9jdW1lbnQsXG4gIFBvbGljeVN0YXRlbWVudCxcbiAgUm9sZSxcbiAgU2VydmljZVByaW5jaXBhbCxcbn0gZnJvbSAnYXdzLWNkay1saWIvYXdzLWlhbSc7XG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tICdjb25zdHJ1Y3RzJztcbmltcG9ydCB7IEVLU1N0YWNrQ29uZmlnIH0gZnJvbSAnLi4vLi4vaW50ZXJmYWNlcy9saWIvZWtzL2ludGVyZmFjZXMnO1xuaW1wb3J0IHsgY29udmVydFN0cmluZ1RvQXJyYXkgfSBmcm9tICcuLi91dGlscy9jb21tb24nO1xuaW1wb3J0IHsgRUZTTmVzdGVkU3RhY2sgfSBmcm9tICcuLi9lZnMvZWZzJztcbmltcG9ydCB7IEF3c0VGU0NTSURyaXZlck5lc3RlZCB9IGZyb20gJy4vY29udHJvbGxlcnMvZWZzLWNzaS1kcml2ZXInO1xuaW1wb3J0IHsgQXdzTG9hZEJhbGFuY2VyQ29udHJvbGxlck5lc3RlZCB9IGZyb20gJy4vY29udHJvbGxlcnMvbG9hZC1iYWxhbmNlci1jb250cm9sbGVyJztcbmltcG9ydCB7IENsb3Vkd2F0Y2hMb2dnaW5nTmVzdGVkIH0gZnJvbSAnLi9jdy1sb2dnaW5nLW1vbml0b3JpbmcnO1xuaW1wb3J0IHsgRXh0ZXJuYWxETlNOZXN0ZWQgfSBmcm9tICcuL2V4dGVybmFsLWRucyc7XG5pbXBvcnQgeyBTZWxlY3RvciB9IGZyb20gJ2F3cy1jZGstbGliL2F3cy1la3MnO1xuaW1wb3J0IHsgQmxvY2tQdWJsaWNBY2Nlc3MsIEJ1Y2tldCwgQnVja2V0RW5jcnlwdGlvbiB9IGZyb20gJ2F3cy1jZGstbGliL2F3cy1zMyc7XG5pbXBvcnQgeyBBd3NTZWNyZXRzQ1NJRHJpdmVyTmVzdGVkIH0gZnJvbSAnLi9jb250cm9sbGVycy9zZWNyZXRzLWNzaS1kcml2ZXInO1xuXG5leHBvcnQgY2xhc3MgRUtTQ2x1c3RlciBleHRlbmRzIGNkay5TdGFjayB7XG4gIGNvbmZpZzogRUtTU3RhY2tDb25maWc7XG4gIGVrc0NsdXN0ZXI6IENsdXN0ZXI7XG5cbiAgY29uc3RydWN0b3Ioc2NvcGU6IENvbnN0cnVjdCwgaWQ6IHN0cmluZywgY29uZmlnOiBFS1NTdGFja0NvbmZpZywgcHJvcHM/OiBjZGsuU3RhY2tQcm9wcykge1xuICAgIHN1cGVyKHNjb3BlLCBpZCwgcHJvcHMpO1xuICAgIHRoaXMuY29uZmlnID0gY29uZmlnO1xuXG4gICAgY29uc3QgdnBjID0gdGhpcy5nZXRWUEMoKTtcblxuICAgIGNvbnN0IGNsdXN0ZXJIYW5kbGVyUm9sZSA9IHRoaXMuY3JlYXRlQ2x1c3RlckhhbmRsZXJSb2xlKCk7XG5cbiAgICAvLyBJQU0gcm9sZSBmb3Igb3VyIEVDMiB3b3JrZXIgbm9kZXNcbiAgICBjb25zdCB3b3JrZXJSb2xlID0gbmV3IGlhbS5Sb2xlKHRoaXMsICdFS1NXb3JrZXJSb2xlJywge1xuICAgICAgYXNzdW1lZEJ5OiBuZXcgaWFtLlNlcnZpY2VQcmluY2lwYWwoJ2VjMi5hbWF6b25hd3MuY29tJyksXG4gICAgICBtYW5hZ2VkUG9saWNpZXM6IFtcbiAgICAgICAgaWFtLk1hbmFnZWRQb2xpY3kuZnJvbUF3c01hbmFnZWRQb2xpY3lOYW1lKCdBbWF6b25FS1NXb3JrZXJOb2RlUG9saWN5JyksXG4gICAgICAgIGlhbS5NYW5hZ2VkUG9saWN5LmZyb21Bd3NNYW5hZ2VkUG9saWN5TmFtZSgnQW1hem9uRUMyQ29udGFpbmVyUmVnaXN0cnlSZWFkT25seScpLFxuICAgICAgICBpYW0uTWFuYWdlZFBvbGljeS5mcm9tQXdzTWFuYWdlZFBvbGljeU5hbWUoJ0FtYXpvbkVLU19DTklfUG9saWN5JyksXG4gICAgICAgIGlhbS5NYW5hZ2VkUG9saWN5LmZyb21Bd3NNYW5hZ2VkUG9saWN5TmFtZSgnQ2xvdWRXYXRjaEFnZW50U2VydmVyUG9saWN5JyksXG4gICAgICBdLFxuICAgIH0pO1xuXG4gICAgdGhpcy5la3NDbHVzdGVyID0gdGhpcy5jcmVhdGVFS1NDbHVzdGVyKHZwYywgY29uZmlnLCBjbHVzdGVySGFuZGxlclJvbGUpO1xuXG4gICAgaWYgKHRoaXMuY29uZmlnLmFsbG93QWRtaW5Sb2xlKSB7XG4gICAgICBjb25zdCByb2xlID0gUm9sZS5mcm9tUm9sZUFybihcbiAgICAgICAgdGhpcyxcbiAgICAgICAgJ0FkbWluUm9sZUF1dGgnLFxuICAgICAgICBgYXJuOmF3czppYW06OiR7QXdzLkFDQ09VTlRfSUR9OnJvbGUvJHt0aGlzLmNvbmZpZy5hbGxvd0FkbWluUm9sZX1gLFxuICAgICAgKTtcblxuICAgICAgdGhpcy5la3NDbHVzdGVyLmF3c0F1dGguYWRkUm9sZU1hcHBpbmcocm9sZSwge1xuICAgICAgICBncm91cHM6IFsnc3lzdGVtOm1hc3RlcnMnXSxcbiAgICAgICAgdXNlcm5hbWU6ICdhZG1pbicsXG4gICAgICB9KTtcbiAgICB9XG5cbiAgICAvLyBXZSB3YW50IHRvIGNyZWF0ZSBuYW1lc3BhY2VzIGZpcnN0LCBzbyB0aGUgZGVwZW5kZW5jaWVzIGFyZSByZXNvbHZlZCBiZXR3ZWVuIFNBIGFuZCBjaGFydCBpbnN0YWxsYXRpb24uXG4gICAgLy8gRG8gaXQgc29vbmVyIGFzIHRoZXJlIGlzIGEgc21hbGwgZGVsYXkgYmV0d2VlbiBjcmVhdGlvbiBvZiBuYW1lc3BhY2UgYW5kIGNyZWF0aW9uIG9mIHNlcnZpY2UgYWNjb3VudFxuICAgIHZhciBuczogZWtzLkt1YmVybmV0ZXNNYW5pZmVzdFtdID0gW107XG4gICAgaWYgKHRoaXMuY29uZmlnLm5hbWVzcGFjZXMpIHtcbiAgICAgIG5zID0gdGhpcy5jcmVhdGVOYW1lc3BhY2VzKHRoaXMuY29uZmlnLm5hbWVzcGFjZXMsIHRoaXMuZWtzQ2x1c3Rlcik7XG4gICAgfVxuICAgIC8vIFdlIGNyZWF0ZSBwcm9maWxlcyBvbmNlIGFsbCBuYW1lc3BhY2VzIGFyZSBjcmVhdGVkLlxuICAgIHZhciBwcm9maWxlczogZWtzLkZhcmdhdGVQcm9maWxlW10gPSBbXTtcblxuICAgIHByb2ZpbGVzID0gdGhpcy5jcmVhdGVGYXJnYXRlUHJvZmlsZXModGhpcy5la3NDbHVzdGVyLCB2cGMsIG5zKTtcbiAgICB0aGlzLmNyZWF0ZVdvcmtlck5vZGVHcm91cCh0aGlzLmVrc0NsdXN0ZXIsIHdvcmtlclJvbGUsIHZwYyk7XG5cblxuICAgIC8vIEVuYWJsZSBjbHVzdGVyIGxvZ2dpbmcgYW5kIE1vbml0b3JpbmdcbiAgICBuZXcgQ2xvdWR3YXRjaExvZ2dpbmdOZXN0ZWQodGhpcywgJ0Nsb3VkV2F0Y2hMb2dnaW5nTmVzdGVkJywgdGhpcy5la3NDbHVzdGVyKTtcblxuICAgIC8vIEV4dGVyYW5sIEROUyByZWxhdGVkIHN0YWNrXG4gICAgLy8gbmV3IFByb21ldGhldXNTdGFjayh0aGlzLCAnUHJvbWV0aGV1c1N0YWNrJywgZWtzQ2x1c3RlcilcblxuICAgIG5ldyBBd3NMb2FkQmFsYW5jZXJDb250cm9sbGVyTmVzdGVkKHRoaXMsICdBd3NMb2FkQmFsYW5jZXJDb250cm9sbGVyJywgdGhpcy5la3NDbHVzdGVyKTtcbiAgICBuZXcgQXdzRUZTQ1NJRHJpdmVyTmVzdGVkKHRoaXMsICdBd3NFRlNDU0lEcml2ZXJOZXN0ZWQnLCB0aGlzLmVrc0NsdXN0ZXIpO1xuICAgIG5ldyBBd3NTZWNyZXRzQ1NJRHJpdmVyTmVzdGVkKHRoaXMsICdBd3NTZWNyZXRzQ1NJRHJpdmVyTmVzdGVkJywgdGhpcy5la3NDbHVzdGVyKTtcbiAgICBuZXcgRXh0ZXJuYWxETlNOZXN0ZWQodGhpcywgJ0V4dGVybmFsRE5TJywgdGhpcy5la3NDbHVzdGVyLCB0aGlzLmNvbmZpZy5leHRlcm5hbEROUyk7XG5cbiAgICAvLyBDcmVhdGUgRUZTIGFzIG5lc3RlZCByZXNvdXJjZSAtLSAqKiogVGhpcyB3aWxsIGFsc28gZGVwbG95IFN0b3JhZ2VjbGFzcyB0byB0aGUgY2x1c3RlclxuICAgIGNvbnN0IHMgPSBuZXcgRUZTTmVzdGVkU3RhY2soXG4gICAgICB0aGlzLFxuICAgICAgJ0VGU05lc3RlZFN0YWNrJyxcbiAgICAgIHRoaXMuY29uZmlnLmNsdXN0ZXJOYW1lLFxuICAgICAgdGhpcy5jb25maWcuZWZzLFxuICAgICAgdnBjLFxuICAgICAgdGhpcy5la3NDbHVzdGVyLmNsdXN0ZXJTZWN1cml0eUdyb3VwSWQsXG4gICAgKTtcbiAgICAvLyBTb21ldGltZXMgZWtzIGNvbXBsZXRpb24gaGFwcGVucyBzb29uZXIuIFRvIGVuc3VyZSBldmVyeXRoaW5nIGlzIGZpbmlzaGVkIGJlZm9yZSBuZXh0IGl0ZW0gaXMgZXhlY3V0ZWRcbiAgICBucy5tYXAobiA9PiBzLm5vZGUuYWRkRGVwZW5kZW5jeShuKSlcblxuICAgIC8vIFdlIGNyZWF0ZSB0aGlzIGFzIGEgc3RvcmFnZSBjbGFzc1xuICAgIGNvbnN0IHNjID0gdGhpcy5jcmVhdGVTdG9yYWdlQ2xhc3Mocy5lZnMuZmlsZVN5c3RlbUlkKTtcblxuICAgIC8vIEluc3RhbGwgb3RoZXIgYml0cyBsaWtlIFMzICwgcG9zdGdyZXMgZXRjIHdoaWNoIG5lZWRzIHRvIGJlIGJlZm9yZSB0aGUgY2hhcnRzIGFyZSBpbnN0YWxsZWRcbiAgICB0aGlzLmNyZWF0ZVMzQnVja2V0cygpO1xuXG4gIH1cblxuICBjcmVhdGVTdG9yYWdlQ2xhc3MoZnNJRDogc3RyaW5nKTogS3ViZXJuZXRlc01hbmlmZXN0IHtcbiAgICBjb25zdCBzYyA9IHRoaXMuZWtzQ2x1c3Rlci5hZGRNYW5pZmVzdCgnRUZTU0MnLCB7XG4gICAgICBhcGlWZXJzaW9uOiAnc3RvcmFnZS5rOHMuaW8vdjEnLFxuICAgICAga2luZDogJ1N0b3JhZ2VDbGFzcycsXG4gICAgICBtZXRhZGF0YToge1xuICAgICAgICBuYW1lOiAnZWZzLXNjJyxcbiAgICAgIH0sXG4gICAgICBwcm92aXNpb25lcjogJ2Vmcy5jc2kuYXdzLmNvbScsXG4gICAgICBwYXJhbWV0ZXJzOiB7XG4gICAgICAgIHByb3Zpc2lvbmluZ01vZGU6ICdlZnMtYXAnLFxuICAgICAgICBmaWxlU3lzdGVtSWQ6IGZzSUQsXG4gICAgICAgIGRpcmVjdG9yeVBlcm1zOiAnMDcwMCcsXG4gICAgICB9LFxuICAgIH0pO1xuXG4gICAgcmV0dXJuIHNjXG4gIH1cblxuICBnZXRWUEMoKTogZWMyLklWcGMge1xuICAgIGNvbnN0IHZwY0lkID0gc3NtLlN0cmluZ1BhcmFtZXRlci52YWx1ZUZyb21Mb29rdXAodGhpcywgJy9hY2NvdW50L3ZwYy9pZCcpO1xuICAgIGNvbnN0IHZwYyA9IGVjMi5WcGMuZnJvbUxvb2t1cCh0aGlzLCAnVlBDJywgeyB2cGNJZDogdnBjSWQgfSk7XG5cbiAgICByZXR1cm4gdnBjO1xuICB9XG5cbiAgY3JlYXRlQ2x1c3RlckhhbmRsZXJSb2xlKCk6IFJvbGUge1xuICAgIC8vIFdoZW4gdGhpcyBpcyBwYXNzZWQgYXMgcm9sZSwgRUtTIGNsdXN0ZXIgc3VjY2Vzc2Z1bGx5IGNyZWF0ZWQoSSB0aGluayB0aGVyZSBpcyBhIGJ1ZyBpbiBDREspLlxuICAgIGNvbnN0IHBvbGljeVN0YXRlbWVudCA9IG5ldyBQb2xpY3lTdGF0ZW1lbnQoe1xuICAgICAgc2lkOiAnRmFrZVBvbGNpU3RhdGVtZW50JyxcbiAgICAgIGFjdGlvbnM6IFsnbG9nczpQdXRMb2dFdmVudHMnXSxcbiAgICAgIGVmZmVjdDogRWZmZWN0LkFMTE9XLFxuICAgICAgcmVzb3VyY2VzOiBbJyonXSxcbiAgICB9KTtcblxuICAgIGNvbnN0IHBvbGljeURvY3VtZW50ID0gbmV3IFBvbGljeURvY3VtZW50KHtcbiAgICAgIHN0YXRlbWVudHM6IFtwb2xpY3lTdGF0ZW1lbnRdLFxuICAgIH0pO1xuXG4gICAgY29uc3QgY2x1c3RlckhhbmRsZXJSb2xlID0gbmV3IFJvbGUodGhpcywgYENsdXN0ZXJIYW5kbGVyUm9sZWAsIHtcbiAgICAgIHJvbGVOYW1lOiBgJHtBd3MuU1RBQ0tfTkFNRX0tQ2x1c3RlckhhbmRsZXJSb2xlYCxcbiAgICAgIGRlc2NyaXB0aW9uOiBgUm9sZSBmb3IgbGFtYmRhIGhhbmRsZXJgLFxuICAgICAgYXNzdW1lZEJ5OiBuZXcgQ29tcG9zaXRlUHJpbmNpcGFsKG5ldyBTZXJ2aWNlUHJpbmNpcGFsKCdsYW1iZGEuYW1hem9uYXdzLmNvbScpKSxcbiAgICAgIGlubGluZVBvbGljaWVzOiB7XG4gICAgICAgIEFjY2Vzc1BvbGljeTogcG9saWN5RG9jdW1lbnQsXG4gICAgICB9LFxuICAgIH0pO1xuXG4gICAgcmV0dXJuIGNsdXN0ZXJIYW5kbGVyUm9sZTtcbiAgfVxuXG4gIGNyZWF0ZUVLU0NsdXN0ZXIodnBjOiBlYzIuSVZwYywgY29uZmlnOiBFS1NTdGFja0NvbmZpZywgY2x1c3RlckhhbmRsZXJSb2xlOiBpYW0uUm9sZSk6IGVrcy5DbHVzdGVyIHtcbiAgICBjb25zdCByb2xlID0gUm9sZS5mcm9tUm9sZUFybihcbiAgICAgIHRoaXMsXG4gICAgICAnQWRtaW5Sb2xlJyxcbiAgICAgIGBhcm46YXdzOmlhbTo6JHtBd3MuQUNDT1VOVF9JRH06cm9sZS8ke0F3cy5SRUdJT059LyR7dGhpcy5jb25maWcuYWxsb3dBZG1pblJvbGV9YCxcbiAgICApO1xuXG4gICAgY29uc3QgY2x1c3RlciA9IG5ldyBla3MuQ2x1c3Rlcih0aGlzLCAnQ2x1c3RlcicsIHtcbiAgICAgIGNsdXN0ZXJOYW1lOiBjb25maWcuY2x1c3Rlck5hbWUsXG4gICAgICB2cGM6IHZwYyxcbiAgICAgIGRlZmF1bHRDYXBhY2l0eTogMCwgLy8gd2Ugd2FudCB0byBtYW5hZ2UgY2FwYWNpdHkgb3VyIHNlbHZlc1xuICAgICAgdmVyc2lvbjogZWtzLkt1YmVybmV0ZXNWZXJzaW9uLlYxXzIxLFxuICAgICAgY2x1c3RlckhhbmRsZXJFbnZpcm9ubWVudDoge1xuICAgICAgICByb2xlQXJuOiBjbHVzdGVySGFuZGxlclJvbGUucm9sZUFybixcbiAgICAgIH0sXG4gICAgICB2cGNTdWJuZXRzOiBbeyBzdWJuZXRUeXBlOiBlYzIuU3VibmV0VHlwZS5QUklWQVRFX1dJVEhfTkFUIH1dLFxuICAgICAgc2VjdXJpdHlHcm91cDogbmV3IGVjMi5TZWN1cml0eUdyb3VwKHRoaXMsICdDbHVzdGVyQ29udHJvbFBhbmVTZWN1cml0eUdyb3VwJywge1xuICAgICAgICB2cGM6IHZwYyxcbiAgICAgICAgZGVzY3JpcHRpb246ICdTZWN1cml0eSBncm91cCBmb3IgRUtTIGNsdXN0ZXIgY29udHJvbCBwbGFuZScsXG4gICAgICB9KSxcbiAgICAgIC8vIG1hc3RlcnNSb2xlOiByb2xlIC8vIE9yIGVsc2Ugd2UgYXJlIHVuYWJsZSB0byBsb2dpblxuICAgIH0pO1xuXG4gICAgcmV0dXJuIGNsdXN0ZXI7XG4gIH1cblxuICBjcmVhdGVXb3JrZXJOb2RlR3JvdXAoZWtzQ2x1c3RlcjogZWtzLkNsdXN0ZXIsIHdvcmtlck5vZGVSb2xlOiBSb2xlLCB2cGM6IElWcGMpIHtcbiAgICBla3NDbHVzdGVyLmFkZE5vZGVncm91cENhcGFjaXR5KHRoaXMuY29uZmlnLndvcmtlckdyb3VwTmFtZSwge1xuICAgICAgaW5zdGFuY2VUeXBlczogY29udmVydFN0cmluZ1RvQXJyYXkodGhpcy5jb25maWcud29ya2VySW5zdGFuY2VUeXBlcykubWFwKFxuICAgICAgICAoaW5zdGFuY2VUeXBlKSA9PiBuZXcgZWMyLkluc3RhbmNlVHlwZShpbnN0YW5jZVR5cGUpLFxuICAgICAgKSxcbiAgICAgIG5vZGVncm91cE5hbWU6IHRoaXMuY29uZmlnLndvcmtlckdyb3VwTmFtZSxcbiAgICAgIG5vZGVSb2xlOiB3b3JrZXJOb2RlUm9sZSxcbiAgICAgIGNhcGFjaXR5VHlwZTogdGhpcy5jb25maWcud29ya2VyQ2FwYWNpdHlUeXBlID09PSAnU1BPVCcgPyBDYXBhY2l0eVR5cGUuU1BPVCA6IENhcGFjaXR5VHlwZS5PTl9ERU1BTkQsXG4gICAgICBzdWJuZXRzOiB2cGMuc2VsZWN0U3VibmV0cyh7IHN1Ym5ldFR5cGU6IGVjMi5TdWJuZXRUeXBlLlBSSVZBVEVfV0lUSF9OQVQgfSksXG4gICAgICBkZXNpcmVkU2l6ZTogTnVtYmVyKHRoaXMuY29uZmlnLndvcmtlckRlc2lyZWRTaXplKSxcbiAgICAgIG1pblNpemU6IE51bWJlcih0aGlzLmNvbmZpZy53b3JrZXJNaW5TaXplKSxcbiAgICAgIG1heFNpemU6IE51bWJlcih0aGlzLmNvbmZpZy53b3JrZXJNYXhTaXplKSxcbiAgICB9KTtcbiAgfVxuXG4gIC8vIFdoZW4gdXNpbmcgZmFyZ2F0ZSBmb3IgZmlyc3QgdGltZSB5b3UgbWF5IGhhdmUgdG8gY3JlYXRlIHRoZSBzZXJ2aWNlIGxpbmtlZCByb2xlXG4gIC8vIGF3cyBpYW0gY3JlYXRlLXNlcnZpY2UtbGlua2VkLXJvbGUgXFxcbiAgLy8gLS1hd3Mtc2VydmljZS1uYW1lIGVrcy1mYXJnYXRlLmFtYXpvbmF3cy5jb20gXFxcbiAgLy8gLS1kZXNjcmlwdGlvbiBcIlNlcnZpY2UtbGlua2VkIHJvbGUgdG8gc3VwcG9ydCBmYXJnYXRlXCJcblxuICBjcmVhdGVGYXJnYXRlUHJvZmlsZXMoY2x1c3RlcjogZWtzLkNsdXN0ZXIsIHZwYzogSVZwYywgbnM6IGVrcy5LdWJlcm5ldGVzTWFuaWZlc3RbXSk6IGVrcy5GYXJnYXRlUHJvZmlsZVtdIHtcbiAgICB2YXIgcHJvZmlsZXM6IGVrcy5GYXJnYXRlUHJvZmlsZVtdID0gW107XG4gICAgdGhpcy5jb25maWcuZmFyZ2F0ZVByb2ZpbGVzPy5mb3JFYWNoKChwcm9maWxlKSA9PiB7XG5cbiAgICAgIGNvbnN0IHAgPSBuZXcgZWtzLkZhcmdhdGVQcm9maWxlKHRoaXMsIHByb2ZpbGUubmFtZSwge1xuICAgICAgICBjbHVzdGVyLFxuICAgICAgICBzZWxlY3RvcnM6IHByb2ZpbGUuc2VsZWN0b3JzLFxuICAgICAgICB2cGM6IHZwYyxcbiAgICAgICAgc3VibmV0U2VsZWN0aW9uOiB2cGMuc2VsZWN0U3VibmV0cyh7IHN1Ym5ldFR5cGU6IGVjMi5TdWJuZXRUeXBlLlBSSVZBVEVfV0lUSF9OQVQgfSksXG4gICAgICB9KTtcblxuICAgICAgcHJvZmlsZXMucHVzaChwKTtcblxuICAgIH0pO1xuXG4gICAgcmV0dXJuIHByb2ZpbGVzO1xuICB9XG5cbiAgY3JlYXRlTmFtZXNwYWNlcyhzZWxlY3RvcnM6IFNlbGVjdG9yW10sIGNsdXN0ZXI6IGVrcy5DbHVzdGVyKTogZWtzLkt1YmVybmV0ZXNNYW5pZmVzdFtdIHtcbiAgICAvLyBDcmVhdGVzIG5hbWVzcGFjZSAgZm9yIGZhcmdhdGUgcHJvZmlsZXNcblxuICAgIHZhciBuczogZWtzLkt1YmVybmV0ZXNNYW5pZmVzdFtdID0gW107XG5cbiAgICBzZWxlY3RvcnMuZm9yRWFjaCgoc2VsZWN0b3IpID0+IHtcbiAgICAgIGNvbnN0IG5hbWVzcGFjZSA9IHtcbiAgICAgICAgYXBpVmVyc2lvbjogJ3YxJyxcbiAgICAgICAga2luZDogJ05hbWVzcGFjZScsXG4gICAgICAgIG1ldGFkYXRhOiB7IG5hbWU6IHNlbGVjdG9yLm5hbWVzcGFjZSB9LFxuICAgICAgfTtcblxuICAgICAgbnMucHVzaChcbiAgICAgICAgbmV3IGVrcy5LdWJlcm5ldGVzTWFuaWZlc3QodGhpcywgYCR7c2VsZWN0b3IubmFtZXNwYWNlfU5TYCwge1xuICAgICAgICAgIGNsdXN0ZXIsXG4gICAgICAgICAgbWFuaWZlc3Q6IFtuYW1lc3BhY2VdLFxuICAgICAgICB9KSxcbiAgICAgICk7XG4gICAgfSk7XG5cbiAgICByZXR1cm4gbnM7XG4gIH1cblxuICBjcmVhdGVTM0J1Y2tldHMoKTogdm9pZCB7XG4gICAgdGhpcy5jb25maWcuczNCdWNrZXRzPy5mb3JFYWNoKChidWNrZXQpID0+IHtcbiAgICAgIGNvbnN0IGIgPSBuZXcgQnVja2V0KHRoaXMsIGJ1Y2tldC5uYW1lLCB7XG4gICAgICAgIGJ1Y2tldE5hbWU6IGJ1Y2tldC5uYW1lLFxuICAgICAgICBlbmNyeXB0aW9uOiBCdWNrZXRFbmNyeXB0aW9uLlMzX01BTkFHRUQsXG4gICAgICAgIGVuZm9yY2VTU0w6IHRydWUsXG4gICAgICAgIHB1YmxpY1JlYWRBY2Nlc3M6IGZhbHNlLFxuICAgICAgICBibG9ja1B1YmxpY0FjY2VzczogQmxvY2tQdWJsaWNBY2Nlc3MuQkxPQ0tfQUxMLFxuICAgICAgICB2ZXJzaW9uZWQ6IHRydWUsXG4gICAgICAgIHJlbW92YWxQb2xpY3k6IFJlbW92YWxQb2xpY3kuREVTVFJPWSxcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9XG59XG4iXX0=
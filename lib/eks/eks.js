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
const helm_chart_nested_1 = require("./helm-chart-nested");
const serviceaccount_1 = require("./serviceaccount");
const aws_s3_1 = require("aws-cdk-lib/aws-s3");
const secrets_csi_driver_1 = require("./controllers/secrets-csi-driver");
class EKSCluster extends cdk.Stack {
    constructor(scope, id, config, updateSSMValuesInChart, props) {
        var _a, _b;
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
        var profiles = [];
        profiles = this.createFargateProfiles(this.eksCluster, vpc);
        this.createWorkerNodeGroup(this.eksCluster, workerRole, vpc);
        // We want to create namespaces first, so the dependencies are resolved between SA and chart installation.
        // Do it sooner as there is a small delay between creation of namespace and creation of service account
        var ns;
        if (this.config.namespaces) {
            ns = this.createNamespaces(this.config.namespaces, this.eksCluster);
            // Namespaces have depedency on existing fargate profiles as it creates namespaces as well
            profiles.forEach((p) => {
                ns.forEach((n) => {
                    n.node.addDependency(p);
                });
            });
        }
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
        // Install all charts as nested stacks - This is callback if we have numerous charts 
        updateSSMValuesInChart();
        (_a = this.config.charts) === null || _a === void 0 ? void 0 : _a.filter(function (a) {
            return a.enabled;
        }).forEach((chart) => {
            const c = new helm_chart_nested_1.HelmChartNestedStack(this, `${chart.name}Chart`, chart, this.eksCluster);
            // Add dependencies to naespace is always created beforehand
            ns.map((n) => {
                c.node.addDependency(n);
            });
        });
        // TODO add dyanmic updates for EFS and Subnets ids
        // Add service account for spcified namespaces
        // // Install all charts as nested stacks
        (_b = this.config.serviceAccounts) === null || _b === void 0 ? void 0 : _b.forEach((sa) => {
            const saStack = new serviceaccount_1.ServiceAccountStack(this, `${sa.name}-SA`, this.eksCluster, sa);
            // Add dependencies to naespace is always created beforehand
            ns.map((n) => {
                saStack.node.addDependency(n);
            });
        });
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
    createFargateProfiles(cluster, vpc) {
        var _a;
        var profiles = [];
        (_a = this.config.fargateProfiles) === null || _a === void 0 ? void 0 : _a.forEach((profile) => {
            this.createNamespaces(profile.selectors, cluster);
            profiles.push(new eks.FargateProfile(this, profile.name, {
                cluster,
                selectors: profile.selectors,
                vpc: vpc,
                subnetSelection: vpc.selectSubnets({ subnetType: ec2.SubnetType.PRIVATE_WITH_NAT }),
            }));
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWtzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZWtzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLDJDQUE0QztBQUM1QywyQ0FBNEM7QUFDNUMsMkNBQTRDO0FBQzVDLDJDQUE0QztBQUM1QyxtQ0FBb0M7QUFDcEMsNkNBQWlEO0FBRWpELGlEQUE2RjtBQUM3RixpREFPNkI7QUFHN0IsNENBQXVEO0FBQ3ZELG9DQUE0QztBQUM1QyxpRUFBcUU7QUFDckUscUZBQXlGO0FBQ3pGLG1FQUFrRTtBQUNsRSxpREFBbUQ7QUFDbkQsMkRBQTJEO0FBQzNELHFEQUF1RDtBQUV2RCwrQ0FBaUY7QUFDakYseUVBQTZFO0FBRTdFLE1BQWEsVUFBVyxTQUFRLEdBQUcsQ0FBQyxLQUFLO0lBSXZDLFlBQVksS0FBZ0IsRUFBRSxFQUFVLEVBQUUsTUFBc0IsRUFBRSxzQkFBa0MsRUFBRSxLQUFzQjs7UUFDMUgsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDeEIsSUFBSSxDQUFDLE1BQU0sR0FBRyxNQUFNLENBQUM7UUFFckIsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO1FBRTFCLE1BQU0sa0JBQWtCLEdBQUcsSUFBSSxDQUFDLHdCQUF3QixFQUFFLENBQUM7UUFFM0Qsb0NBQW9DO1FBQ3BDLE1BQU0sVUFBVSxHQUFHLElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsZUFBZSxFQUFFO1lBQ3JELFNBQVMsRUFBRSxJQUFJLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxtQkFBbUIsQ0FBQztZQUN4RCxlQUFlLEVBQUU7Z0JBQ2YsR0FBRyxDQUFDLGFBQWEsQ0FBQyx3QkFBd0IsQ0FBQywyQkFBMkIsQ0FBQztnQkFDdkUsR0FBRyxDQUFDLGFBQWEsQ0FBQyx3QkFBd0IsQ0FBQyxvQ0FBb0MsQ0FBQztnQkFDaEYsR0FBRyxDQUFDLGFBQWEsQ0FBQyx3QkFBd0IsQ0FBQyxzQkFB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LGlCQUFpQixFQUFFLDBCQUFpQixDQUFDLFNBQVM7Z0JBQzlDLFNBQVMsRUFBRSxJQUFJO2dCQUNmLGFBQWEsRUFBRSwyQkFBYSxDQUFDLE9BQU87YUFDckMsQ0FBQyxDQUFDO1FBQ0wsQ0FBQyxFQUFFO0lBQ0wsQ0FBQztDQUNGO0FBbFFELGdDQWtRQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBpYW0gPSByZXF1aXJlKCdhd3MtY2RrLWxpYi9hd3MtaWFtJyk7XG5pbXBvcnQgZWMyID0gcmVxdWlyZSgnYXdzLWNkay1saWIvYXdzLWVjMicpO1xuaW1wb3J0IGVrcyA9IHJlcXVpcmUoJ2F3cy1jZGstbGliL2F3cy1la3MnKTtcbmltcG9ydCBzc20gPSByZXF1aXJlKCdhd3MtY2RrLWxpYi9hd3Mtc3NtJyk7XG5pbXBvcnQgY2RrID0gcmVxdWlyZSgnYXdzLWNkay1saWInKTtcbmltcG9ydCB7IEF3cywgUmVtb3ZhbFBvbGljeSB9IGZyb20gJ2F3cy1jZGstbGliJztcbmltcG9ydCB7IElWcGMgfSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtZWMyJztcbmltcG9ydCB7IENhcGFjaXR5VHlwZSwgQ2x1c3RlciwgS3ViZXJuZXRlc01hbmlmZXN0LCBUYWludEVmZmVjdCB9IGZyb20gJ2F3cy1jZGstbGliL2F3cy1la3MnO1xuaW1wb3J0IHtcbiAgQ29tcG9zaXRlUHJpbmNpcGFsLFxuICBFZmZlY3QsXG4gIFBvbGljeURvY3VtZW50LFxuICBQb2xpY3lTdGF0ZW1lbnQsXG4gIFJvbGUsXG4gIFNlcnZpY2VQcmluY2lwYWwsXG59IGZyb20gJ2F3cy1jZGstbGliL2F3cy1pYW0nO1xuaW1wb3J0IHsgQ29uc3RydWN0IH0gZnJvbSAnY29uc3RydWN0cyc7XG5pbXBvcnQgeyBFS1NTdGFja0NvbmZpZyB9IGZyb20gJy4uLy4uL2ludGVyZmFjZXMvbGliL2Vrcy9pbnRlcmZhY2VzJztcbmltcG9ydCB7IGNvbnZlcnRTdHJpbmdUb0FycmF5IH0gZnJvbSAnLi4vdXRpbHMvY29tbW9uJztcbmltcG9ydCB7IEVGU05lc3RlZFN0YWNrIH0gZnJvbSAnLi4vZWZzL2Vmcyc7XG5pbXBvcnQgeyBBd3NFRlNDU0lEcml2ZXJOZXN0ZWQgfSBmcm9tICcuL2NvbnRyb2xsZXJzL2Vmcy1jc2ktZHJpdmVyJztcbmltcG9ydCB7IEF3c0xvYWRCYWxhbmNlckNvbnRyb2xsZXJOZXN0ZWQgfSBmcm9tICcuL2NvbnRyb2xsZXJzL2xvYWQtYmFsYW5jZXItY29udHJvbGxlcic7XG5pbXBvcnQgeyBDbG91ZHdhdGNoTG9nZ2luZ05lc3RlZCB9IGZyb20gJy4vY3ctbG9nZ2luZy1tb25pdG9yaW5nJztcbmltcG9ydCB7IEV4dGVybmFsRE5TTmVzdGVkIH0gZnJvbSAnLi9leHRlcm5hbC1kbnMnO1xuaW1wb3J0IHsgSGVsbUNoYXJ0TmVzdGVkU3RhY2sgfSBmcm9tICcuL2hlbG0tY2hhcnQtbmVzdGVkJztcbmltcG9ydCB7IFNlcnZpY2VBY2NvdW50U3RhY2sgfSBmcm9tICcuL3NlcnZpY2VhY2NvdW50JztcbmltcG9ydCB7IFNlbGVjdG9yIH0gZnJvbSAnYXdzLWNkay1saWIvYXdzLWVrcyc7XG5pbXBvcnQgeyBCbG9ja1B1YmxpY0FjY2VzcywgQnVja2V0LCBCdWNrZXRFbmNyeXB0aW9uIH0gZnJvbSAnYXdzLWNkay1saWIvYXdzLXMzJztcbmltcG9ydCB7IEF3c1NlY3JldHNDU0lEcml2ZXJOZXN0ZWQgfSBmcm9tICcuL2NvbnRyb2xsZXJzL3NlY3JldHMtY3NpLWRyaXZlcic7XG5cbmV4cG9ydCBjbGFzcyBFS1NDbHVzdGVyIGV4dGVuZHMgY2RrLlN0YWNrIHtcbiAgY29uZmlnOiBFS1NTdGFja0NvbmZpZztcbiAgZWtzQ2x1c3RlcjogQ2x1c3RlcjtcblxuICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nLCBjb25maWc6IEVLU1N0YWNrQ29uZmlnLCB1cGRhdGVTU01WYWx1ZXNJbkNoYXJ0OiAoKSA9PiB2b2lkLCBwcm9wcz86IGNkay5TdGFja1Byb3BzLCApIHtcbiAgICBzdXBlcihzY29wZSwgaWQsIHByb3BzKTtcbiAgICB0aGlzLmNvbmZpZyA9IGNvbmZpZztcblxuICAgIGNvbnN0IHZwYyA9IHRoaXMuZ2V0VlBDKCk7XG5cbiAgICBjb25zdCBjbHVzdGVySGFuZGxlclJvbGUgPSB0aGlzLmNyZWF0ZUNsdXN0ZXJIYW5kbGVyUm9sZSgpO1xuXG4gICAgLy8gSUFNIHJvbGUgZm9yIG91ciBFQzIgd29ya2VyIG5vZGVzXG4gICAgY29uc3Qgd29ya2VyUm9sZSA9IG5ldyBpYW0uUm9sZSh0aGlzLCAnRUtTV29ya2VyUm9sZScsIHtcbiAgICAgIGFzc3VtZWRCeTogbmV3IGlhbS5TZXJ2aWNlUHJpbmNpcGFsKCdlYzIuYW1hem9uYXdzLmNvbScpLFxuICAgICAgbWFuYWdlZFBvbGljaWVzOiBbXG4gICAgICAgIGlhbS5NYW5hZ2VkUG9saWN5LmZyb21Bd3NNYW5hZ2VkUG9saWN5TmFtZSgnQW1hem9uRUtTV29ya2VyTm9kZVBvbGljeScpLFxuICAgICAgICBpYW0uTWFuYWdlZFBvbGljeS5mcm9tQXdzTWFuYWdlZFBvbGljeU5hbWUoJ0FtYXpvbkVDMkNvbnRhaW5lclJlZ2lzdHJ5UmVhZE9ubHknKSxcbiAgICAgICAgaWFtLk1hbmFnZWRQb2xpY3kuZnJvbUF3c01hbmFnZWRQb2xpY3lOYW1lKCdBbWF6b25FS1NfQ05JX1BvbGljeScpLFxuICAgICAgICBpYW0uTWFuYWdlZFBvbGljeS5mcm9tQXdzTWFuYWdlZFBvbGljeU5hbWUoJ0Nsb3VkV2F0Y2hBZ2VudFNlcnZlclBvbGljeScpLFxuICAgICAgXSxcbiAgICB9KTtcblxuICAgIHRoaXMuZWtzQ2x1c3RlciA9IHRoaXMuY3JlYXRlRUtTQ2x1c3Rlcih2cGMsIGNvbmZpZywgY2x1c3RlckhhbmRsZXJSb2xlKTtcblxuICAgIGlmICh0aGlzLmNvbmZpZy5hbGxvd0FkbWluUm9sZSkge1xuICAgICAgY29uc3Qgcm9sZSA9IFJvbGUuZnJvbVJvbGVBcm4oXG4gICAgICAgIHRoaXMsXG4gICAgICAgICdBZG1pblJvbGVBdXRoJyxcbiAgICAgICAgYGFybjphd3M6aWFtOjoke0F3cy5BQ0NPVU5UX0lEfTpyb2xlLyR7dGhpcy5jb25maWcuYWxsb3dBZG1pblJvbGV9YCxcbiAgICAgICk7XG5cbiAgICAgIHRoaXMuZWtzQ2x1c3Rlci5hd3NBdXRoLmFkZFJvbGVNYXBwaW5nKHJvbGUsIHtcbiAgICAgICAgZ3JvdXBzOiBbJ3N5c3RlbTptYXN0ZXJzJ10sXG4gICAgICAgIHVzZXJuYW1lOiAnYWRtaW4nLFxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgdmFyIHByb2ZpbGVzOiBla3MuRmFyZ2F0ZVByb2ZpbGVbXSA9IFtdO1xuXG4gICAgcHJvZmlsZXMgPSB0aGlzLmNyZWF0ZUZhcmdhdGVQcm9maWxlcyh0aGlzLmVrc0NsdXN0ZXIsIHZwYyk7XG4gICAgdGhpcy5jcmVhdGVXb3JrZXJOb2RlR3JvdXAodGhpcy5la3NDbHVzdGVyLCB3b3JrZXJSb2xlLCB2cGMpO1xuXG4gICAgLy8gV2Ugd2FudCB0byBjcmVhdGUgbmFtZXNwYWNlcyBmaXJzdCwgc28gdGhlIGRlcGVuZGVuY2llcyBhcmUgcmVzb2x2ZWQgYmV0d2VlbiBTQSBhbmQgY2hhcnQgaW5zdGFsbGF0aW9uLlxuICAgIC8vIERvIGl0IHNvb25lciBhcyB0aGVyZSBpcyBhIHNtYWxsIGRlbGF5IGJldHdlZW4gY3JlYXRpb24gb2YgbmFtZXNwYWNlIGFuZCBjcmVhdGlvbiBvZiBzZXJ2aWNlIGFjY291bnRcbiAgICB2YXIgbnM6IGVrcy5LdWJlcm5ldGVzTWFuaWZlc3RbXTtcbiAgICBpZiAodGhpcy5jb25maWcubmFtZXNwYWNlcykge1xuICAgICAgbnMgPSB0aGlzLmNyZWF0ZU5hbWVzcGFjZXModGhpcy5jb25maWcubmFtZXNwYWNlcywgdGhpcy5la3NDbHVzdGVyKTtcblxuICAgICAgLy8gTmFtZXNwYWNlcyBoYXZlIGRlcGVkZW5jeSBvbiBleGlzdGluZyBmYXJnYXRlIHByb2ZpbGVzIGFzIGl0IGNyZWF0ZXMgbmFtZXNwYWNlcyBhcyB3ZWxsXG4gICAgICBwcm9maWxlcy5mb3JFYWNoKChwKSA9PiB7XG4gICAgICAgIG5zLmZvckVhY2goKG4pID0+IHtcbiAgICAgICAgICBuLm5vZGUuYWRkRGVwZW5kZW5jeShwKTtcbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICAvLyBFbmFibGUgY2x1c3RlciBsb2dnaW5nIGFuZCBNb25pdG9yaW5nXG4gICAgbmV3IENsb3Vkd2F0Y2hMb2dnaW5nTmVzdGVkKHRoaXMsICdDbG91ZFdhdGNoTG9nZ2luZ05lc3RlZCcsIHRoaXMuZWtzQ2x1c3Rlcik7XG5cbiAgICAvLyBFeHRlcmFubCBETlMgcmVsYXRlZCBzdGFja1xuICAgIC8vIG5ldyBQcm9tZXRoZXVzU3RhY2sodGhpcywgJ1Byb21ldGhldXNTdGFjaycsIGVrc0NsdXN0ZXIpXG5cbiAgICBuZXcgQXdzTG9hZEJhbGFuY2VyQ29udHJvbGxlck5lc3RlZCh0aGlzLCAnQXdzTG9hZEJhbGFuY2VyQ29udHJvbGxlcicsIHRoaXMuZWtzQ2x1c3Rlcik7XG4gICAgbmV3IEF3c0VGU0NTSURyaXZlck5lc3RlZCh0aGlzLCAnQXdzRUZTQ1NJRHJpdmVyTmVzdGVkJywgdGhpcy5la3NDbHVzdGVyKTtcbiAgICBuZXcgQXdzU2VjcmV0c0NTSURyaXZlck5lc3RlZCh0aGlzLCAnQXdzU2VjcmV0c0NTSURyaXZlck5lc3RlZCcsIHRoaXMuZWtzQ2x1c3Rlcik7XG4gICAgbmV3IEV4dGVybmFsRE5TTmVzdGVkKHRoaXMsICdFeHRlcm5hbEROUycsIHRoaXMuZWtzQ2x1c3RlciwgdGhpcy5jb25maWcuZXh0ZXJuYWxETlMpO1xuXG4gICAgLy8gQ3JlYXRlIEVGUyBhcyBuZXN0ZWQgcmVzb3VyY2UgLS0gKioqIFRoaXMgd2lsbCBhbHNvIGRlcGxveSBTdG9yYWdlY2xhc3MgdG8gdGhlIGNsdXN0ZXJcbiAgICBjb25zdCBzID0gbmV3IEVGU05lc3RlZFN0YWNrKFxuICAgICAgdGhpcyxcbiAgICAgICdFRlNOZXN0ZWRTdGFjaycsXG4gICAgICB0aGlzLmNvbmZpZy5jbHVzdGVyTmFtZSxcbiAgICAgIHRoaXMuY29uZmlnLmVmcyxcbiAgICAgIHZwYyxcbiAgICAgIHRoaXMuZWtzQ2x1c3Rlci5jbHVzdGVyU2VjdXJpdHlHcm91cElkLFxuICAgICk7XG5cbiAgICAvLyBXZSBjcmVhdGUgdGhpcyBhcyBhIHN0b3JhZ2UgY2xhc3NcbiAgICB0aGlzLmNyZWF0ZVN0b3JhZ2VDbGFzcyhzLmVmcy5maWxlU3lzdGVtSWQpO1xuXG4gICAgLy8gSW5zdGFsbCBvdGhlciBiaXRzIGxpa2UgUzMgLCBwb3N0Z3JlcyBldGMgd2hpY2ggbmVlZHMgdG8gYmUgYmVmb3JlIHRoZSBjaGFydHMgYXJlIGluc3RhbGxlZFxuICAgIHRoaXMuY3JlYXRlUzNCdWNrZXRzKCk7XG5cbiAgICAvLyBJbnN0YWxsIGFsbCBjaGFydHMgYXMgbmVzdGVkIHN0YWNrcyAtIFRoaXMgaXMgY2FsbGJhY2sgaWYgd2UgaGF2ZSBudW1lcm91cyBjaGFydHMgXG4gICAgdXBkYXRlU1NNVmFsdWVzSW5DaGFydCgpO1xuXG4gICAgdGhpcy5jb25maWcuY2hhcnRzXG4gICAgICA/LmZpbHRlcihmdW5jdGlvbiAoYSkge1xuICAgICAgICByZXR1cm4gYS5lbmFibGVkO1xuICAgICAgfSlcbiAgICAgIC5mb3JFYWNoKChjaGFydCkgPT4ge1xuICAgICAgICBjb25zdCBjID0gbmV3IEhlbG1DaGFydE5lc3RlZFN0YWNrKHRoaXMsIGAke2NoYXJ0Lm5hbWV9Q2hhcnRgLCBjaGFydCwgdGhpcy5la3NDbHVzdGVyKTtcbiAgICAgICAgLy8gQWRkIGRlcGVuZGVuY2llcyB0byBuYWVzcGFjZSBpcyBhbHdheXMgY3JlYXRlZCBiZWZvcmVoYW5kXG4gICAgICAgIG5zLm1hcCgobikgPT4ge1xuICAgICAgICAgIGMubm9kZS5hZGREZXBlbmRlbmN5KG4pO1xuICAgICAgICB9KTtcbiAgICAgIH0pO1xuXG4gICAgLy8gVE9ETyBhZGQgZHlhbm1pYyB1cGRhdGVzIGZvciBFRlMgYW5kIFN1Ym5ldHMgaWRzXG4gICAgLy8gQWRkIHNlcnZpY2UgYWNjb3VudCBmb3Igc3BjaWZpZWQgbmFtZXNwYWNlc1xuICAgIC8vIC8vIEluc3RhbGwgYWxsIGNoYXJ0cyBhcyBuZXN0ZWQgc3RhY2tzXG4gICAgdGhpcy5jb25maWcuc2VydmljZUFjY291bnRzPy5mb3JFYWNoKChzYSkgPT4ge1xuICAgICAgY29uc3Qgc2FTdGFjayA9IG5ldyBTZXJ2aWNlQWNjb3VudFN0YWNrKHRoaXMsIGAke3NhLm5hbWV9LVNBYCwgdGhpcy5la3NDbHVzdGVyLCBzYSk7XG4gICAgICAvLyBBZGQgZGVwZW5kZW5jaWVzIHRvIG5hZXNwYWNlIGlzIGFsd2F5cyBjcmVhdGVkIGJlZm9yZWhhbmRcbiAgICAgIG5zLm1hcCgobikgPT4ge1xuICAgICAgICBzYVN0YWNrLm5vZGUuYWRkRGVwZW5kZW5jeShuKTtcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9XG5cbiAgY3JlYXRlU3RvcmFnZUNsYXNzKGZzSUQ6IHN0cmluZyk6IEt1YmVybmV0ZXNNYW5pZmVzdCB7XG4gICAgcmV0dXJuIHRoaXMuZWtzQ2x1c3Rlci5hZGRNYW5pZmVzdCgnRUZTU0MnLCB7XG4gICAgICBhcGlWZXJzaW9uOiAnc3RvcmFnZS5rOHMuaW8vdjEnLFxuICAgICAga2luZDogJ1N0b3JhZ2VDbGFzcycsXG4gICAgICBtZXRhZGF0YToge1xuICAgICAgICBuYW1lOiAnZWZzLXNjJyxcbiAgICAgIH0sXG4gICAgICBwcm92aXNpb25lcjogJ2Vmcy5jc2kuYXdzLmNvbScsXG4gICAgICBwYXJhbWV0ZXJzOiB7XG4gICAgICAgIHByb3Zpc2lvbmluZ01vZGU6ICdlZnMtYXAnLFxuICAgICAgICBmaWxlU3lzdGVtSWQ6IGZzSUQsXG4gICAgICAgIGRpcmVjdG9yeVBlcm1zOiAnMDcwMCcsXG4gICAgICB9LFxuICAgIH0pO1xuICB9XG5cbiAgZ2V0VlBDKCk6IGVjMi5JVnBjIHtcbiAgICBjb25zdCB2cGNJZCA9IHNzbS5TdHJpbmdQYXJhbWV0ZXIudmFsdWVGcm9tTG9va3VwKHRoaXMsICcvYWNjb3VudC92cGMvaWQnKTtcbiAgICBjb25zdCB2cGMgPSBlYzIuVnBjLmZyb21Mb29rdXAodGhpcywgJ1ZQQycsIHsgdnBjSWQ6IHZwY0lkIH0pO1xuXG4gICAgcmV0dXJuIHZwYztcbiAgfVxuXG4gIGNyZWF0ZUNsdXN0ZXJIYW5kbGVyUm9sZSgpOiBSb2xlIHtcbiAgICAvLyBXaGVuIHRoaXMgaXMgcGFzc2VkIGFzIHJvbGUsIEVLUyBjbHVzdGVyIHN1Y2Nlc3NmdWxseSBjcmVhdGVkKEkgdGhpbmsgdGhlcmUgaXMgYSBidWcgaW4gQ0RLKS5cbiAgICBjb25zdCBwb2xpY3lTdGF0ZW1lbnQgPSBuZXcgUG9saWN5U3RhdGVtZW50KHtcbiAgICAgIHNpZDogJ0Zha2VQb2xjaVN0YXRlbWVudCcsXG4gICAgICBhY3Rpb25zOiBbJ2xvZ3M6UHV0TG9nRXZlbnRzJ10sXG4gICAgICBlZmZlY3Q6IEVmZmVjdC5BTExPVyxcbiAgICAgIHJlc291cmNlczogWycqJ10sXG4gICAgfSk7XG5cbiAgICBjb25zdCBwb2xpY3lEb2N1bWVudCA9IG5ldyBQb2xpY3lEb2N1bWVudCh7XG4gICAgICBzdGF0ZW1lbnRzOiBbcG9saWN5U3RhdGVtZW50XSxcbiAgICB9KTtcblxuICAgIGNvbnN0IGNsdXN0ZXJIYW5kbGVyUm9sZSA9IG5ldyBSb2xlKHRoaXMsIGBDbHVzdGVySGFuZGxlclJvbGVgLCB7XG4gICAgICByb2xlTmFtZTogYCR7QXdzLlNUQUNLX05BTUV9LUNsdXN0ZXJIYW5kbGVyUm9sZWAsXG4gICAgICBkZXNjcmlwdGlvbjogYFJvbGUgZm9yIGxhbWJkYSBoYW5kbGVyYCxcbiAgICAgIGFzc3VtZWRCeTogbmV3IENvbXBvc2l0ZVByaW5jaXBhbChuZXcgU2VydmljZVByaW5jaXBhbCgnbGFtYmRhLmFtYXpvbmF3cy5jb20nKSksXG4gICAgICBpbmxpbmVQb2xpY2llczoge1xuICAgICAgICBBY2Nlc3NQb2xpY3k6IHBvbGljeURvY3VtZW50LFxuICAgICAgfSxcbiAgICB9KTtcblxuICAgIHJldHVybiBjbHVzdGVySGFuZGxlclJvbGU7XG4gIH1cblxuICBjcmVhdGVFS1NDbHVzdGVyKHZwYzogZWMyLklWcGMsIGNvbmZpZzogRUtTU3RhY2tDb25maWcsIGNsdXN0ZXJIYW5kbGVyUm9sZTogaWFtLlJvbGUpOiBla3MuQ2x1c3RlciB7XG4gICAgY29uc3Qgcm9sZSA9IFJvbGUuZnJvbVJvbGVBcm4oXG4gICAgICB0aGlzLFxuICAgICAgJ0FkbWluUm9sZScsXG4gICAgICBgYXJuOmF3czppYW06OiR7QXdzLkFDQ09VTlRfSUR9OnJvbGUvJHtBd3MuUkVHSU9OfS8ke3RoaXMuY29uZmlnLmFsbG93QWRtaW5Sb2xlfWAsXG4gICAgKTtcblxuICAgIGNvbnN0IGNsdXN0ZXIgPSBuZXcgZWtzLkNsdXN0ZXIodGhpcywgJ0NsdXN0ZXInLCB7XG4gICAgICBjbHVzdGVyTmFtZTogY29uZmlnLmNsdXN0ZXJOYW1lLFxuICAgICAgdnBjOiB2cGMsXG4gICAgICBkZWZhdWx0Q2FwYWNpdHk6IDAsIC8vIHdlIHdhbnQgdG8gbWFuYWdlIGNhcGFjaXR5IG91ciBzZWx2ZXNcbiAgICAgIHZlcnNpb246IGVrcy5LdWJlcm5ldGVzVmVyc2lvbi5WMV8yMSxcbiAgICAgIGNsdXN0ZXJIYW5kbGVyRW52aXJvbm1lbnQ6IHtcbiAgICAgICAgcm9sZUFybjogY2x1c3RlckhhbmRsZXJSb2xlLnJvbGVBcm4sXG4gICAgICB9LFxuICAgICAgdnBjU3VibmV0czogW3sgc3VibmV0VHlwZTogZWMyLlN1Ym5ldFR5cGUuUFJJVkFURV9XSVRIX05BVCB9XSxcbiAgICAgIHNlY3VyaXR5R3JvdXA6IG5ldyBlYzIuU2VjdXJpdHlHcm91cCh0aGlzLCAnQ2x1c3RlckNvbnRyb2xQYW5lU2VjdXJpdHlHcm91cCcsIHtcbiAgICAgICAgdnBjOiB2cGMsXG4gICAgICAgIGRlc2NyaXB0aW9uOiAnU2VjdXJpdHkgZ3JvdXAgZm9yIEVLUyBjbHVzdGVyIGNvbnRyb2wgcGxhbmUnLFxuICAgICAgfSksXG4gICAgICAvLyBtYXN0ZXJzUm9sZTogcm9sZSAvLyBPciBlbHNlIHdlIGFyZSB1bmFibGUgdG8gbG9naW5cbiAgICB9KTtcblxuICAgIHJldHVybiBjbHVzdGVyO1xuICB9XG5cbiAgY3JlYXRlV29ya2VyTm9kZUdyb3VwKGVrc0NsdXN0ZXI6IGVrcy5DbHVzdGVyLCB3b3JrZXJOb2RlUm9sZTogUm9sZSwgdnBjOiBJVnBjKSB7XG4gICAgZWtzQ2x1c3Rlci5hZGROb2RlZ3JvdXBDYXBhY2l0eSh0aGlzLmNvbmZpZy53b3JrZXJHcm91cE5hbWUsIHtcbiAgICAgIGluc3RhbmNlVHlwZXM6IGNvbnZlcnRTdHJpbmdUb0FycmF5KHRoaXMuY29uZmlnLndvcmtlckluc3RhbmNlVHlwZXMpLm1hcChcbiAgICAgICAgKGluc3RhbmNlVHlwZSkgPT4gbmV3IGVjMi5JbnN0YW5jZVR5cGUoaW5zdGFuY2VUeXBlKSxcbiAgICAgICksXG4gICAgICBub2RlZ3JvdXBOYW1lOiB0aGlzLmNvbmZpZy53b3JrZXJHcm91cE5hbWUsXG4gICAgICBub2RlUm9sZTogd29ya2VyTm9kZVJvbGUsXG4gICAgICBjYXBhY2l0eVR5cGU6IHRoaXMuY29uZmlnLndvcmtlckNhcGFjaXR5VHlwZSA9PT0gJ1NQT1QnID8gQ2FwYWNpdHlUeXBlLlNQT1QgOiBDYXBhY2l0eVR5cGUuT05fREVNQU5ELFxuICAgICAgc3VibmV0czogdnBjLnNlbGVjdFN1Ym5ldHMoeyBzdWJuZXRUeXBlOiBlYzIuU3VibmV0VHlwZS5QUklWQVRFX1dJVEhfTkFUIH0pLFxuICAgICAgZGVzaXJlZFNpemU6IE51bWJlcih0aGlzLmNvbmZpZy53b3JrZXJEZXNpcmVkU2l6ZSksXG4gICAgICBtaW5TaXplOiBOdW1iZXIodGhpcy5jb25maWcud29ya2VyTWluU2l6ZSksXG4gICAgICBtYXhTaXplOiBOdW1iZXIodGhpcy5jb25maWcud29ya2VyTWF4U2l6ZSksXG4gICAgfSk7XG4gIH1cblxuICAvLyBXaGVuIHVzaW5nIGZhcmdhdGUgZm9yIGZpcnN0IHRpbWUgeW91IG1heSBoYXZlIHRvIGNyZWF0ZSB0aGUgc2VydmljZSBsaW5rZWQgcm9sZVxuICAvLyBhd3MgaWFtIGNyZWF0ZS1zZXJ2aWNlLWxpbmtlZC1yb2xlIFxcXG4gIC8vIC0tYXdzLXNlcnZpY2UtbmFtZSBla3MtZmFyZ2F0ZS5hbWF6b25hd3MuY29tIFxcXG4gIC8vIC0tZGVzY3JpcHRpb24gXCJTZXJ2aWNlLWxpbmtlZCByb2xlIHRvIHN1cHBvcnQgZmFyZ2F0ZVwiXG5cbiAgY3JlYXRlRmFyZ2F0ZVByb2ZpbGVzKGNsdXN0ZXI6IGVrcy5DbHVzdGVyLCB2cGM6IElWcGMpOiBla3MuRmFyZ2F0ZVByb2ZpbGVbXSB7XG4gICAgdmFyIHByb2ZpbGVzOiBla3MuRmFyZ2F0ZVByb2ZpbGVbXSA9IFtdO1xuICAgIHRoaXMuY29uZmlnLmZhcmdhdGVQcm9maWxlcz8uZm9yRWFjaCgocHJvZmlsZSkgPT4ge1xuICAgICAgdGhpcy5jcmVhdGVOYW1lc3BhY2VzKHByb2ZpbGUuc2VsZWN0b3JzLCBjbHVzdGVyKTtcbiAgICAgIHByb2ZpbGVzLnB1c2goXG4gICAgICAgIG5ldyBla3MuRmFyZ2F0ZVByb2ZpbGUodGhpcywgcHJvZmlsZS5uYW1lLCB7XG4gICAgICAgICAgY2x1c3RlcixcbiAgICAgICAgICBzZWxlY3RvcnM6IHByb2ZpbGUuc2VsZWN0b3JzLFxuICAgICAgICAgIHZwYzogdnBjLFxuICAgICAgICAgIHN1Ym5ldFNlbGVjdGlvbjogdnBjLnNlbGVjdFN1Ym5ldHMoeyBzdWJuZXRUeXBlOiBlYzIuU3VibmV0VHlwZS5QUklWQVRFX1dJVEhfTkFUIH0pLFxuICAgICAgICB9KSxcbiAgICAgICk7XG4gICAgfSk7XG5cbiAgICByZXR1cm4gcHJvZmlsZXM7XG4gIH1cblxuICBjcmVhdGVOYW1lc3BhY2VzKHNlbGVjdG9yczogU2VsZWN0b3JbXSwgY2x1c3RlcjogZWtzLkNsdXN0ZXIpOiBla3MuS3ViZXJuZXRlc01hbmlmZXN0W10ge1xuICAgIC8vIENyZWF0ZXMgbmFtZXNwYWNlICBmb3IgZmFyZ2F0ZSBwcm9maWxlc1xuXG4gICAgdmFyIG5zOiBla3MuS3ViZXJuZXRlc01hbmlmZXN0W10gPSBbXTtcblxuICAgIHNlbGVjdG9ycy5mb3JFYWNoKChzZWxlY3RvcikgPT4ge1xuICAgICAgY29uc3QgbmFtZXNwYWNlID0ge1xuICAgICAgICBhcGlWZXJzaW9uOiAndjEnLFxuICAgICAgICBraW5kOiAnTmFtZXNwYWNlJyxcbiAgICAgICAgbWV0YWRhdGE6IHsgbmFtZTogc2VsZWN0b3IubmFtZXNwYWNlIH0sXG4gICAgICB9O1xuXG4gICAgICBucy5wdXNoKFxuICAgICAgICBuZXcgZWtzLkt1YmVybmV0ZXNNYW5pZmVzdCh0aGlzLCBgJHtzZWxlY3Rvci5uYW1lc3BhY2V9TlNgLCB7XG4gICAgICAgICAgY2x1c3RlcixcbiAgICAgICAgICBtYW5pZmVzdDogW25hbWVzcGFjZV0sXG4gICAgICAgIH0pLFxuICAgICAgKTtcbiAgICB9KTtcblxuICAgIHJldHVybiBucztcbiAgfVxuXG4gIGNyZWF0ZVMzQnVja2V0cygpOiB2b2lkIHtcbiAgICB0aGlzLmNvbmZpZy5zM0J1Y2tldHM/LmZvckVhY2goKGJ1Y2tldCkgPT4ge1xuICAgICAgY29uc3QgYiA9IG5ldyBCdWNrZXQodGhpcywgYnVja2V0Lm5hbWUsIHtcbiAgICAgICAgYnVja2V0TmFtZTogYnVja2V0Lm5hbWUsXG4gICAgICAgIGVuY3J5cHRpb246IEJ1Y2tldEVuY3J5cHRpb24uUzNfTUFOQUdFRCxcbiAgICAgICAgZW5mb3JjZVNTTDogdHJ1ZSxcbiAgICAgICAgcHVibGljUmVhZEFjY2VzczogZmFsc2UsXG4gICAgICAgIGJsb2NrUHVibGljQWNjZXNzOiBCbG9ja1B1YmxpY0FjY2Vzcy5CTE9DS19BTEwsXG4gICAgICAgIHZlcnNpb25lZDogdHJ1ZSxcbiAgICAgICAgcmVtb3ZhbFBvbGljeTogUmVtb3ZhbFBvbGljeS5ERVNUUk9ZLFxuICAgICAgfSk7XG4gICAgfSk7XG4gIH1cbn1cbiJdfQ==
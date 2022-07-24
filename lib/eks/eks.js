"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
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
const aws_s3_1 = require("aws-cdk-lib/aws-s3");
const common_1 = require("../utils/common");
const efs_csi_driver_1 = require("./controllers/efs-csi-driver");
const load_balancer_controller_1 = require("./controllers/load-balancer-controller");
const secrets_csi_driver_1 = require("./controllers/secrets-csi-driver");
const cw_logging_monitoring_1 = require("./cw-logging-monitoring");
const external_dns_1 = require("./external-dns");
const aws_ssm_1 = require("aws-cdk-lib/aws-ssm");
const fs = __importStar(require("fs"));
const yaml = __importStar(require("js-yaml"));
const process_1 = require("process");
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
                groups: ["system:bootstrappers", "system:nodes", "system:masters"],
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
        new cw_logging_monitoring_1.CloudwatchLogging(this, 'CloudWatchLoggingNested', this.eksCluster);
        // Exteranl DNS related stack
        // new PrometheusStack(this, 'PrometheusStack', eksCluster)
        new load_balancer_controller_1.AwsLoadBalancerController(this, 'AwsLoadBalancerController', this.eksCluster);
        new efs_csi_driver_1.AwsEFSCSIDriver(this, 'AwsEFSCSIDriver', this.eksCluster);
        new secrets_csi_driver_1.AwsSecretsCSIDriver(this, 'AwsSecretsCSIDriver', this.eksCluster);
        new external_dns_1.ExternalDNS(this, 'ExternalDNS', {
            clusterName: config.clusterName,
            eksCluster: this.eksCluster,
            domainFilter: this.config.externalDNS.domainFilter
        });
        // For EFS related stack - checkout efs-eks-integration stack
        // Install other bits like S3 , postgres etc which needs to be before the charts are installed
        this.createS3Buckets();
        this.createParams();
    }
    getVPC() {
        const vpcId = ssm.StringParameter.valueFromLookup(this, '/account/vpc/id');
        const vpc = ec2.Vpc.fromLookup(this, 'VPC', { vpcId: vpcId });
        return vpc;
    }
    createClusterHandlerRole() {
        // When this is passed as role, EKS cluster successfully created(I think there is a bug in CDK).
        const policyStatement = new aws_iam_1.PolicyStatement({
            sid: 'FakePolicyStatement',
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
        const cpSg = new ec2.SecurityGroup(this, 'ClusterControlPaneSecurityGroup', {
            vpc: vpc,
            description: 'Security group for EKS cluster control plane',
        });
        if (config.isPrivateCluster) { // We allow by default all traffic to the cluster from Private subnets
            vpc.privateSubnets.forEach(subnet => {
                cpSg.addIngressRule(ec2.Peer.ipv4(subnet.ipv4CidrBlock), ec2.Port.allTcp(), 'Allow control plane traffic from VPC (Private) ');
            });
        }
        const cluster = new eks.Cluster(this, 'Cluster', {
            clusterName: config.clusterName,
            vpc: vpc,
            defaultCapacity: 0,
            version: eks.KubernetesVersion.V1_21,
            clusterHandlerEnvironment: {
                roleArn: clusterHandlerRole.roleArn,
            },
            vpcSubnets: [{ subnetType: ec2.SubnetType.PRIVATE_WITH_NAT }],
            securityGroup: cpSg,
            endpointAccess: config.isPrivateCluster ? aws_eks_1.EndpointAccess.PRIVATE : aws_eks_1.EndpointAccess.PUBLIC_AND_PRIVATE,
            // mastersRole: role // Or else we are unable to login
        });
        return cluster;
    }
    createWorkerNodeGroup(eksCluster, workerNodeRole, vpc) {
        eksCluster.addNodegroupCapacity(this.config.workerGroupName, {
            instanceTypes: (0, common_1.convertStringToArray)(this.config.workerInstanceTypes).map((instanceType) => new ec2.InstanceType(instanceType)),
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
        const policy = this.createEKSFargateCloudwatchPolicy();
        var profiles = [];
        (_a = this.config.fargateProfiles) === null || _a === void 0 ? void 0 : _a.forEach((profile) => {
            const p = new eks.FargateProfile(this, profile.name, {
                cluster,
                selectors: profile.selectors,
                vpc: vpc,
                subnetSelection: vpc.selectSubnets({ subnetType: ec2.SubnetType.PRIVATE_WITH_NAT }),
            });
            // this is required for logging
            p.podExecutionRole.attachInlinePolicy(policy);
            profiles.push(p);
        });
        // Enable automatic cloudwwatch logging for the same. This requires a namespace and a config map
        const namespace = cluster.addManifest('aws-observability', {
            apiVersion: 'v1',
            kind: 'Namespace',
            metadata: { name: 'aws-observability', labels: { 'aws-observability': 'enabled' } },
        });
        // yaml
        let dataResult = [];
        try {
            const path = require('path');
            let valuesYaml = fs.readFileSync(path.join(__dirname, `./manifests/fargate-cloudwatch-logging.yaml`));
            // Replace Domain and load YAML
            let valuesParsed = yaml.loadAll(valuesYaml.toString()
                .replace(new RegExp('{AWS_REGION}', 'gi'), aws_cdk_lib_1.Aws.REGION)
                .replace(new RegExp('{CLUSTER_NAME}', 'gi'), cluster.clusterName));
            if (typeof valuesParsed === 'object' && valuesParsed !== null) {
                dataResult = valuesParsed;
            }
        }
        catch (exception) {
            console.error(" > Failed to load 'fargate-cloudwatch-logging.yaml' for 'EKS Cluster' deploy...");
            console.error(exception);
            process_1.exit;
        }
        dataResult.forEach(function (val, idx) {
            const a = cluster.addManifest('fargate-cloudwatch-logging-' + idx, val);
            a.node.addDependency(namespace);
        });
        return profiles;
    }
    createEKSFargateCloudwatchPolicy() {
        // each pod execution role needs to have the policy
        const iamPolicyDocument = JSON.parse(`{
      "Version": "2012-10-17",
      "Statement": [{
        "Effect": "Allow",
        "Action": [
          "logs:CreateLogStream",
          "logs:CreateLogGroup",
          "logs:DescribeLogStreams",
          "logs:PutLogEvents"
        ],
        "Resource": "*"
      }]
    }`);
        // Create IAM Policy
        const iamPolicy = new aws_iam_1.Policy(this, 'EKSFargateLoggingPolicy', {
            policyName: 'EKSFargateLoggingPolicy',
            document: aws_iam_1.PolicyDocument.fromJson(iamPolicyDocument),
        });
        return iamPolicy;
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
        (_a = this.config.s3Buckets) === null || _a === void 0 ? void 0 : _a.forEach(bucket => {
            if (bucket.isPrivateWithCors) {
                const b = new aws_s3_1.Bucket(this, bucket.name, {
                    bucketName: bucket.name,
                    encryption: aws_s3_1.BucketEncryption.S3_MANAGED,
                    enforceSSL: true,
                    publicReadAccess: false,
                    blockPublicAccess: aws_s3_1.BlockPublicAccess.BLOCK_ALL,
                    cors: bucket.cors,
                    versioned: true,
                    removalPolicy: aws_cdk_lib_1.RemovalPolicy.DESTROY,
                });
            }
            else {
                const b = new aws_s3_1.Bucket(this, bucket.name, {
                    bucketName: bucket.name,
                    encryption: aws_s3_1.BucketEncryption.S3_MANAGED,
                    enforceSSL: true,
                    publicReadAccess: false,
                    blockPublicAccess: aws_s3_1.BlockPublicAccess.BLOCK_ALL,
                    versioned: true,
                    removalPolicy: aws_cdk_lib_1.RemovalPolicy.DESTROY,
                });
            }
        });
    }
    createParams() {
        // Export few parameters for application usage
        new aws_ssm_1.StringParameter(this, "EKSClusterHandlerRole", {
            parameterName: `/account/stacks/${this.stackName}/kubectl-role`,
            stringValue: this.eksCluster.kubectlRole.roleArn,
            description: "Kubectl Role for stack operations"
        });
    }
}
exports.EKSCluster = EKSCluster;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWtzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZWtzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsMkNBQTRDO0FBQzVDLDJDQUE0QztBQUM1QywyQ0FBNEM7QUFDNUMsMkNBQTRDO0FBQzVDLG1DQUFvQztBQUNwQyw2Q0FBaUQ7QUFFakQsaURBQXNGO0FBQ3RGLGlEQVE2QjtBQUM3QiwrQ0FBaUY7QUFHakYsNENBQXVEO0FBQ3ZELGlFQUErRDtBQUMvRCxxRkFBbUY7QUFDbkYseUVBQXVFO0FBQ3ZFLG1FQUE0RDtBQUM1RCxpREFBNkM7QUFFN0MsaURBQXNEO0FBQ3RELHVDQUF5QjtBQUN6Qiw4Q0FBZ0M7QUFDaEMscUNBQStCO0FBRy9CLE1BQWEsVUFBVyxTQUFRLEdBQUcsQ0FBQyxLQUFLO0lBSXZDLFlBQVksS0FBZ0IsRUFBRSxFQUFVLEVBQUUsTUFBc0IsRUFBRSxLQUFzQjtRQUN0RixLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUN4QixJQUFJLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQztRQUVyQixNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7UUFFMUIsTUFBTSxrQkFBa0IsR0FBRyxJQUFJLENBQUMsd0JBQXdCLEVBQUUsQ0FBQztRQUUzRCxvQ0FBb0M7UUFDcEMsTUFBTSxVQUFVLEdBQUcsSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxlQUFlLEVBQUU7WUFDckQsU0FBUyxFQUFFLElBQUksR0FBRyxDQUFDLGdCQUFnQixDQUFDLG1CQUFtQixDQUFDO1lBQ3hELGVBQWUsRUFBRTtnQkFDZixHQUFHLENBQUMsYUFBYSxDQUFDLHdCQUF3QixDQUFDLDJCQUEyQixDQUFDO2dCQUN2RSxHQUFHLENBQUMsYUFBYSxDQUFDLHdCQUF3QixDQUFDLG9DQUFvQyxDQUFDO2dCQUNoRixHQUFHLENBQUMsYUFB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QUUsMkJBQWEsQ0FBQyxPQUFPO2lCQUNyQyxDQUFDLENBQUM7YUFDSjtRQUNILENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztJQUVELFlBQVk7UUFDViw4Q0FBOEM7UUFDOUMsSUFBSSx5QkFBZSxDQUNqQixJQUFJLEVBQUUsdUJBQXVCLEVBQzdCO1lBQ0UsYUFBYSxFQUFFLG1CQUFtQixJQUFJLENBQUMsU0FBUyxlQUFlO1lBQy9ELFdBQVcsRUFBRSxJQUFJLENBQUMsVUFBVSxDQUFDLFdBQVksQ0FBQyxPQUFPO1lBQ2pELFdBQVcsRUFBRSxtQ0FBbUM7U0FDakQsQ0FDRixDQUFDO0lBRUosQ0FBQztDQUNGO0FBbFRELGdDQWtUQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBpYW0gPSByZXF1aXJlKCdhd3MtY2RrLWxpYi9hd3MtaWFtJyk7XG5pbXBvcnQgZWMyID0gcmVxdWlyZSgnYXdzLWNkay1saWIvYXdzLWVjMicpO1xuaW1wb3J0IGVrcyA9IHJlcXVpcmUoJ2F3cy1jZGstbGliL2F3cy1la3MnKTtcbmltcG9ydCBzc20gPSByZXF1aXJlKCdhd3MtY2RrLWxpYi9hd3Mtc3NtJyk7XG5pbXBvcnQgY2RrID0gcmVxdWlyZSgnYXdzLWNkay1saWInKTtcbmltcG9ydCB7IEF3cywgUmVtb3ZhbFBvbGljeSB9IGZyb20gJ2F3cy1jZGstbGliJztcbmltcG9ydCB7IElWcGMgfSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtZWMyJztcbmltcG9ydCB7IENhcGFjaXR5VHlwZSwgQ2x1c3RlciwgRW5kcG9pbnRBY2Nlc3MsIFNlbGVjdG9yIH0gZnJvbSAnYXdzLWNkay1saWIvYXdzLWVrcyc7XG5pbXBvcnQge1xuICBDb21wb3NpdGVQcmluY2lwYWwsXG4gIEVmZmVjdCxcbiAgUG9saWN5LFxuICBQb2xpY3lEb2N1bWVudCxcbiAgUG9saWN5U3RhdGVtZW50LFxuICBSb2xlLFxuICBTZXJ2aWNlUHJpbmNpcGFsXG59IGZyb20gJ2F3cy1jZGstbGliL2F3cy1pYW0nO1xuaW1wb3J0IHsgQmxvY2tQdWJsaWNBY2Nlc3MsIEJ1Y2tldCwgQnVja2V0RW5jcnlwdGlvbiB9IGZyb20gJ2F3cy1jZGstbGliL2F3cy1zMyc7XG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tICdjb25zdHJ1Y3RzJztcbmltcG9ydCB7IEVLU1N0YWNrQ29uZmlnIH0gZnJvbSAnLi4vLi4vaW50ZXJmYWNlcy9saWIvZWtzL2ludGVyZmFjZXMnO1xuaW1wb3J0IHsgY29udmVydFN0cmluZ1RvQXJyYXkgfSBmcm9tICcuLi91dGlscy9jb21tb24nO1xuaW1wb3J0IHsgQXdzRUZTQ1NJRHJpdmVyIH0gZnJvbSAnLi9jb250cm9sbGVycy9lZnMtY3NpLWRyaXZlcic7XG5pbXBvcnQgeyBBd3NMb2FkQmFsYW5jZXJDb250cm9sbGVyIH0gZnJvbSAnLi9jb250cm9sbGVycy9sb2FkLWJhbGFuY2VyLWNvbnRyb2xsZXInO1xuaW1wb3J0IHsgQXdzU2VjcmV0c0NTSURyaXZlciB9IGZyb20gJy4vY29udHJvbGxlcnMvc2VjcmV0cy1jc2ktZHJpdmVyJztcbmltcG9ydCB7IENsb3Vkd2F0Y2hMb2dnaW5nIH0gZnJvbSAnLi9jdy1sb2dnaW5nLW1vbml0b3JpbmcnO1xuaW1wb3J0IHsgRXh0ZXJuYWxETlMgfSBmcm9tICcuL2V4dGVybmFsLWRucyc7XG5cbmltcG9ydCB7IFN0cmluZ1BhcmFtZXRlciB9IGZyb20gJ2F3cy1jZGstbGliL2F3cy1zc20nO1xuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xuaW1wb3J0ICogYXMgeWFtbCBmcm9tICdqcy15YW1sJztcbmltcG9ydCB7IGV4aXQgfSBmcm9tICdwcm9jZXNzJztcblxuXG5leHBvcnQgY2xhc3MgRUtTQ2x1c3RlciBleHRlbmRzIGNkay5TdGFjayB7XG4gIGNvbmZpZzogRUtTU3RhY2tDb25maWc7XG4gIGVrc0NsdXN0ZXI6IENsdXN0ZXI7XG5cbiAgY29uc3RydWN0b3Ioc2NvcGU6IENvbnN0cnVjdCwgaWQ6IHN0cmluZywgY29uZmlnOiBFS1NTdGFja0NvbmZpZywgcHJvcHM/OiBjZGsuU3RhY2tQcm9wcykge1xuICAgIHN1cGVyKHNjb3BlLCBpZCwgcHJvcHMpO1xuICAgIHRoaXMuY29uZmlnID0gY29uZmlnO1xuXG4gICAgY29uc3QgdnBjID0gdGhpcy5nZXRWUEMoKTtcblxuICAgIGNvbnN0IGNsdXN0ZXJIYW5kbGVyUm9sZSA9IHRoaXMuY3JlYXRlQ2x1c3RlckhhbmRsZXJSb2xlKCk7XG5cbiAgICAvLyBJQU0gcm9sZSBmb3Igb3VyIEVDMiB3b3JrZXIgbm9kZXNcbiAgICBjb25zdCB3b3JrZXJSb2xlID0gbmV3IGlhbS5Sb2xlKHRoaXMsICdFS1NXb3JrZXJSb2xlJywge1xuICAgICAgYXNzdW1lZEJ5OiBuZXcgaWFtLlNlcnZpY2VQcmluY2lwYWwoJ2VjMi5hbWF6b25hd3MuY29tJyksXG4gICAgICBtYW5hZ2VkUG9saWNpZXM6IFtcbiAgICAgICAgaWFtLk1hbmFnZWRQb2xpY3kuZnJvbUF3c01hbmFnZWRQb2xpY3lOYW1lKCdBbWF6b25FS1NXb3JrZXJOb2RlUG9saWN5JyksXG4gICAgICAgIGlhbS5NYW5hZ2VkUG9saWN5LmZyb21Bd3NNYW5hZ2VkUG9saWN5TmFtZSgnQW1hem9uRUMyQ29udGFpbmVyUmVnaXN0cnlSZWFkT25seScpLFxuICAgICAgICBpYW0uTWFuYWdlZFBvbGljeS5mcm9tQXdzTWFuYWdlZFBvbGljeU5hbWUoJ0FtYXpvbkVLU19DTklfUG9saWN5JyksXG4gICAgICAgIGlhbS5NYW5hZ2VkUG9saWN5LmZyb21Bd3NNYW5hZ2VkUG9saWN5TmFtZSgnQ2xvdWRXYXRjaEFnZW50U2VydmVyUG9saWN5JyksXG4gICAgICBdLFxuICAgIH0pO1xuXG4gICAgdGhpcy5la3NDbHVzdGVyID0gdGhpcy5jcmVhdGVFS1NDbHVzdGVyKHZwYywgY29uZmlnLCBjbHVzdGVySGFuZGxlclJvbGUpO1xuXG4gICAgaWYgKHRoaXMuY29uZmlnLmFsbG93QWRtaW5Sb2xlKSB7XG4gICAgICBjb25zdCByb2xlID0gUm9sZS5mcm9tUm9sZUFybihcbiAgICAgICAgdGhpcyxcbiAgICAgICAgJ0FkbWluUm9sZUF1dGgnLFxuICAgICAgICBgYXJuOmF3czppYW06OiR7QXdzLkFDQ09VTlRfSUR9OnJvbGUvJHt0aGlzLmNvbmZpZy5hbGxvd0FkbWluUm9sZX1gLFxuICAgICAgKTtcblxuICAgICAgdGhpcy5la3NDbHVzdGVyLmF3c0F1dGguYWRkUm9sZU1hcHBpbmcocm9sZSwge1xuICAgICAgICBncm91cHM6IFtcInN5c3RlbTpib290c3RyYXBwZXJzXCIsIFwic3lzdGVtOm5vZGVzXCIsIFwic3lzdGVtOm1hc3RlcnNcIl0sXG4gICAgICAgIHVzZXJuYW1lOiAnYWRtaW4nLFxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgLy8gV2Ugd2FudCB0byBjcmVhdGUgbmFtZXNwYWNlcyBmaXJzdCwgc28gdGhlIGRlcGVuZGVuY2llcyBhcmUgcmVzb2x2ZWQgYmV0d2VlbiBTQSBhbmQgY2hhcnQgaW5zdGFsbGF0aW9uLlxuICAgIC8vIERvIGl0IHNvb25lciBhcyB0aGVyZSBpcyBhIHNtYWxsIGRlbGF5IGJldHdlZW4gY3JlYXRpb24gb2YgbmFtZXNwYWNlIGFuZCBjcmVhdGlvbiBvZiBzZXJ2aWNlIGFjY291bnRcbiAgICB2YXIgbnM6IGVrcy5LdWJlcm5ldGVzTWFuaWZlc3RbXSA9IFtdO1xuICAgIGlmICh0aGlzLmNvbmZpZy5uYW1lc3BhY2VzKSB7XG4gICAgICBucyA9IHRoaXMuY3JlYXRlTmFtZXNwYWNlcyh0aGlzLmNvbmZpZy5uYW1lc3BhY2VzLCB0aGlzLmVrc0NsdXN0ZXIpO1xuICAgIH1cbiAgICAvLyBXZSBjcmVhdGUgcHJvZmlsZXMgb25jZSBhbGwgbmFtZXNwYWNlcyBhcmUgY3JlYXRlZC5cbiAgICB2YXIgcHJvZmlsZXM6IGVrcy5GYXJnYXRlUHJvZmlsZVtdID0gW107XG5cbiAgICBwcm9maWxlcyA9IHRoaXMuY3JlYXRlRmFyZ2F0ZVByb2ZpbGVzKHRoaXMuZWtzQ2x1c3RlciwgdnBjLCBucyk7XG4gICAgdGhpcy5jcmVhdGVXb3JrZXJOb2RlR3JvdXAodGhpcy5la3NDbHVzdGVyLCB3b3JrZXJSb2xlLCB2cGMpO1xuXG4gICAgLy8gRW5hYmxlIGNsdXN0ZXIgbG9nZ2luZyBhbmQgTW9uaXRvcmluZ1xuICAgIG5ldyBDbG91ZHdhdGNoTG9nZ2luZyh0aGlzLCAnQ2xvdWRXYXRjaExvZ2dpbmdOZXN0ZWQnLCB0aGlzLmVrc0NsdXN0ZXIpO1xuXG4gICAgLy8gRXh0ZXJhbmwgRE5TIHJlbGF0ZWQgc3RhY2tcbiAgICAvLyBuZXcgUHJvbWV0aGV1c1N0YWNrKHRoaXMsICdQcm9tZXRoZXVzU3RhY2snLCBla3NDbHVzdGVyKVxuXG4gICAgbmV3IEF3c0xvYWRCYWxhbmNlckNvbnRyb2xsZXIodGhpcywgJ0F3c0xvYWRCYWxhbmNlckNvbnRyb2xsZXInLCB0aGlzLmVrc0NsdXN0ZXIpO1xuICAgIG5ldyBBd3NFRlNDU0lEcml2ZXIodGhpcywgJ0F3c0VGU0NTSURyaXZlcicsIHRoaXMuZWtzQ2x1c3Rlcik7XG4gICAgbmV3IEF3c1NlY3JldHNDU0lEcml2ZXIodGhpcywgJ0F3c1NlY3JldHNDU0lEcml2ZXInLCB0aGlzLmVrc0NsdXN0ZXIpO1xuICAgIG5ldyBFeHRlcm5hbEROUyh0aGlzLCAnRXh0ZXJuYWxETlMnLCB7XG4gICAgICBjbHVzdGVyTmFtZTogY29uZmlnLmNsdXN0ZXJOYW1lLFxuICAgICAgZWtzQ2x1c3RlcjogdGhpcy5la3NDbHVzdGVyLFxuICAgICAgZG9tYWluRmlsdGVyOiB0aGlzLmNvbmZpZy5leHRlcm5hbEROUy5kb21haW5GaWx0ZXJcbiAgICB9KTtcblxuICAgIC8vIEZvciBFRlMgcmVsYXRlZCBzdGFjayAtIGNoZWNrb3V0IGVmcy1la3MtaW50ZWdyYXRpb24gc3RhY2tcbiAgICAvLyBJbnN0YWxsIG90aGVyIGJpdHMgbGlrZSBTMyAsIHBvc3RncmVzIGV0YyB3aGljaCBuZWVkcyB0byBiZSBiZWZvcmUgdGhlIGNoYXJ0cyBhcmUgaW5zdGFsbGVkXG4gICAgdGhpcy5jcmVhdGVTM0J1Y2tldHMoKTtcblxuICAgIHRoaXMuY3JlYXRlUGFyYW1zKClcblxuICB9XG5cblxuXG4gIGdldFZQQygpOiBlYzIuSVZwYyB7XG4gICAgY29uc3QgdnBjSWQgPSBzc20uU3RyaW5nUGFyYW1ldGVyLnZhbHVlRnJvbUxvb2t1cCh0aGlzLCAnL2FjY291bnQvdnBjL2lkJyk7XG4gICAgY29uc3QgdnBjID0gZWMyLlZwYy5mcm9tTG9va3VwKHRoaXMsICdWUEMnLCB7IHZwY0lkOiB2cGNJZCB9KTtcblxuICAgIHJldHVybiB2cGM7XG4gIH1cblxuICBjcmVhdGVDbHVzdGVySGFuZGxlclJvbGUoKTogUm9sZSB7XG4gICAgLy8gV2hlbiB0aGlzIGlzIHBhc3NlZCBhcyByb2xlLCBFS1MgY2x1c3RlciBzdWNjZXNzZnVsbHkgY3JlYXRlZChJIHRoaW5rIHRoZXJlIGlzIGEgYnVnIGluIENESykuXG4gICAgY29uc3QgcG9saWN5U3RhdGVtZW50ID0gbmV3IFBvbGljeVN0YXRlbWVudCh7XG4gICAgICBzaWQ6ICdGYWtlUG9saWN5U3RhdGVtZW50JyxcbiAgICAgIGFjdGlvbnM6IFsnbG9nczpQdXRMb2dFdmVudHMnXSxcbiAgICAgIGVmZmVjdDogRWZmZWN0LkFMTE9XLFxuICAgICAgcmVzb3VyY2VzOiBbJyonXSxcbiAgICB9KTtcblxuICAgIGNvbnN0IHBvbGljeURvY3VtZW50ID0gbmV3IFBvbGljeURvY3VtZW50KHtcbiAgICAgIHN0YXRlbWVudHM6IFtwb2xpY3lTdGF0ZW1lbnRdLFxuICAgIH0pO1xuXG4gICAgY29uc3QgY2x1c3RlckhhbmRsZXJSb2xlID0gbmV3IFJvbGUodGhpcywgYENsdXN0ZXJIYW5kbGVyUm9sZWAsIHtcbiAgICAgIHJvbGVOYW1lOiBgJHtBd3MuU1RBQ0tfTkFNRX0tQ2x1c3RlckhhbmRsZXJSb2xlYCxcbiAgICAgIGRlc2NyaXB0aW9uOiBgUm9sZSBmb3IgbGFtYmRhIGhhbmRsZXJgLFxuICAgICAgYXNzdW1lZEJ5OiBuZXcgQ29tcG9zaXRlUHJpbmNpcGFsKG5ldyBTZXJ2aWNlUHJpbmNpcGFsKCdsYW1iZGEuYW1hem9uYXdzLmNvbScpKSxcbiAgICAgIGlubGluZVBvbGljaWVzOiB7XG4gICAgICAgIEFjY2Vzc1BvbGljeTogcG9saWN5RG9jdW1lbnQsXG4gICAgICB9LFxuICAgIH0pO1xuXG4gICAgcmV0dXJuIGNsdXN0ZXJIYW5kbGVyUm9sZTtcbiAgfVxuXG4gIGNyZWF0ZUVLU0NsdXN0ZXIodnBjOiBlYzIuSVZwYywgY29uZmlnOiBFS1NTdGFja0NvbmZpZywgY2x1c3RlckhhbmRsZXJSb2xlOiBpYW0uUm9sZSk6IGVrcy5DbHVzdGVyIHtcbiAgICBjb25zdCByb2xlID0gUm9sZS5mcm9tUm9sZUFybihcbiAgICAgIHRoaXMsXG4gICAgICAnQWRtaW5Sb2xlJyxcbiAgICAgIGBhcm46YXdzOmlhbTo6JHtBd3MuQUNDT1VOVF9JRH06cm9sZS8ke0F3cy5SRUdJT059LyR7dGhpcy5jb25maWcuYWxsb3dBZG1pblJvbGV9YCxcbiAgICApO1xuXG4gICAgY29uc3QgY3BTZyA9IG5ldyBlYzIuU2VjdXJpdHlHcm91cCh0aGlzLCAnQ2x1c3RlckNvbnRyb2xQYW5lU2VjdXJpdHlHcm91cCcsIHtcbiAgICAgIHZwYzogdnBjLFxuICAgICAgZGVzY3JpcHRpb246ICdTZWN1cml0eSBncm91cCBmb3IgRUtTIGNsdXN0ZXIgY29udHJvbCBwbGFuZScsXG4gICAgfSlcblxuICAgIGlmIChjb25maWcuaXNQcml2YXRlQ2x1c3RlcikgeyAvLyBXZSBhbGxvdyBieSBkZWZhdWx0IGFsbCB0cmFmZmljIHRvIHRoZSBjbHVzdGVyIGZyb20gUHJpdmF0ZSBzdWJuZXRzXG4gICAgICB2cGMucHJpdmF0ZVN1Ym5ldHMuZm9yRWFjaChzdWJuZXQgPT4ge1xuICAgICAgICBjcFNnLmFkZEluZ3Jlc3NSdWxlKGVjMi5QZWVyLmlwdjQoc3VibmV0LmlwdjRDaWRyQmxvY2spLCBlYzIuUG9ydC5hbGxUY3AoKSwgJ0FsbG93IGNvbnRyb2wgcGxhbmUgdHJhZmZpYyBmcm9tIFZQQyAoUHJpdmF0ZSkgJylcbiAgICAgIH0pXG4gICAgfVxuXG4gICAgY29uc3QgY2x1c3RlciA9IG5ldyBla3MuQ2x1c3Rlcih0aGlzLCAnQ2x1c3RlcicsIHtcbiAgICAgIGNsdXN0ZXJOYW1lOiBjb25maWcuY2x1c3Rlck5hbWUsXG4gICAgICB2cGM6IHZwYyxcbiAgICAgIGRlZmF1bHRDYXBhY2l0eTogMCwgLy8gd2Ugd2FudCB0byBtYW5hZ2UgY2FwYWNpdHkgb3VyIHNlbHZlc1xuICAgICAgdmVyc2lvbjogZWtzLkt1YmVybmV0ZXNWZXJzaW9uLlYxXzIxLFxuICAgICAgY2x1c3RlckhhbmRsZXJFbnZpcm9ubWVudDoge1xuICAgICAgICByb2xlQXJuOiBjbHVzdGVySGFuZGxlclJvbGUucm9sZUFybixcbiAgICAgIH0sXG4gICAgICB2cGNTdWJuZXRzOiBbeyBzdWJuZXRUeXBlOiBlYzIuU3VibmV0VHlwZS5QUklWQVRFX1dJVEhfTkFUIH1dLFxuICAgICAgc2VjdXJpdHlHcm91cDogY3BTZyxcbiAgICAgIGVuZHBvaW50QWNjZXNzOiBjb25maWcuaXNQcml2YXRlQ2x1c3RlciA/IEVuZHBvaW50QWNjZXNzLlBSSVZBVEUgOiBFbmRwb2ludEFjY2Vzcy5QVUJMSUNfQU5EX1BSSVZBVEUsXG4gICAgICAvLyBtYXN0ZXJzUm9sZTogcm9sZSAvLyBPciBlbHNlIHdlIGFyZSB1bmFibGUgdG8gbG9naW5cbiAgICB9KTtcblxuICAgIHJldHVybiBjbHVzdGVyO1xuICB9XG5cbiAgY3JlYXRlV29ya2VyTm9kZUdyb3VwKGVrc0NsdXN0ZXI6IGVrcy5DbHVzdGVyLCB3b3JrZXJOb2RlUm9sZTogUm9sZSwgdnBjOiBJVnBjKSB7XG4gICAgZWtzQ2x1c3Rlci5hZGROb2RlZ3JvdXBDYXBhY2l0eSh0aGlzLmNvbmZpZy53b3JrZXJHcm91cE5hbWUsIHtcbiAgICAgIGluc3RhbmNlVHlwZXM6IGNvbnZlcnRTdHJpbmdUb0FycmF5KHRoaXMuY29uZmlnLndvcmtlckluc3RhbmNlVHlwZXMpLm1hcChcbiAgICAgICAgKGluc3RhbmNlVHlwZSkgPT4gbmV3IGVjMi5JbnN0YW5jZVR5cGUoaW5zdGFuY2VUeXBlKSxcbiAgICAgICksXG4gICAgICBub2RlZ3JvdXBOYW1lOiB0aGlzLmNvbmZpZy53b3JrZXJHcm91cE5hbWUsXG4gICAgICBub2RlUm9sZTogd29ya2VyTm9kZVJvbGUsXG4gICAgICBjYXBhY2l0eVR5cGU6IHRoaXMuY29uZmlnLndvcmtlckNhcGFjaXR5VHlwZSA9PT0gJ1NQT1QnID8gQ2FwYWNpdHlUeXBlLlNQT1QgOiBDYXBhY2l0eVR5cGUuT05fREVNQU5ELFxuICAgICAgc3VibmV0czogdnBjLnNlbGVjdFN1Ym5ldHMoeyBzdWJuZXRUeXBlOiBlYzIuU3VibmV0VHlwZS5QUklWQVRFX1dJVEhfTkFUIH0pLFxuICAgICAgZGVzaXJlZFNpemU6IE51bWJlcih0aGlzLmNvbmZpZy53b3JrZXJEZXNpcmVkU2l6ZSksXG4gICAgICBtaW5TaXplOiBOdW1iZXIodGhpcy5jb25maWcud29ya2VyTWluU2l6ZSksXG4gICAgICBtYXhTaXplOiBOdW1iZXIodGhpcy5jb25maWcud29ya2VyTWF4U2l6ZSksXG4gICAgfSk7XG4gIH1cblxuICAvLyBXaGVuIHVzaW5nIGZhcmdhdGUgZm9yIGZpcnN0IHRpbWUgeW91IG1heSBoYXZlIHRvIGNyZWF0ZSB0aGUgc2VydmljZSBsaW5rZWQgcm9sZVxuICAvLyBhd3MgaWFtIGNyZWF0ZS1zZXJ2aWNlLWxpbmtlZC1yb2xlIFxcXG4gIC8vIC0tYXdzLXNlcnZpY2UtbmFtZSBla3MtZmFyZ2F0ZS5hbWF6b25hd3MuY29tIFxcXG4gIC8vIC0tZGVzY3JpcHRpb24gXCJTZXJ2aWNlLWxpbmtlZCByb2xlIHRvIHN1cHBvcnQgZmFyZ2F0ZVwiXG5cbiAgY3JlYXRlRmFyZ2F0ZVByb2ZpbGVzKGNsdXN0ZXI6IGVrcy5DbHVzdGVyLCB2cGM6IElWcGMsIG5zOiBla3MuS3ViZXJuZXRlc01hbmlmZXN0W10pOiBla3MuRmFyZ2F0ZVByb2ZpbGVbXSB7XG5cbiAgICBjb25zdCBwb2xpY3kgPSB0aGlzLmNyZWF0ZUVLU0ZhcmdhdGVDbG91ZHdhdGNoUG9saWN5KClcblxuICAgIHZhciBwcm9maWxlczogZWtzLkZhcmdhdGVQcm9maWxlW10gPSBbXTtcbiAgICB0aGlzLmNvbmZpZy5mYXJnYXRlUHJvZmlsZXM/LmZvckVhY2goKHByb2ZpbGUpID0+IHtcblxuICAgICAgY29uc3QgcCA9IG5ldyBla3MuRmFyZ2F0ZVByb2ZpbGUodGhpcywgcHJvZmlsZS5uYW1lLCB7XG4gICAgICAgIGNsdXN0ZXIsXG4gICAgICAgIHNlbGVjdG9yczogcHJvZmlsZS5zZWxlY3RvcnMsXG4gICAgICAgIHZwYzogdnBjLFxuICAgICAgICBzdWJuZXRTZWxlY3Rpb246IHZwYy5zZWxlY3RTdWJuZXRzKHsgc3VibmV0VHlwZTogZWMyLlN1Ym5ldFR5cGUuUFJJVkFURV9XSVRIX05BVCB9KSxcbiAgICAgIH0pO1xuICAgICAgLy8gdGhpcyBpcyByZXF1aXJlZCBmb3IgbG9nZ2luZ1xuICAgICAgcC5wb2RFeGVjdXRpb25Sb2xlLmF0dGFjaElubGluZVBvbGljeShwb2xpY3kpXG5cbiAgICAgIHByb2ZpbGVzLnB1c2gocCk7XG5cbiAgICB9KTtcblxuICAgIC8vIEVuYWJsZSBhdXRvbWF0aWMgY2xvdWR3d2F0Y2ggbG9nZ2luZyBmb3IgdGhlIHNhbWUuIFRoaXMgcmVxdWlyZXMgYSBuYW1lc3BhY2UgYW5kIGEgY29uZmlnIG1hcFxuXG4gICAgY29uc3QgbmFtZXNwYWNlID0gY2x1c3Rlci5hZGRNYW5pZmVzdCgnYXdzLW9ic2VydmFiaWxpdHknLCB7XG4gICAgICBhcGlWZXJzaW9uOiAndjEnLFxuICAgICAga2luZDogJ05hbWVzcGFjZScsXG4gICAgICBtZXRhZGF0YTogeyBuYW1lOiAnYXdzLW9ic2VydmFiaWxpdHknLCBsYWJlbHM6IHsgJ2F3cy1vYnNlcnZhYmlsaXR5JzogJ2VuYWJsZWQnIH0gfSxcbiAgICB9KTtcblxuICAgIC8vIHlhbWxcbiAgICBsZXQgZGF0YVJlc3VsdDogUmVjb3JkPHN0cmluZywgb2JqZWN0PltdID0gW107XG4gICAgdHJ5IHtcblxuICAgICAgY29uc3QgcGF0aCA9IHJlcXVpcmUoJ3BhdGgnKTtcblxuICAgICAgbGV0IHZhbHVlc1lhbWwgPSBmcy5yZWFkRmlsZVN5bmMocGF0aC5qb2luKF9fZGlybmFtZSwgYC4vbWFuaWZlc3RzL2ZhcmdhdGUtY2xvdWR3YXRjaC1sb2dnaW5nLnlhbWxgKSk7XG4gICAgICAvLyBSZXBsYWNlIERvbWFpbiBhbmQgbG9hZCBZQU1MXG4gICAgICBsZXQgdmFsdWVzUGFyc2VkID0geWFtbC5sb2FkQWxsKHZhbHVlc1lhbWwudG9TdHJpbmcoKVxuICAgICAgICAucmVwbGFjZShuZXcgUmVnRXhwKCd7QVdTX1JFR0lPTn0nLCAnZ2knKSwgQXdzLlJFR0lPTilcbiAgICAgICAgLnJlcGxhY2UobmV3IFJlZ0V4cCgne0NMVVNURVJfTkFNRX0nLCAnZ2knKSwgY2x1c3Rlci5jbHVzdGVyTmFtZSlcbiAgICAgICk7XG4gICAgICBpZiAodHlwZW9mIHZhbHVlc1BhcnNlZCA9PT0gJ29iamVjdCcgJiYgdmFsdWVzUGFyc2VkICE9PSBudWxsKSB7XG4gICAgICAgIGRhdGFSZXN1bHQgPSB2YWx1ZXNQYXJzZWQgYXMgUmVjb3JkPHN0cmluZywgb2JqZWN0PltdO1xuICAgICAgfVxuICAgIH0gY2F0Y2ggKGV4Y2VwdGlvbikge1xuICAgICAgY29uc29sZS5lcnJvcihcIiA+IEZhaWxlZCB0byBsb2FkICdmYXJnYXRlLWNsb3Vkd2F0Y2gtbG9nZ2luZy55YW1sJyBmb3IgJ0VLUyBDbHVzdGVyJyBkZXBsb3kuLi5cIik7XG4gICAgICBjb25zb2xlLmVycm9yKGV4Y2VwdGlvbik7XG4gICAgICBleGl0XG4gICAgfVxuXG4gICAgZGF0YVJlc3VsdC5mb3JFYWNoKGZ1bmN0aW9uICh2YWwsIGlkeCkge1xuICAgICAgY29uc3QgYSA9IGNsdXN0ZXIuYWRkTWFuaWZlc3QoJ2ZhcmdhdGUtY2xvdWR3YXRjaC1sb2dnaW5nLScgKyBpZHgsIHZhbCk7XG4gICAgICBhLm5vZGUuYWRkRGVwZW5kZW5jeShuYW1lc3BhY2UpXG4gICAgfSk7XG5cbiAgICByZXR1cm4gcHJvZmlsZXM7XG4gIH1cblxuICBjcmVhdGVFS1NGYXJnYXRlQ2xvdWR3YXRjaFBvbGljeSgpOiBQb2xpY3kge1xuICAgIC8vIGVhY2ggcG9kIGV4ZWN1dGlvbiByb2xlIG5lZWRzIHRvIGhhdmUgdGhlIHBvbGljeVxuICAgIGNvbnN0IGlhbVBvbGljeURvY3VtZW50ID0gSlNPTi5wYXJzZShge1xuICAgICAgXCJWZXJzaW9uXCI6IFwiMjAxMi0xMC0xN1wiLFxuICAgICAgXCJTdGF0ZW1lbnRcIjogW3tcbiAgICAgICAgXCJFZmZlY3RcIjogXCJBbGxvd1wiLFxuICAgICAgICBcIkFjdGlvblwiOiBbXG4gICAgICAgICAgXCJsb2dzOkNyZWF0ZUxvZ1N0cmVhbVwiLFxuICAgICAgICAgIFwibG9nczpDcmVhdGVMb2dHcm91cFwiLFxuICAgICAgICAgIFwibG9nczpEZXNjcmliZUxvZ1N0cmVhbXNcIixcbiAgICAgICAgICBcImxvZ3M6UHV0TG9nRXZlbnRzXCJcbiAgICAgICAgXSxcbiAgICAgICAgXCJSZXNvdXJjZVwiOiBcIipcIlxuICAgICAgfV1cbiAgICB9YClcblxuICAgIC8vIENyZWF0ZSBJQU0gUG9saWN5XG4gICAgY29uc3QgaWFtUG9saWN5ID0gbmV3IFBvbGljeSh0aGlzLCAnRUtTRmFyZ2F0ZUxvZ2dpbmdQb2xpY3knLCB7XG4gICAgICBwb2xpY3lOYW1lOiAnRUtTRmFyZ2F0ZUxvZ2dpbmdQb2xpY3knLFxuICAgICAgZG9jdW1lbnQ6IFBvbGljeURvY3VtZW50LmZyb21Kc29uKGlhbVBvbGljeURvY3VtZW50KSxcbiAgICB9KTtcblxuICAgIHJldHVybiBpYW1Qb2xpY3lcbiAgfVxuXG4gIGNyZWF0ZU5hbWVzcGFjZXMoc2VsZWN0b3JzOiBTZWxlY3RvcltdLCBjbHVzdGVyOiBla3MuQ2x1c3Rlcik6IGVrcy5LdWJlcm5ldGVzTWFuaWZlc3RbXSB7XG4gICAgLy8gQ3JlYXRlcyBuYW1lc3BhY2UgIGZvciBmYXJnYXRlIHByb2ZpbGVzXG5cbiAgICB2YXIgbnM6IGVrcy5LdWJlcm5ldGVzTWFuaWZlc3RbXSA9IFtdO1xuXG4gICAgc2VsZWN0b3JzLmZvckVhY2goKHNlbGVjdG9yKSA9PiB7XG4gICAgICBjb25zdCBuYW1lc3BhY2UgPSB7XG4gICAgICAgIGFwaVZlcnNpb246ICd2MScsXG4gICAgICAgIGtpbmQ6ICdOYW1lc3BhY2UnLFxuICAgICAgICBtZXRhZGF0YTogeyBuYW1lOiBzZWxlY3Rvci5uYW1lc3BhY2UgfSxcbiAgICAgIH07XG5cbiAgICAgIG5zLnB1c2goXG4gICAgICAgIG5ldyBla3MuS3ViZXJuZXRlc01hbmlmZXN0KHRoaXMsIGAke3NlbGVjdG9yLm5hbWVzcGFjZX1OU2AsIHtcbiAgICAgICAgICBjbHVzdGVyLFxuICAgICAgICAgIG1hbmlmZXN0OiBbbmFtZXNwYWNlXSxcbiAgICAgICAgfSksXG4gICAgICApO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIG5zO1xuICB9XG5cbiAgY3JlYXRlUzNCdWNrZXRzKCk6IHZvaWQge1xuICAgIHRoaXMuY29uZmlnLnMzQnVja2V0cz8uZm9yRWFjaChidWNrZXQgPT4ge1xuICAgICAgaWYgKGJ1Y2tldC5pc1ByaXZhdGVXaXRoQ29ycykge1xuICAgICAgICBjb25zdCBiID0gbmV3IEJ1Y2tldCh0aGlzLCBidWNrZXQubmFtZSwge1xuICAgICAgICAgIGJ1Y2tldE5hbWU6IGJ1Y2tldC5uYW1lLFxuICAgICAgICAgIGVuY3J5cHRpb246IEJ1Y2tldEVuY3J5cHRpb24uUzNfTUFOQUdFRCxcbiAgICAgICAgICBlbmZvcmNlU1NMOiB0cnVlLFxuICAgICAgICAgIHB1YmxpY1JlYWRBY2Nlc3M6IGZhbHNlLFxuICAgICAgICAgIGJsb2NrUHVibGljQWNjZXNzOiBCbG9ja1B1YmxpY0FjY2Vzcy5CTE9DS19BTEwsXG4gICAgICAgICAgY29yczogYnVja2V0LmNvcnMsXG4gICAgICAgICAgdmVyc2lvbmVkOiB0cnVlLFxuICAgICAgICAgIHJlbW92YWxQb2xpY3k6IFJlbW92YWxQb2xpY3kuREVTVFJPWSxcbiAgICAgICAgfSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb25zdCBiID0gbmV3IEJ1Y2tldCh0aGlzLCBidWNrZXQubmFtZSwge1xuICAgICAgICAgIGJ1Y2tldE5hbWU6IGJ1Y2tldC5uYW1lLFxuICAgICAgICAgIGVuY3J5cHRpb246IEJ1Y2tldEVuY3J5cHRpb24uUzNfTUFOQUdFRCxcbiAgICAgICAgICBlbmZvcmNlU1NMOiB0cnVlLFxuICAgICAgICAgIHB1YmxpY1JlYWRBY2Nlc3M6IGZhbHNlLFxuICAgICAgICAgIGJsb2NrUHVibGljQWNjZXNzOiBCbG9ja1B1YmxpY0FjY2Vzcy5CTE9DS19BTEwsXG4gICAgICAgICAgdmVyc2lvbmVkOiB0cnVlLFxuICAgICAgICAgIHJlbW92YWxQb2xpY3k6IFJlbW92YWxQb2xpY3kuREVTVFJPWSxcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICBjcmVhdGVQYXJhbXMoKSB7XG4gICAgLy8gRXhwb3J0IGZldyBwYXJhbWV0ZXJzIGZvciBhcHBsaWNhdGlvbiB1c2FnZVxuICAgIG5ldyBTdHJpbmdQYXJhbWV0ZXIoXG4gICAgICB0aGlzLCBcIkVLU0NsdXN0ZXJIYW5kbGVyUm9sZVwiLFxuICAgICAge1xuICAgICAgICBwYXJhbWV0ZXJOYW1lOiBgL2FjY291bnQvc3RhY2tzLyR7dGhpcy5zdGFja05hbWV9L2t1YmVjdGwtcm9sZWAsXG4gICAgICAgIHN0cmluZ1ZhbHVlOiB0aGlzLmVrc0NsdXN0ZXIua3ViZWN0bFJvbGUhLnJvbGVBcm4sXG4gICAgICAgIGRlc2NyaXB0aW9uOiBcIkt1YmVjdGwgUm9sZSBmb3Igc3RhY2sgb3BlcmF0aW9uc1wiXG4gICAgICB9XG4gICAgKTtcblxuICB9XG59XG4iXX0=
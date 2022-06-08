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
const common_1 = require("../utils/common");
const efs_1 = require("../efs/efs");
const efs_csi_driver_1 = require("./controllers/efs-csi-driver");
const load_balancer_controller_1 = require("./controllers/load-balancer-controller");
const cw_logging_monitoring_1 = require("./cw-logging-monitoring");
const external_dns_1 = require("./external-dns");
const aws_s3_1 = require("aws-cdk-lib/aws-s3");
const secrets_csi_driver_1 = require("./controllers/secrets-csi-driver");
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
}
exports.EKSCluster = EKSCluster;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWtzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZWtzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsMkNBQTRDO0FBQzVDLDJDQUE0QztBQUM1QywyQ0FBNEM7QUFDNUMsMkNBQTRDO0FBQzVDLG1DQUFvQztBQUNwQyw2Q0FBaUQ7QUFFakQsaURBQWdGO0FBQ2hGLGlEQVE2QjtBQUc3Qiw0Q0FBdUQ7QUFDdkQsb0NBQTRDO0FBQzVDLGlFQUFxRTtBQUNyRSxxRkFBeUY7QUFDekYsbUVBQWtFO0FBQ2xFLGlEQUFtRDtBQUVuRCwrQ0FBaUY7QUFDakYseUVBQTZFO0FBRTdFLHVDQUF5QjtBQUN6Qiw4Q0FBZ0M7QUFDaEMscUNBQStCO0FBRy9CLE1BQWEsVUFBVyxTQUFRLEdBQUcsQ0FBQyxLQUFLO0lBSXZDLFlBQVksS0FBZ0IsRUFBRSxFQUFVLEVBQUUsTUFBc0IsRUFBRSxLQUFzQjtRQUN0RixLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUN4QixJQUFJLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQztRQUVyQixNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7UUFFMUIsTUFBTSxrQkFBa0IsR0FBRyxJQUFJLENBQUMsd0JBQXdCLEVBQUUsQ0FBQztRQUUzRCxvQ0FBb0M7UUFDcEMsTUFBTSxVQUFVLEdBQUcsSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxlQUFlLEVBQUU7WUFDckQsU0FBUyxFQUFFLElBQUksR0FBRyxDQUFDLGdCQUFnQixDQUFDLG1CQUFtQixDQUFDO1lBQ3hELGVBQWUsRUFBRTtnQkFDZixHQUFHLENBQUMsYUFBYSxDQUFDLHdCQUF3QixDQUFDLDJCQUEyQixDQUFDO2dCQUN2RSxHQUFHLENBQUMsYUFBYSxDQUFDLHdCQUF3QixDQUFDLG9DQUFvQyxDQUFDO2dCQUNoRixHQUFHLENBQUMsYUFB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LEVBQUU7b0JBQ3RDLFVBQVUsRUFBRSxNQUFNLENBQUMsSUFBSTtvQkFDdkIsVUFBVSxFQUFFLHlCQUFnQixDQUFDLFVBQVU7b0JBQ3ZDLFVBQVUsRUFBRSxJQUFJO29CQUNoQixnQkFBZ0IsRUFBRSxLQUFLO29CQUN2QixpQkFBaUIsRUFBRSwwQkFBaUIsQ0FBQyxTQUFTO29CQUM5QyxTQUFTLEVBQUUsSUFBSTtvQkFDZixhQUFhLEVBQUUsMkJBQWEsQ0FBQyxPQUFPO2lCQUNyQyxDQUFDLENBQUM7YUFDSjtRQUNILENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztDQUNGO0FBclRELGdDQXFUQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBpYW0gPSByZXF1aXJlKCdhd3MtY2RrLWxpYi9hd3MtaWFtJyk7XG5pbXBvcnQgZWMyID0gcmVxdWlyZSgnYXdzLWNkay1saWIvYXdzLWVjMicpO1xuaW1wb3J0IGVrcyA9IHJlcXVpcmUoJ2F3cy1jZGstbGliL2F3cy1la3MnKTtcbmltcG9ydCBzc20gPSByZXF1aXJlKCdhd3MtY2RrLWxpYi9hd3Mtc3NtJyk7XG5pbXBvcnQgY2RrID0gcmVxdWlyZSgnYXdzLWNkay1saWInKTtcbmltcG9ydCB7IEF3cywgUmVtb3ZhbFBvbGljeSB9IGZyb20gJ2F3cy1jZGstbGliJztcbmltcG9ydCB7IElWcGMgfSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtZWMyJztcbmltcG9ydCB7IENhcGFjaXR5VHlwZSwgQ2x1c3RlciwgS3ViZXJuZXRlc01hbmlmZXN0IH0gZnJvbSAnYXdzLWNkay1saWIvYXdzLWVrcyc7XG5pbXBvcnQge1xuICBDb21wb3NpdGVQcmluY2lwYWwsXG4gIEVmZmVjdCxcbiAgUG9saWN5LFxuICBQb2xpY3lEb2N1bWVudCxcbiAgUG9saWN5U3RhdGVtZW50LFxuICBSb2xlLFxuICBTZXJ2aWNlUHJpbmNpcGFsLFxufSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtaWFtJztcbmltcG9ydCB7IENvbnN0cnVjdCB9IGZyb20gJ2NvbnN0cnVjdHMnO1xuaW1wb3J0IHsgRUtTU3RhY2tDb25maWcgfSBmcm9tICcuLi8uLi9pbnRlcmZhY2VzL2xpYi9la3MvaW50ZXJmYWNlcyc7XG5pbXBvcnQgeyBjb252ZXJ0U3RyaW5nVG9BcnJheSB9IGZyb20gJy4uL3V0aWxzL2NvbW1vbic7XG5pbXBvcnQgeyBFRlNOZXN0ZWRTdGFjayB9IGZyb20gJy4uL2Vmcy9lZnMnO1xuaW1wb3J0IHsgQXdzRUZTQ1NJRHJpdmVyTmVzdGVkIH0gZnJvbSAnLi9jb250cm9sbGVycy9lZnMtY3NpLWRyaXZlcic7XG5pbXBvcnQgeyBBd3NMb2FkQmFsYW5jZXJDb250cm9sbGVyTmVzdGVkIH0gZnJvbSAnLi9jb250cm9sbGVycy9sb2FkLWJhbGFuY2VyLWNvbnRyb2xsZXInO1xuaW1wb3J0IHsgQ2xvdWR3YXRjaExvZ2dpbmdOZXN0ZWQgfSBmcm9tICcuL2N3LWxvZ2dpbmctbW9uaXRvcmluZyc7XG5pbXBvcnQgeyBFeHRlcm5hbEROU05lc3RlZCB9IGZyb20gJy4vZXh0ZXJuYWwtZG5zJztcbmltcG9ydCB7IFNlbGVjdG9yIH0gZnJvbSAnYXdzLWNkay1saWIvYXdzLWVrcyc7XG5pbXBvcnQgeyBCbG9ja1B1YmxpY0FjY2VzcywgQnVja2V0LCBCdWNrZXRFbmNyeXB0aW9uIH0gZnJvbSAnYXdzLWNkay1saWIvYXdzLXMzJztcbmltcG9ydCB7IEF3c1NlY3JldHNDU0lEcml2ZXJOZXN0ZWQgfSBmcm9tICcuL2NvbnRyb2xsZXJzL3NlY3JldHMtY3NpLWRyaXZlcic7XG5cbmltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzJztcbmltcG9ydCAqIGFzIHlhbWwgZnJvbSAnanMteWFtbCc7XG5pbXBvcnQgeyBleGl0IH0gZnJvbSAncHJvY2Vzcyc7XG5cblxuZXhwb3J0IGNsYXNzIEVLU0NsdXN0ZXIgZXh0ZW5kcyBjZGsuU3RhY2sge1xuICBjb25maWc6IEVLU1N0YWNrQ29uZmlnO1xuICBla3NDbHVzdGVyOiBDbHVzdGVyO1xuXG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcsIGNvbmZpZzogRUtTU3RhY2tDb25maWcsIHByb3BzPzogY2RrLlN0YWNrUHJvcHMpIHtcbiAgICBzdXBlcihzY29wZSwgaWQsIHByb3BzKTtcbiAgICB0aGlzLmNvbmZpZyA9IGNvbmZpZztcblxuICAgIGNvbnN0IHZwYyA9IHRoaXMuZ2V0VlBDKCk7XG5cbiAgICBjb25zdCBjbHVzdGVySGFuZGxlclJvbGUgPSB0aGlzLmNyZWF0ZUNsdXN0ZXJIYW5kbGVyUm9sZSgpO1xuXG4gICAgLy8gSUFNIHJvbGUgZm9yIG91ciBFQzIgd29ya2VyIG5vZGVzXG4gICAgY29uc3Qgd29ya2VyUm9sZSA9IG5ldyBpYW0uUm9sZSh0aGlzLCAnRUtTV29ya2VyUm9sZScsIHtcbiAgICAgIGFzc3VtZWRCeTogbmV3IGlhbS5TZXJ2aWNlUHJpbmNpcGFsKCdlYzIuYW1hem9uYXdzLmNvbScpLFxuICAgICAgbWFuYWdlZFBvbGljaWVzOiBbXG4gICAgICAgIGlhbS5NYW5hZ2VkUG9saWN5LmZyb21Bd3NNYW5hZ2VkUG9saWN5TmFtZSgnQW1hem9uRUtTV29ya2VyTm9kZVBvbGljeScpLFxuICAgICAgICBpYW0uTWFuYWdlZFBvbGljeS5mcm9tQXdzTWFuYWdlZFBvbGljeU5hbWUoJ0FtYXpvbkVDMkNvbnRhaW5lclJlZ2lzdHJ5UmVhZE9ubHknKSxcbiAgICAgICAgaWFtLk1hbmFnZWRQb2xpY3kuZnJvbUF3c01hbmFnZWRQb2xpY3lOYW1lKCdBbWF6b25FS1NfQ05JX1BvbGljeScpLFxuICAgICAgICBpYW0uTWFuYWdlZFBvbGljeS5mcm9tQXdzTWFuYWdlZFBvbGljeU5hbWUoJ0Nsb3VkV2F0Y2hBZ2VudFNlcnZlclBvbGljeScpLFxuICAgICAgXSxcbiAgICB9KTtcblxuICAgIHRoaXMuZWtzQ2x1c3RlciA9IHRoaXMuY3JlYXRlRUtTQ2x1c3Rlcih2cGMsIGNvbmZpZywgY2x1c3RlckhhbmRsZXJSb2xlKTtcblxuICAgIGlmICh0aGlzLmNvbmZpZy5hbGxvd0FkbWluUm9sZSkge1xuICAgICAgY29uc3Qgcm9sZSA9IFJvbGUuZnJvbVJvbGVBcm4oXG4gICAgICAgIHRoaXMsXG4gICAgICAgICdBZG1pblJvbGVBdXRoJyxcbiAgICAgICAgYGFybjphd3M6aWFtOjoke0F3cy5BQ0NPVU5UX0lEfTpyb2xlLyR7dGhpcy5jb25maWcuYWxsb3dBZG1pblJvbGV9YCxcbiAgICAgICk7XG5cbiAgICAgIHRoaXMuZWtzQ2x1c3Rlci5hd3NBdXRoLmFkZFJvbGVNYXBwaW5nKHJvbGUsIHtcbiAgICAgICAgZ3JvdXBzOiBbJ3N5c3RlbTptYXN0ZXJzJ10sXG4gICAgICAgIHVzZXJuYW1lOiAnYWRtaW4nLFxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgLy8gV2Ugd2FudCB0byBjcmVhdGUgbmFtZXNwYWNlcyBmaXJzdCwgc28gdGhlIGRlcGVuZGVuY2llcyBhcmUgcmVzb2x2ZWQgYmV0d2VlbiBTQSBhbmQgY2hhcnQgaW5zdGFsbGF0aW9uLlxuICAgIC8vIERvIGl0IHNvb25lciBhcyB0aGVyZSBpcyBhIHNtYWxsIGRlbGF5IGJldHdlZW4gY3JlYXRpb24gb2YgbmFtZXNwYWNlIGFuZCBjcmVhdGlvbiBvZiBzZXJ2aWNlIGFjY291bnRcbiAgICB2YXIgbnM6IGVrcy5LdWJlcm5ldGVzTWFuaWZlc3RbXSA9IFtdO1xuICAgIGlmICh0aGlzLmNvbmZpZy5uYW1lc3BhY2VzKSB7XG4gICAgICBucyA9IHRoaXMuY3JlYXRlTmFtZXNwYWNlcyh0aGlzLmNvbmZpZy5uYW1lc3BhY2VzLCB0aGlzLmVrc0NsdXN0ZXIpO1xuICAgIH1cbiAgICAvLyBXZSBjcmVhdGUgcHJvZmlsZXMgb25jZSBhbGwgbmFtZXNwYWNlcyBhcmUgY3JlYXRlZC5cbiAgICB2YXIgcHJvZmlsZXM6IGVrcy5GYXJnYXRlUHJvZmlsZVtdID0gW107XG5cbiAgICBwcm9maWxlcyA9IHRoaXMuY3JlYXRlRmFyZ2F0ZVByb2ZpbGVzKHRoaXMuZWtzQ2x1c3RlciwgdnBjLCBucyk7XG4gICAgdGhpcy5jcmVhdGVXb3JrZXJOb2RlR3JvdXAodGhpcy5la3NDbHVzdGVyLCB3b3JrZXJSb2xlLCB2cGMpO1xuXG5cbiAgICAvLyBFbmFibGUgY2x1c3RlciBsb2dnaW5nIGFuZCBNb25pdG9yaW5nXG4gICAgbmV3IENsb3Vkd2F0Y2hMb2dnaW5nTmVzdGVkKHRoaXMsICdDbG91ZFdhdGNoTG9nZ2luZ05lc3RlZCcsIHRoaXMuZWtzQ2x1c3Rlcik7XG5cbiAgICAvLyBFeHRlcmFubCBETlMgcmVsYXRlZCBzdGFja1xuICAgIC8vIG5ldyBQcm9tZXRoZXVzU3RhY2sodGhpcywgJ1Byb21ldGhldXNTdGFjaycsIGVrc0NsdXN0ZXIpXG5cbiAgICBuZXcgQXdzTG9hZEJhbGFuY2VyQ29udHJvbGxlck5lc3RlZCh0aGlzLCAnQXdzTG9hZEJhbGFuY2VyQ29udHJvbGxlcicsIHRoaXMuZWtzQ2x1c3Rlcik7XG4gICAgbmV3IEF3c0VGU0NTSURyaXZlck5lc3RlZCh0aGlzLCAnQXdzRUZTQ1NJRHJpdmVyTmVzdGVkJywgdGhpcy5la3NDbHVzdGVyKTtcbiAgICBuZXcgQXdzU2VjcmV0c0NTSURyaXZlck5lc3RlZCh0aGlzLCAnQXdzU2VjcmV0c0NTSURyaXZlck5lc3RlZCcsIHRoaXMuZWtzQ2x1c3Rlcik7XG4gICAgbmV3IEV4dGVybmFsRE5TTmVzdGVkKHRoaXMsICdFeHRlcm5hbEROUycsIHRoaXMuZWtzQ2x1c3RlciwgdGhpcy5jb25maWcuZXh0ZXJuYWxETlMpO1xuXG4gICAgLy8gQ3JlYXRlIEVGUyBhcyBuZXN0ZWQgcmVzb3VyY2UgLS0gKioqIFRoaXMgd2lsbCBhbHNvIGRlcGxveSBTdG9yYWdlY2xhc3MgdG8gdGhlIGNsdXN0ZXJcbiAgICBjb25zdCBzID0gbmV3IEVGU05lc3RlZFN0YWNrKFxuICAgICAgdGhpcyxcbiAgICAgICdFRlNOZXN0ZWRTdGFjaycsXG4gICAgICB0aGlzLmNvbmZpZy5jbHVzdGVyTmFtZSxcbiAgICAgIHRoaXMuY29uZmlnLmVmcyxcbiAgICAgIHZwYyxcbiAgICAgIHRoaXMuZWtzQ2x1c3Rlci5jbHVzdGVyU2VjdXJpdHlHcm91cElkLFxuICAgICk7XG4gICAgLy8gU29tZXRpbWVzIGVrcyBjb21wbGV0aW9uIGhhcHBlbnMgc29vbmVyLiBUbyBlbnN1cmUgZXZlcnl0aGluZyBpcyBmaW5pc2hlZCBiZWZvcmUgbmV4dCBpdGVtIGlzIGV4ZWN1dGVkXG4gICAgbnMubWFwKG4gPT4gcy5ub2RlLmFkZERlcGVuZGVuY3kobikpXG5cbiAgICAvLyBXZSBjcmVhdGUgdGhpcyBhcyBhIHN0b3JhZ2UgY2xhc3NcbiAgICBjb25zdCBzYyA9IHRoaXMuY3JlYXRlU3RvcmFnZUNsYXNzKHMuZWZzLmZpbGVTeXN0ZW1JZCk7XG5cbiAgICAvLyBJbnN0YWxsIG90aGVyIGJpdHMgbGlrZSBTMyAsIHBvc3RncmVzIGV0YyB3aGljaCBuZWVkcyB0byBiZSBiZWZvcmUgdGhlIGNoYXJ0cyBhcmUgaW5zdGFsbGVkXG4gICAgdGhpcy5jcmVhdGVTM0J1Y2tldHMoKTtcblxuICB9XG5cbiAgY3JlYXRlU3RvcmFnZUNsYXNzKGZzSUQ6IHN0cmluZyk6IEt1YmVybmV0ZXNNYW5pZmVzdCB7XG4gICAgY29uc3Qgc2MgPSB0aGlzLmVrc0NsdXN0ZXIuYWRkTWFuaWZlc3QoJ0VGU1NDJywge1xuICAgICAgYXBpVmVyc2lvbjogJ3N0b3JhZ2UuazhzLmlvL3YxJyxcbiAgICAgIGtpbmQ6ICdTdG9yYWdlQ2xhc3MnLFxuICAgICAgbWV0YWRhdGE6IHtcbiAgICAgICAgbmFtZTogJ2Vmcy1zYycsXG4gICAgICB9LFxuICAgICAgcHJvdmlzaW9uZXI6ICdlZnMuY3NpLmF3cy5jb20nLFxuICAgICAgcGFyYW1ldGVyczoge1xuICAgICAgICBwcm92aXNpb25pbmdNb2RlOiAnZWZzLWFwJyxcbiAgICAgICAgZmlsZVN5c3RlbUlkOiBmc0lELFxuICAgICAgICBkaXJlY3RvcnlQZXJtczogJzA3MDAnLFxuICAgICAgfSxcbiAgICB9KTtcblxuICAgIHJldHVybiBzY1xuICB9XG5cbiAgZ2V0VlBDKCk6IGVjMi5JVnBjIHtcbiAgICBjb25zdCB2cGNJZCA9IHNzbS5TdHJpbmdQYXJhbWV0ZXIudmFsdWVGcm9tTG9va3VwKHRoaXMsICcvYWNjb3VudC92cGMvaWQnKTtcbiAgICBjb25zdCB2cGMgPSBlYzIuVnBjLmZyb21Mb29rdXAodGhpcywgJ1ZQQycsIHsgdnBjSWQ6IHZwY0lkIH0pO1xuXG4gICAgcmV0dXJuIHZwYztcbiAgfVxuXG4gIGNyZWF0ZUNsdXN0ZXJIYW5kbGVyUm9sZSgpOiBSb2xlIHtcbiAgICAvLyBXaGVuIHRoaXMgaXMgcGFzc2VkIGFzIHJvbGUsIEVLUyBjbHVzdGVyIHN1Y2Nlc3NmdWxseSBjcmVhdGVkKEkgdGhpbmsgdGhlcmUgaXMgYSBidWcgaW4gQ0RLKS5cbiAgICBjb25zdCBwb2xpY3lTdGF0ZW1lbnQgPSBuZXcgUG9saWN5U3RhdGVtZW50KHtcbiAgICAgIHNpZDogJ0Zha2VQb2xjaVN0YXRlbWVudCcsXG4gICAgICBhY3Rpb25zOiBbJ2xvZ3M6UHV0TG9nRXZlbnRzJ10sXG4gICAgICBlZmZlY3Q6IEVmZmVjdC5BTExPVyxcbiAgICAgIHJlc291cmNlczogWycqJ10sXG4gICAgfSk7XG5cbiAgICBjb25zdCBwb2xpY3lEb2N1bWVudCA9IG5ldyBQb2xpY3lEb2N1bWVudCh7XG4gICAgICBzdGF0ZW1lbnRzOiBbcG9saWN5U3RhdGVtZW50XSxcbiAgICB9KTtcblxuICAgIGNvbnN0IGNsdXN0ZXJIYW5kbGVyUm9sZSA9IG5ldyBSb2xlKHRoaXMsIGBDbHVzdGVySGFuZGxlclJvbGVgLCB7XG4gICAgICByb2xlTmFtZTogYCR7QXdzLlNUQUNLX05BTUV9LUNsdXN0ZXJIYW5kbGVyUm9sZWAsXG4gICAgICBkZXNjcmlwdGlvbjogYFJvbGUgZm9yIGxhbWJkYSBoYW5kbGVyYCxcbiAgICAgIGFzc3VtZWRCeTogbmV3IENvbXBvc2l0ZVByaW5jaXBhbChuZXcgU2VydmljZVByaW5jaXBhbCgnbGFtYmRhLmFtYXpvbmF3cy5jb20nKSksXG4gICAgICBpbmxpbmVQb2xpY2llczoge1xuICAgICAgICBBY2Nlc3NQb2xpY3k6IHBvbGljeURvY3VtZW50LFxuICAgICAgfSxcbiAgICB9KTtcblxuICAgIHJldHVybiBjbHVzdGVySGFuZGxlclJvbGU7XG4gIH1cblxuICBjcmVhdGVFS1NDbHVzdGVyKHZwYzogZWMyLklWcGMsIGNvbmZpZzogRUtTU3RhY2tDb25maWcsIGNsdXN0ZXJIYW5kbGVyUm9sZTogaWFtLlJvbGUpOiBla3MuQ2x1c3RlciB7XG4gICAgY29uc3Qgcm9sZSA9IFJvbGUuZnJvbVJvbGVBcm4oXG4gICAgICB0aGlzLFxuICAgICAgJ0FkbWluUm9sZScsXG4gICAgICBgYXJuOmF3czppYW06OiR7QXdzLkFDQ09VTlRfSUR9OnJvbGUvJHtBd3MuUkVHSU9OfS8ke3RoaXMuY29uZmlnLmFsbG93QWRtaW5Sb2xlfWAsXG4gICAgKTtcblxuICAgIGNvbnN0IGNsdXN0ZXIgPSBuZXcgZWtzLkNsdXN0ZXIodGhpcywgJ0NsdXN0ZXInLCB7XG4gICAgICBjbHVzdGVyTmFtZTogY29uZmlnLmNsdXN0ZXJOYW1lLFxuICAgICAgdnBjOiB2cGMsXG4gICAgICBkZWZhdWx0Q2FwYWNpdHk6IDAsIC8vIHdlIHdhbnQgdG8gbWFuYWdlIGNhcGFjaXR5IG91ciBzZWx2ZXNcbiAgICAgIHZlcnNpb246IGVrcy5LdWJlcm5ldGVzVmVyc2lvbi5WMV8yMSxcbiAgICAgIGNsdXN0ZXJIYW5kbGVyRW52aXJvbm1lbnQ6IHtcbiAgICAgICAgcm9sZUFybjogY2x1c3RlckhhbmRsZXJSb2xlLnJvbGVBcm4sXG4gICAgICB9LFxuICAgICAgdnBjU3VibmV0czogW3sgc3VibmV0VHlwZTogZWMyLlN1Ym5ldFR5cGUuUFJJVkFURV9XSVRIX05BVCB9XSxcbiAgICAgIHNlY3VyaXR5R3JvdXA6IG5ldyBlYzIuU2VjdXJpdHlHcm91cCh0aGlzLCAnQ2x1c3RlckNvbnRyb2xQYW5lU2VjdXJpdHlHcm91cCcsIHtcbiAgICAgICAgdnBjOiB2cGMsXG4gICAgICAgIGRlc2NyaXB0aW9uOiAnU2VjdXJpdHkgZ3JvdXAgZm9yIEVLUyBjbHVzdGVyIGNvbnRyb2wgcGxhbmUnLFxuICAgICAgfSksXG4gICAgICAvLyBtYXN0ZXJzUm9sZTogcm9sZSAvLyBPciBlbHNlIHdlIGFyZSB1bmFibGUgdG8gbG9naW5cbiAgICB9KTtcblxuICAgIHJldHVybiBjbHVzdGVyO1xuICB9XG5cbiAgY3JlYXRlV29ya2VyTm9kZUdyb3VwKGVrc0NsdXN0ZXI6IGVrcy5DbHVzdGVyLCB3b3JrZXJOb2RlUm9sZTogUm9sZSwgdnBjOiBJVnBjKSB7XG4gICAgZWtzQ2x1c3Rlci5hZGROb2RlZ3JvdXBDYXBhY2l0eSh0aGlzLmNvbmZpZy53b3JrZXJHcm91cE5hbWUsIHtcbiAgICAgIGluc3RhbmNlVHlwZXM6IGNvbnZlcnRTdHJpbmdUb0FycmF5KHRoaXMuY29uZmlnLndvcmtlckluc3RhbmNlVHlwZXMpLm1hcChcbiAgICAgICAgKGluc3RhbmNlVHlwZSkgPT4gbmV3IGVjMi5JbnN0YW5jZVR5cGUoaW5zdGFuY2VUeXBlKSxcbiAgICAgICksXG4gICAgICBub2RlZ3JvdXBOYW1lOiB0aGlzLmNvbmZpZy53b3JrZXJHcm91cE5hbWUsXG4gICAgICBub2RlUm9sZTogd29ya2VyTm9kZVJvbGUsXG4gICAgICBjYXBhY2l0eVR5cGU6IHRoaXMuY29uZmlnLndvcmtlckNhcGFjaXR5VHlwZSA9PT0gJ1NQT1QnID8gQ2FwYWNpdHlUeXBlLlNQT1QgOiBDYXBhY2l0eVR5cGUuT05fREVNQU5ELFxuICAgICAgc3VibmV0czogdnBjLnNlbGVjdFN1Ym5ldHMoeyBzdWJuZXRUeXBlOiBlYzIuU3VibmV0VHlwZS5QUklWQVRFX1dJVEhfTkFUIH0pLFxuICAgICAgZGVzaXJlZFNpemU6IE51bWJlcih0aGlzLmNvbmZpZy53b3JrZXJEZXNpcmVkU2l6ZSksXG4gICAgICBtaW5TaXplOiBOdW1iZXIodGhpcy5jb25maWcud29ya2VyTWluU2l6ZSksXG4gICAgICBtYXhTaXplOiBOdW1iZXIodGhpcy5jb25maWcud29ya2VyTWF4U2l6ZSksXG4gICAgfSk7XG4gIH1cblxuICAvLyBXaGVuIHVzaW5nIGZhcmdhdGUgZm9yIGZpcnN0IHRpbWUgeW91IG1heSBoYXZlIHRvIGNyZWF0ZSB0aGUgc2VydmljZSBsaW5rZWQgcm9sZVxuICAvLyBhd3MgaWFtIGNyZWF0ZS1zZXJ2aWNlLWxpbmtlZC1yb2xlIFxcXG4gIC8vIC0tYXdzLXNlcnZpY2UtbmFtZSBla3MtZmFyZ2F0ZS5hbWF6b25hd3MuY29tIFxcXG4gIC8vIC0tZGVzY3JpcHRpb24gXCJTZXJ2aWNlLWxpbmtlZCByb2xlIHRvIHN1cHBvcnQgZmFyZ2F0ZVwiXG5cbiAgY3JlYXRlRmFyZ2F0ZVByb2ZpbGVzKGNsdXN0ZXI6IGVrcy5DbHVzdGVyLCB2cGM6IElWcGMsIG5zOiBla3MuS3ViZXJuZXRlc01hbmlmZXN0W10pOiBla3MuRmFyZ2F0ZVByb2ZpbGVbXSB7XG5cbiAgICBjb25zdCBwb2xpY3kgPSB0aGlzLmNyZWF0ZUVLU0ZhcmdhdGVDbG91ZHdhdGNoUG9saWN5KClcblxuICAgIHZhciBwcm9maWxlczogZWtzLkZhcmdhdGVQcm9maWxlW10gPSBbXTtcbiAgICB0aGlzLmNvbmZpZy5mYXJnYXRlUHJvZmlsZXM/LmZvckVhY2goKHByb2ZpbGUpID0+IHtcblxuICAgICAgY29uc3QgcCA9IG5ldyBla3MuRmFyZ2F0ZVByb2ZpbGUodGhpcywgcHJvZmlsZS5uYW1lLCB7XG4gICAgICAgIGNsdXN0ZXIsXG4gICAgICAgIHNlbGVjdG9yczogcHJvZmlsZS5zZWxlY3RvcnMsXG4gICAgICAgIHZwYzogdnBjLFxuICAgICAgICBzdWJuZXRTZWxlY3Rpb246IHZwYy5zZWxlY3RTdWJuZXRzKHsgc3VibmV0VHlwZTogZWMyLlN1Ym5ldFR5cGUuUFJJVkFURV9XSVRIX05BVCB9KSxcbiAgICAgIH0pO1xuICAgICAgLy8gdGhpcyBpcyByZXF1aXJlZCBmb3IgbG9nZ2luZ1xuICAgICAgcC5wb2RFeGVjdXRpb25Sb2xlLmF0dGFjaElubGluZVBvbGljeShwb2xpY3kpXG5cbiAgICAgIHByb2ZpbGVzLnB1c2gocCk7XG5cbiAgICB9KTtcblxuICAgIC8vIEVuYWJsZSBhdXRvbWF0aWMgY2xvdWR3d2F0Y2ggbG9nZ2luZyBmb3IgdGhlIHNhbWUuIFRoaXMgcmVxdWlyZXMgYSBuYW1lc3BhY2UgYW5kIGEgY29uZmlnIG1hcFxuXG4gICAgY29uc3QgbmFtZXNwYWNlID0gY2x1c3Rlci5hZGRNYW5pZmVzdCgnYXdzLW9ic2VydmFiaWxpdHknLCB7XG4gICAgICBhcGlWZXJzaW9uOiAndjEnLFxuICAgICAga2luZDogJ05hbWVzcGFjZScsXG4gICAgICBtZXRhZGF0YTogeyBuYW1lOiAnYXdzLW9ic2VydmFiaWxpdHknLCBsYWJlbHM6IHsgJ2F3cy1vYnNlcnZhYmlsaXR5JzogJ2VuYWJsZWQnIH0gfSxcbiAgICB9KTtcblxuICAgIC8vIHlhbWxcbiAgICBsZXQgZGF0YVJlc3VsdDogUmVjb3JkPHN0cmluZywgb2JqZWN0PltdID0gW107XG4gICAgdHJ5IHtcblxuICAgICAgY29uc3QgcGF0aCA9IHJlcXVpcmUoJ3BhdGgnKTtcblxuICAgICAgbGV0IHZhbHVlc1lhbWwgPSBmcy5yZWFkRmlsZVN5bmMocGF0aC5qb2luKF9fZGlybmFtZSwgYC4vbWFuaWZlc3RzL2ZhcmdhdGUtY2xvdWR3YXRjaC1sb2dnaW5nLnlhbWxgKSk7XG4gICAgICAvLyBSZXBsYWNlIERvbWFpbiBhbmQgbG9hZCBZQU1MXG4gICAgICBsZXQgdmFsdWVzUGFyc2VkID0geWFtbC5sb2FkQWxsKHZhbHVlc1lhbWwudG9TdHJpbmcoKVxuICAgICAgICAucmVwbGFjZShuZXcgUmVnRXhwKCd7QVdTX1JFR0lPTn0nLCAnZ2knKSwgQXdzLlJFR0lPTilcbiAgICAgICAgLnJlcGxhY2UobmV3IFJlZ0V4cCgne0NMVVNURVJfTkFNRX0nLCAnZ2knKSwgY2x1c3Rlci5jbHVzdGVyTmFtZSlcbiAgICAgICAgKTtcbiAgICAgIGlmICh0eXBlb2YgdmFsdWVzUGFyc2VkID09PSAnb2JqZWN0JyAmJiB2YWx1ZXNQYXJzZWQgIT09IG51bGwpIHtcbiAgICAgICAgZGF0YVJlc3VsdCA9IHZhbHVlc1BhcnNlZCBhcyBSZWNvcmQ8c3RyaW5nLCBvYmplY3Q+W107XG4gICAgICB9XG4gICAgfSBjYXRjaCAoZXhjZXB0aW9uKSB7XG4gICAgICBjb25zb2xlLmVycm9yKFwiID4gRmFpbGVkIHRvIGxvYWQgJ2ZhcmdhdGUtY2xvdWR3YXRjaC1sb2dnaW5nLnlhbWwnIGZvciAnRUtTIENsdXN0ZXInIGRlcGxveS4uLlwiKTtcbiAgICAgIGNvbnNvbGUuZXJyb3IoZXhjZXB0aW9uKTtcbiAgICAgIGV4aXRcbiAgICB9XG5cbiAgICBkYXRhUmVzdWx0LmZvckVhY2goZnVuY3Rpb24gKHZhbCwgaWR4KSB7XG4gICAgICBjb25zdCBhICA9IGNsdXN0ZXIuYWRkTWFuaWZlc3QoJ2ZhcmdhdGUtY2xvdWR3YXRjaC1sb2dnaW5nLScgKyBpZHgsIHZhbCk7XG4gICAgICBhLm5vZGUuYWRkRGVwZW5kZW5jeShuYW1lc3BhY2UpXG4gICAgfSk7XG5cbiAgICByZXR1cm4gcHJvZmlsZXM7XG4gIH1cblxuICBjcmVhdGVFS1NGYXJnYXRlQ2xvdWR3YXRjaFBvbGljeSgpOiBQb2xpY3kge1xuICAgIC8vIGVhY2ggcG9kIGV4ZWN1dGlvbiByb2xlIG5lZWRzIHRvIGhhdmUgdGhlIHBvbGljeVxuICAgIGNvbnN0IGlhbVBvbGljeURvY3VtZW50ID0gSlNPTi5wYXJzZShge1xuICAgICAgXCJWZXJzaW9uXCI6IFwiMjAxMi0xMC0xN1wiLFxuICAgICAgXCJTdGF0ZW1lbnRcIjogW3tcbiAgICAgICAgXCJFZmZlY3RcIjogXCJBbGxvd1wiLFxuICAgICAgICBcIkFjdGlvblwiOiBbXG4gICAgICAgICAgXCJsb2dzOkNyZWF0ZUxvZ1N0cmVhbVwiLFxuICAgICAgICAgIFwibG9nczpDcmVhdGVMb2dHcm91cFwiLFxuICAgICAgICAgIFwibG9nczpEZXNjcmliZUxvZ1N0cmVhbXNcIixcbiAgICAgICAgICBcImxvZ3M6UHV0TG9nRXZlbnRzXCJcbiAgICAgICAgXSxcbiAgICAgICAgXCJSZXNvdXJjZVwiOiBcIipcIlxuICAgICAgfV1cbiAgICB9YClcblxuICAgIC8vIENyZWF0ZSBJQU0gUG9saWN5XG4gICAgY29uc3QgaWFtUG9saWN5ID0gbmV3IFBvbGljeSh0aGlzLCAnRUtTRmFyZ2F0ZUxvZ2dpbmdQb2xpY3knLCB7XG4gICAgICBwb2xpY3lOYW1lOiAnRUtTRmFyZ2F0ZUxvZ2dpbmdQb2xpY3knLFxuICAgICAgZG9jdW1lbnQ6IFBvbGljeURvY3VtZW50LmZyb21Kc29uKGlhbVBvbGljeURvY3VtZW50KSxcbiAgICB9KTtcblxuICAgIHJldHVybiBpYW1Qb2xpY3lcbiAgfVxuXG4gIGNyZWF0ZU5hbWVzcGFjZXMoc2VsZWN0b3JzOiBTZWxlY3RvcltdLCBjbHVzdGVyOiBla3MuQ2x1c3Rlcik6IGVrcy5LdWJlcm5ldGVzTWFuaWZlc3RbXSB7XG4gICAgLy8gQ3JlYXRlcyBuYW1lc3BhY2UgIGZvciBmYXJnYXRlIHByb2ZpbGVzXG5cbiAgICB2YXIgbnM6IGVrcy5LdWJlcm5ldGVzTWFuaWZlc3RbXSA9IFtdO1xuXG4gICAgc2VsZWN0b3JzLmZvckVhY2goKHNlbGVjdG9yKSA9PiB7XG4gICAgICBjb25zdCBuYW1lc3BhY2UgPSB7XG4gICAgICAgIGFwaVZlcnNpb246ICd2MScsXG4gICAgICAgIGtpbmQ6ICdOYW1lc3BhY2UnLFxuICAgICAgICBtZXRhZGF0YTogeyBuYW1lOiBzZWxlY3Rvci5uYW1lc3BhY2UgfSxcbiAgICAgIH07XG5cbiAgICAgIG5zLnB1c2goXG4gICAgICAgIG5ldyBla3MuS3ViZXJuZXRlc01hbmlmZXN0KHRoaXMsIGAke3NlbGVjdG9yLm5hbWVzcGFjZX1OU2AsIHtcbiAgICAgICAgICBjbHVzdGVyLFxuICAgICAgICAgIG1hbmlmZXN0OiBbbmFtZXNwYWNlXSxcbiAgICAgICAgfSksXG4gICAgICApO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIG5zO1xuICB9XG5cbiAgY3JlYXRlUzNCdWNrZXRzKCk6IHZvaWQge1xuICAgIHRoaXMuY29uZmlnLnMzQnVja2V0cz8uZm9yRWFjaChidWNrZXQgPT4ge1xuICAgICAgaWYgKGJ1Y2tldC5pc1ByaXZhdGVXaXRoQ29ycykge1xuICAgICAgICBjb25zdCBiID0gbmV3IEJ1Y2tldCh0aGlzLCBidWNrZXQubmFtZSwge1xuICAgICAgICAgIGJ1Y2tldE5hbWU6IGJ1Y2tldC5uYW1lLFxuICAgICAgICAgIGVuY3J5cHRpb246IEJ1Y2tldEVuY3J5cHRpb24uUzNfTUFOQUdFRCxcbiAgICAgICAgICBlbmZvcmNlU1NMOiB0cnVlLFxuICAgICAgICAgIHB1YmxpY1JlYWRBY2Nlc3M6IGZhbHNlLFxuICAgICAgICAgIGJsb2NrUHVibGljQWNjZXNzOiBCbG9ja1B1YmxpY0FjY2Vzcy5CTE9DS19BTEwsXG4gICAgICAgICAgY29yczogYnVja2V0LmNvcnMsXG4gICAgICAgICAgdmVyc2lvbmVkOiB0cnVlLFxuICAgICAgICAgIHJlbW92YWxQb2xpY3k6IFJlbW92YWxQb2xpY3kuREVTVFJPWSxcbiAgICAgICAgfSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb25zdCBiID0gbmV3IEJ1Y2tldCh0aGlzLCBidWNrZXQubmFtZSwge1xuICAgICAgICAgIGJ1Y2tldE5hbWU6IGJ1Y2tldC5uYW1lLFxuICAgICAgICAgIGVuY3J5cHRpb246IEJ1Y2tldEVuY3J5cHRpb24uUzNfTUFOQUdFRCxcbiAgICAgICAgICBlbmZvcmNlU1NMOiB0cnVlLFxuICAgICAgICAgIHB1YmxpY1JlYWRBY2Nlc3M6IGZhbHNlLFxuICAgICAgICAgIGJsb2NrUHVibGljQWNjZXNzOiBCbG9ja1B1YmxpY0FjY2Vzcy5CTE9DS19BTEwsXG4gICAgICAgICAgdmVyc2lvbmVkOiB0cnVlLFxuICAgICAgICAgIHJlbW92YWxQb2xpY3k6IFJlbW92YWxQb2xpY3kuREVTVFJPWSxcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cbn1cbiJdfQ==
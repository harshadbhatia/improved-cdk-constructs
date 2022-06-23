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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWtzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZWtzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsMkNBQTRDO0FBQzVDLDJDQUE0QztBQUM1QywyQ0FBNEM7QUFDNUMsMkNBQTRDO0FBQzVDLG1DQUFvQztBQUNwQyw2Q0FBaUQ7QUFFakQsaURBQXNFO0FBQ3RFLGlEQVE2QjtBQUM3QiwrQ0FBaUY7QUFHakYsNENBQXVEO0FBQ3ZELGlFQUErRDtBQUMvRCxxRkFBbUY7QUFDbkYseUVBQXVFO0FBQ3ZFLG1FQUE0RDtBQUM1RCxpREFBNkM7QUFFN0MsaURBQXNEO0FBQ3RELHVDQUF5QjtBQUN6Qiw4Q0FBZ0M7QUFDaEMscUNBQStCO0FBRy9CLE1BQWEsVUFBVyxTQUFRLEdBQUcsQ0FBQyxLQUFLO0lBSXZDLFlBQVksS0FBZ0IsRUFBRSxFQUFVLEVBQUUsTUFBc0IsRUFBRSxLQUFzQjtRQUN0RixLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUN4QixJQUFJLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQztRQUVyQixNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7UUFFMUIsTUFBTSxrQkFBa0IsR0FBRyxJQUFJLENBQUMsd0JBQXdCLEVBQUUsQ0FBQztRQUUzRCxvQ0FBb0M7UUFDcEMsTUFBTSxVQUFVLEdBQUcsSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxlQUFlLEVBQUU7WUFDckQsU0FBUyxFQUFFLElBQUksR0FBRyxDQUFDLGdCQUFnQixDQUFDLG1CQUFtQixDQUFDO1lBQ3hELGVBQWUsRUFBRTtnQkFDZixHQUFHLENBQUMsYUFBYSxDQUFDLHdCQUF3QixDQUFDLDJCQUEyQixDQUFDO2dCQUN2RSxHQUFHLENBQUMsYUFBYSxDQUFDLHdCQUF3QixDQUFDLG9DQUFvQyxDQUFDO2dCQUNoRixHQUFHLENBQUMsYUFB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QUksRUFBRTtvQkFDdEMsVUFBVSxFQUFFLE1BQU0sQ0FBQyxJQUFJO29CQUN2QixVQUFVLEVBQUUseUJBQWdCLENBQUMsVUFBVTtvQkFDdkMsVUFBVSxFQUFFLElBQUk7b0JBQ2hCLGdCQUFnQixFQUFFLEtBQUs7b0JBQ3ZCLGlCQUFpQixFQUFFLDBCQUFpQixDQUFDLFNBQVM7b0JBQzlDLElBQUksRUFBRSxNQUFNLENBQUMsSUFBSTtvQkFDakIsU0FBUyxFQUFFLElBQUk7b0JBQ2YsYUFBYSxFQUFFLDJCQUFhLENBQUMsT0FBTztpQkFDckMsQ0FBQyxDQUFDO2FBQ0o7aUJBQU07Z0JBQ0wsTUFBTSxDQUFDLEdBQUcsSUFBSSxlQUFNLENBQUMsSUFBSSxFQUFFLE1BQU0sQ0FBQyxJQUFJLEVBQUU7b0JBQ3RDLFVBQVUsRUFBRSxNQUFNLENBQUMsSUFBSTtvQkFDdkIsVUFBVSxFQUFFLHlCQUFnQixDQUFDLFVBQVU7b0JBQ3ZDLFVBQVUsRUFBRSxJQUFJO29CQUNoQixnQkFBZ0IsRUFBRSxLQUFLO29CQUN2QixpQkFBaUIsRUFBRSwwQkFBaUIsQ0FBQyxTQUFTO29CQUM5QyxTQUFTLEVBQUUsSUFBSTtvQkFDZixhQUFhLEVBQUUsMkJBQWEsQ0FBQyxPQUFPO2lCQUNyQyxDQUFDLENBQUM7YUFDSjtRQUNILENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztJQUVELFlBQVk7UUFDViw4Q0FBOEM7UUFDOUMsSUFBSSx5QkFBZSxDQUNqQixJQUFJLEVBQUUsdUJBQXVCLEVBQzdCO1lBQ0UsYUFBYSxFQUFFLG1CQUFtQixJQUFJLENBQUMsU0FBUyxlQUFlO1lBQy9ELFdBQVcsRUFBRSxJQUFJLENBQUMsVUFBVSxDQUFDLFdBQVksQ0FBQyxPQUFPO1lBQ2pELFdBQVcsRUFBRSxtQ0FBbUM7U0FDakQsQ0FDRixDQUFDO0lBRUosQ0FBQztDQUNGO0FBelNELGdDQXlTQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBpYW0gPSByZXF1aXJlKCdhd3MtY2RrLWxpYi9hd3MtaWFtJyk7XG5pbXBvcnQgZWMyID0gcmVxdWlyZSgnYXdzLWNkay1saWIvYXdzLWVjMicpO1xuaW1wb3J0IGVrcyA9IHJlcXVpcmUoJ2F3cy1jZGstbGliL2F3cy1la3MnKTtcbmltcG9ydCBzc20gPSByZXF1aXJlKCdhd3MtY2RrLWxpYi9hd3Mtc3NtJyk7XG5pbXBvcnQgY2RrID0gcmVxdWlyZSgnYXdzLWNkay1saWInKTtcbmltcG9ydCB7IEF3cywgUmVtb3ZhbFBvbGljeSB9IGZyb20gJ2F3cy1jZGstbGliJztcbmltcG9ydCB7IElWcGMgfSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtZWMyJztcbmltcG9ydCB7IENhcGFjaXR5VHlwZSwgQ2x1c3RlciwgU2VsZWN0b3IgfSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtZWtzJztcbmltcG9ydCB7XG4gIENvbXBvc2l0ZVByaW5jaXBhbCxcbiAgRWZmZWN0LFxuICBQb2xpY3ksXG4gIFBvbGljeURvY3VtZW50LFxuICBQb2xpY3lTdGF0ZW1lbnQsXG4gIFJvbGUsXG4gIFNlcnZpY2VQcmluY2lwYWxcbn0gZnJvbSAnYXdzLWNkay1saWIvYXdzLWlhbSc7XG5pbXBvcnQgeyBCbG9ja1B1YmxpY0FjY2VzcywgQnVja2V0LCBCdWNrZXRFbmNyeXB0aW9uIH0gZnJvbSAnYXdzLWNkay1saWIvYXdzLXMzJztcbmltcG9ydCB7IENvbnN0cnVjdCB9IGZyb20gJ2NvbnN0cnVjdHMnO1xuaW1wb3J0IHsgRUtTU3RhY2tDb25maWcgfSBmcm9tICcuLi8uLi9pbnRlcmZhY2VzL2xpYi9la3MvaW50ZXJmYWNlcyc7XG5pbXBvcnQgeyBjb252ZXJ0U3RyaW5nVG9BcnJheSB9IGZyb20gJy4uL3V0aWxzL2NvbW1vbic7XG5pbXBvcnQgeyBBd3NFRlNDU0lEcml2ZXIgfSBmcm9tICcuL2NvbnRyb2xsZXJzL2Vmcy1jc2ktZHJpdmVyJztcbmltcG9ydCB7IEF3c0xvYWRCYWxhbmNlckNvbnRyb2xsZXIgfSBmcm9tICcuL2NvbnRyb2xsZXJzL2xvYWQtYmFsYW5jZXItY29udHJvbGxlcic7XG5pbXBvcnQgeyBBd3NTZWNyZXRzQ1NJRHJpdmVyIH0gZnJvbSAnLi9jb250cm9sbGVycy9zZWNyZXRzLWNzaS1kcml2ZXInO1xuaW1wb3J0IHsgQ2xvdWR3YXRjaExvZ2dpbmcgfSBmcm9tICcuL2N3LWxvZ2dpbmctbW9uaXRvcmluZyc7XG5pbXBvcnQgeyBFeHRlcm5hbEROUyB9IGZyb20gJy4vZXh0ZXJuYWwtZG5zJztcblxuaW1wb3J0IHsgU3RyaW5nUGFyYW1ldGVyIH0gZnJvbSAnYXdzLWNkay1saWIvYXdzLXNzbSc7XG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcyc7XG5pbXBvcnQgKiBhcyB5YW1sIGZyb20gJ2pzLXlhbWwnO1xuaW1wb3J0IHsgZXhpdCB9IGZyb20gJ3Byb2Nlc3MnO1xuXG5cbmV4cG9ydCBjbGFzcyBFS1NDbHVzdGVyIGV4dGVuZHMgY2RrLlN0YWNrIHtcbiAgY29uZmlnOiBFS1NTdGFja0NvbmZpZztcbiAgZWtzQ2x1c3RlcjogQ2x1c3RlcjtcblxuICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nLCBjb25maWc6IEVLU1N0YWNrQ29uZmlnLCBwcm9wcz86IGNkay5TdGFja1Byb3BzKSB7XG4gICAgc3VwZXIoc2NvcGUsIGlkLCBwcm9wcyk7XG4gICAgdGhpcy5jb25maWcgPSBjb25maWc7XG5cbiAgICBjb25zdCB2cGMgPSB0aGlzLmdldFZQQygpO1xuXG4gICAgY29uc3QgY2x1c3RlckhhbmRsZXJSb2xlID0gdGhpcy5jcmVhdGVDbHVzdGVySGFuZGxlclJvbGUoKTtcblxuICAgIC8vIElBTSByb2xlIGZvciBvdXIgRUMyIHdvcmtlciBub2Rlc1xuICAgIGNvbnN0IHdvcmtlclJvbGUgPSBuZXcgaWFtLlJvbGUodGhpcywgJ0VLU1dvcmtlclJvbGUnLCB7XG4gICAgICBhc3N1bWVkQnk6IG5ldyBpYW0uU2VydmljZVByaW5jaXBhbCgnZWMyLmFtYXpvbmF3cy5jb20nKSxcbiAgICAgIG1hbmFnZWRQb2xpY2llczogW1xuICAgICAgICBpYW0uTWFuYWdlZFBvbGljeS5mcm9tQXdzTWFuYWdlZFBvbGljeU5hbWUoJ0FtYXpvbkVLU1dvcmtlck5vZGVQb2xpY3knKSxcbiAgICAgICAgaWFtLk1hbmFnZWRQb2xpY3kuZnJvbUF3c01hbmFnZWRQb2xpY3lOYW1lKCdBbWF6b25FQzJDb250YWluZXJSZWdpc3RyeVJlYWRPbmx5JyksXG4gICAgICAgIGlhbS5NYW5hZ2VkUG9saWN5LmZyb21Bd3NNYW5hZ2VkUG9saWN5TmFtZSgnQW1hem9uRUtTX0NOSV9Qb2xpY3knKSxcbiAgICAgICAgaWFtLk1hbmFnZWRQb2xpY3kuZnJvbUF3c01hbmFnZWRQb2xpY3lOYW1lKCdDbG91ZFdhdGNoQWdlbnRTZXJ2ZXJQb2xpY3knKSxcbiAgICAgIF0sXG4gICAgfSk7XG5cbiAgICB0aGlzLmVrc0NsdXN0ZXIgPSB0aGlzLmNyZWF0ZUVLU0NsdXN0ZXIodnBjLCBjb25maWcsIGNsdXN0ZXJIYW5kbGVyUm9sZSk7XG5cbiAgICBpZiAodGhpcy5jb25maWcuYWxsb3dBZG1pblJvbGUpIHtcbiAgICAgIGNvbnN0IHJvbGUgPSBSb2xlLmZyb21Sb2xlQXJuKFxuICAgICAgICB0aGlzLFxuICAgICAgICAnQWRtaW5Sb2xlQXV0aCcsXG4gICAgICAgIGBhcm46YXdzOmlhbTo6JHtBd3MuQUNDT1VOVF9JRH06cm9sZS8ke3RoaXMuY29uZmlnLmFsbG93QWRtaW5Sb2xlfWAsXG4gICAgICApO1xuXG4gICAgICB0aGlzLmVrc0NsdXN0ZXIuYXdzQXV0aC5hZGRSb2xlTWFwcGluZyhyb2xlLCB7XG4gICAgICAgIGdyb3VwczogW1wic3lzdGVtOmJvb3RzdHJhcHBlcnNcIiwgXCJzeXN0ZW06bm9kZXNcIiwgXCJzeXN0ZW06bWFzdGVyc1wiXSxcbiAgICAgICAgdXNlcm5hbWU6ICdhZG1pbicsXG4gICAgICB9KTtcbiAgICB9XG5cbiAgICAvLyBXZSB3YW50IHRvIGNyZWF0ZSBuYW1lc3BhY2VzIGZpcnN0LCBzbyB0aGUgZGVwZW5kZW5jaWVzIGFyZSByZXNvbHZlZCBiZXR3ZWVuIFNBIGFuZCBjaGFydCBpbnN0YWxsYXRpb24uXG4gICAgLy8gRG8gaXQgc29vbmVyIGFzIHRoZXJlIGlzIGEgc21hbGwgZGVsYXkgYmV0d2VlbiBjcmVhdGlvbiBvZiBuYW1lc3BhY2UgYW5kIGNyZWF0aW9uIG9mIHNlcnZpY2UgYWNjb3VudFxuICAgIHZhciBuczogZWtzLkt1YmVybmV0ZXNNYW5pZmVzdFtdID0gW107XG4gICAgaWYgKHRoaXMuY29uZmlnLm5hbWVzcGFjZXMpIHtcbiAgICAgIG5zID0gdGhpcy5jcmVhdGVOYW1lc3BhY2VzKHRoaXMuY29uZmlnLm5hbWVzcGFjZXMsIHRoaXMuZWtzQ2x1c3Rlcik7XG4gICAgfVxuICAgIC8vIFdlIGNyZWF0ZSBwcm9maWxlcyBvbmNlIGFsbCBuYW1lc3BhY2VzIGFyZSBjcmVhdGVkLlxuICAgIHZhciBwcm9maWxlczogZWtzLkZhcmdhdGVQcm9maWxlW10gPSBbXTtcblxuICAgIHByb2ZpbGVzID0gdGhpcy5jcmVhdGVGYXJnYXRlUHJvZmlsZXModGhpcy5la3NDbHVzdGVyLCB2cGMsIG5zKTtcbiAgICB0aGlzLmNyZWF0ZVdvcmtlck5vZGVHcm91cCh0aGlzLmVrc0NsdXN0ZXIsIHdvcmtlclJvbGUsIHZwYyk7XG5cbiAgICAvLyBFbmFibGUgY2x1c3RlciBsb2dnaW5nIGFuZCBNb25pdG9yaW5nXG4gICAgbmV3IENsb3Vkd2F0Y2hMb2dnaW5nKHRoaXMsICdDbG91ZFdhdGNoTG9nZ2luZ05lc3RlZCcsIHRoaXMuZWtzQ2x1c3Rlcik7XG5cbiAgICAvLyBFeHRlcmFubCBETlMgcmVsYXRlZCBzdGFja1xuICAgIC8vIG5ldyBQcm9tZXRoZXVzU3RhY2sodGhpcywgJ1Byb21ldGhldXNTdGFjaycsIGVrc0NsdXN0ZXIpXG5cbiAgICBuZXcgQXdzTG9hZEJhbGFuY2VyQ29udHJvbGxlcih0aGlzLCAnQXdzTG9hZEJhbGFuY2VyQ29udHJvbGxlcicsIHRoaXMuZWtzQ2x1c3Rlcik7XG4gICAgbmV3IEF3c0VGU0NTSURyaXZlcih0aGlzLCAnQXdzRUZTQ1NJRHJpdmVyJywgdGhpcy5la3NDbHVzdGVyKTtcbiAgICBuZXcgQXdzU2VjcmV0c0NTSURyaXZlcih0aGlzLCAnQXdzU2VjcmV0c0NTSURyaXZlcicsIHRoaXMuZWtzQ2x1c3Rlcik7XG4gICAgbmV3IEV4dGVybmFsRE5TKHRoaXMsICdFeHRlcm5hbEROUycsIHtcbiAgICAgIGNsdXN0ZXJOYW1lOiBjb25maWcuY2x1c3Rlck5hbWUsXG4gICAgICBla3NDbHVzdGVyOiB0aGlzLmVrc0NsdXN0ZXIsXG4gICAgICBkb21haW5GaWx0ZXI6IHRoaXMuY29uZmlnLmV4dGVybmFsRE5TLmRvbWFpbkZpbHRlclxuICAgIH0pO1xuXG4gICAgLy8gRm9yIEVGUyByZWxhdGVkIHN0YWNrIC0gY2hlY2tvdXQgZWZzLWVrcy1pbnRlZ3JhdGlvbiBzdGFja1xuICAgIC8vIEluc3RhbGwgb3RoZXIgYml0cyBsaWtlIFMzICwgcG9zdGdyZXMgZXRjIHdoaWNoIG5lZWRzIHRvIGJlIGJlZm9yZSB0aGUgY2hhcnRzIGFyZSBpbnN0YWxsZWRcbiAgICB0aGlzLmNyZWF0ZVMzQnVja2V0cygpO1xuXG4gICAgdGhpcy5jcmVhdGVQYXJhbXMoKVxuXG4gIH1cblxuXG5cbiAgZ2V0VlBDKCk6IGVjMi5JVnBjIHtcbiAgICBjb25zdCB2cGNJZCA9IHNzbS5TdHJpbmdQYXJhbWV0ZXIudmFsdWVGcm9tTG9va3VwKHRoaXMsICcvYWNjb3VudC92cGMvaWQnKTtcbiAgICBjb25zdCB2cGMgPSBlYzIuVnBjLmZyb21Mb29rdXAodGhpcywgJ1ZQQycsIHsgdnBjSWQ6IHZwY0lkIH0pO1xuXG4gICAgcmV0dXJuIHZwYztcbiAgfVxuXG4gIGNyZWF0ZUNsdXN0ZXJIYW5kbGVyUm9sZSgpOiBSb2xlIHtcbiAgICAvLyBXaGVuIHRoaXMgaXMgcGFzc2VkIGFzIHJvbGUsIEVLUyBjbHVzdGVyIHN1Y2Nlc3NmdWxseSBjcmVhdGVkKEkgdGhpbmsgdGhlcmUgaXMgYSBidWcgaW4gQ0RLKS5cbiAgICBjb25zdCBwb2xpY3lTdGF0ZW1lbnQgPSBuZXcgUG9saWN5U3RhdGVtZW50KHtcbiAgICAgIHNpZDogJ0Zha2VQb2xpY3lTdGF0ZW1lbnQnLFxuICAgICAgYWN0aW9uczogWydsb2dzOlB1dExvZ0V2ZW50cyddLFxuICAgICAgZWZmZWN0OiBFZmZlY3QuQUxMT1csXG4gICAgICByZXNvdXJjZXM6IFsnKiddLFxuICAgIH0pO1xuXG4gICAgY29uc3QgcG9saWN5RG9jdW1lbnQgPSBuZXcgUG9saWN5RG9jdW1lbnQoe1xuICAgICAgc3RhdGVtZW50czogW3BvbGljeVN0YXRlbWVudF0sXG4gICAgfSk7XG5cbiAgICBjb25zdCBjbHVzdGVySGFuZGxlclJvbGUgPSBuZXcgUm9sZSh0aGlzLCBgQ2x1c3RlckhhbmRsZXJSb2xlYCwge1xuICAgICAgcm9sZU5hbWU6IGAke0F3cy5TVEFDS19OQU1FfS1DbHVzdGVySGFuZGxlclJvbGVgLFxuICAgICAgZGVzY3JpcHRpb246IGBSb2xlIGZvciBsYW1iZGEgaGFuZGxlcmAsXG4gICAgICBhc3N1bWVkQnk6IG5ldyBDb21wb3NpdGVQcmluY2lwYWwobmV3IFNlcnZpY2VQcmluY2lwYWwoJ2xhbWJkYS5hbWF6b25hd3MuY29tJykpLFxuICAgICAgaW5saW5lUG9saWNpZXM6IHtcbiAgICAgICAgQWNjZXNzUG9saWN5OiBwb2xpY3lEb2N1bWVudCxcbiAgICAgIH0sXG4gICAgfSk7XG5cbiAgICByZXR1cm4gY2x1c3RlckhhbmRsZXJSb2xlO1xuICB9XG5cbiAgY3JlYXRlRUtTQ2x1c3Rlcih2cGM6IGVjMi5JVnBjLCBjb25maWc6IEVLU1N0YWNrQ29uZmlnLCBjbHVzdGVySGFuZGxlclJvbGU6IGlhbS5Sb2xlKTogZWtzLkNsdXN0ZXIge1xuICAgIGNvbnN0IHJvbGUgPSBSb2xlLmZyb21Sb2xlQXJuKFxuICAgICAgdGhpcyxcbiAgICAgICdBZG1pblJvbGUnLFxuICAgICAgYGFybjphd3M6aWFtOjoke0F3cy5BQ0NPVU5UX0lEfTpyb2xlLyR7QXdzLlJFR0lPTn0vJHt0aGlzLmNvbmZpZy5hbGxvd0FkbWluUm9sZX1gLFxuICAgICk7XG5cbiAgICBjb25zdCBjbHVzdGVyID0gbmV3IGVrcy5DbHVzdGVyKHRoaXMsICdDbHVzdGVyJywge1xuICAgICAgY2x1c3Rlck5hbWU6IGNvbmZpZy5jbHVzdGVyTmFtZSxcbiAgICAgIHZwYzogdnBjLFxuICAgICAgZGVmYXVsdENhcGFjaXR5OiAwLCAvLyB3ZSB3YW50IHRvIG1hbmFnZSBjYXBhY2l0eSBvdXIgc2VsdmVzXG4gICAgICB2ZXJzaW9uOiBla3MuS3ViZXJuZXRlc1ZlcnNpb24uVjFfMjEsXG4gICAgICBjbHVzdGVySGFuZGxlckVudmlyb25tZW50OiB7XG4gICAgICAgIHJvbGVBcm46IGNsdXN0ZXJIYW5kbGVyUm9sZS5yb2xlQXJuLFxuICAgICAgfSxcbiAgICAgIHZwY1N1Ym5ldHM6IFt7IHN1Ym5ldFR5cGU6IGVjMi5TdWJuZXRUeXBlLlBSSVZBVEVfV0lUSF9OQVQgfV0sXG4gICAgICBzZWN1cml0eUdyb3VwOiBuZXcgZWMyLlNlY3VyaXR5R3JvdXAodGhpcywgJ0NsdXN0ZXJDb250cm9sUGFuZVNlY3VyaXR5R3JvdXAnLCB7XG4gICAgICAgIHZwYzogdnBjLFxuICAgICAgICBkZXNjcmlwdGlvbjogJ1NlY3VyaXR5IGdyb3VwIGZvciBFS1MgY2x1c3RlciBjb250cm9sIHBsYW5lJyxcbiAgICAgIH0pLFxuICAgICAgLy8gbWFzdGVyc1JvbGU6IHJvbGUgLy8gT3IgZWxzZSB3ZSBhcmUgdW5hYmxlIHRvIGxvZ2luXG4gICAgfSk7XG5cbiAgICByZXR1cm4gY2x1c3RlcjtcbiAgfVxuXG4gIGNyZWF0ZVdvcmtlck5vZGVHcm91cChla3NDbHVzdGVyOiBla3MuQ2x1c3Rlciwgd29ya2VyTm9kZVJvbGU6IFJvbGUsIHZwYzogSVZwYykge1xuICAgIGVrc0NsdXN0ZXIuYWRkTm9kZWdyb3VwQ2FwYWNpdHkodGhpcy5jb25maWcud29ya2VyR3JvdXBOYW1lLCB7XG4gICAgICBpbnN0YW5jZVR5cGVzOiBjb252ZXJ0U3RyaW5nVG9BcnJheSh0aGlzLmNvbmZpZy53b3JrZXJJbnN0YW5jZVR5cGVzKS5tYXAoXG4gICAgICAgIChpbnN0YW5jZVR5cGUpID0+IG5ldyBlYzIuSW5zdGFuY2VUeXBlKGluc3RhbmNlVHlwZSksXG4gICAgICApLFxuICAgICAgbm9kZWdyb3VwTmFtZTogdGhpcy5jb25maWcud29ya2VyR3JvdXBOYW1lLFxuICAgICAgbm9kZVJvbGU6IHdvcmtlck5vZGVSb2xlLFxuICAgICAgY2FwYWNpdHlUeXBlOiB0aGlzLmNvbmZpZy53b3JrZXJDYXBhY2l0eVR5cGUgPT09ICdTUE9UJyA/IENhcGFjaXR5VHlwZS5TUE9UIDogQ2FwYWNpdHlUeXBlLk9OX0RFTUFORCxcbiAgICAgIHN1Ym5ldHM6IHZwYy5zZWxlY3RTdWJuZXRzKHsgc3VibmV0VHlwZTogZWMyLlN1Ym5ldFR5cGUuUFJJVkFURV9XSVRIX05BVCB9KSxcbiAgICAgIGRlc2lyZWRTaXplOiBOdW1iZXIodGhpcy5jb25maWcud29ya2VyRGVzaXJlZFNpemUpLFxuICAgICAgbWluU2l6ZTogTnVtYmVyKHRoaXMuY29uZmlnLndvcmtlck1pblNpemUpLFxuICAgICAgbWF4U2l6ZTogTnVtYmVyKHRoaXMuY29uZmlnLndvcmtlck1heFNpemUpLFxuICAgIH0pO1xuICB9XG5cbiAgLy8gV2hlbiB1c2luZyBmYXJnYXRlIGZvciBmaXJzdCB0aW1lIHlvdSBtYXkgaGF2ZSB0byBjcmVhdGUgdGhlIHNlcnZpY2UgbGlua2VkIHJvbGVcbiAgLy8gYXdzIGlhbSBjcmVhdGUtc2VydmljZS1saW5rZWQtcm9sZSBcXFxuICAvLyAtLWF3cy1zZXJ2aWNlLW5hbWUgZWtzLWZhcmdhdGUuYW1hem9uYXdzLmNvbSBcXFxuICAvLyAtLWRlc2NyaXB0aW9uIFwiU2VydmljZS1saW5rZWQgcm9sZSB0byBzdXBwb3J0IGZhcmdhdGVcIlxuXG4gIGNyZWF0ZUZhcmdhdGVQcm9maWxlcyhjbHVzdGVyOiBla3MuQ2x1c3RlciwgdnBjOiBJVnBjLCBuczogZWtzLkt1YmVybmV0ZXNNYW5pZmVzdFtdKTogZWtzLkZhcmdhdGVQcm9maWxlW10ge1xuXG4gICAgY29uc3QgcG9saWN5ID0gdGhpcy5jcmVhdGVFS1NGYXJnYXRlQ2xvdWR3YXRjaFBvbGljeSgpXG5cbiAgICB2YXIgcHJvZmlsZXM6IGVrcy5GYXJnYXRlUHJvZmlsZVtdID0gW107XG4gICAgdGhpcy5jb25maWcuZmFyZ2F0ZVByb2ZpbGVzPy5mb3JFYWNoKChwcm9maWxlKSA9PiB7XG5cbiAgICAgIGNvbnN0IHAgPSBuZXcgZWtzLkZhcmdhdGVQcm9maWxlKHRoaXMsIHByb2ZpbGUubmFtZSwge1xuICAgICAgICBjbHVzdGVyLFxuICAgICAgICBzZWxlY3RvcnM6IHByb2ZpbGUuc2VsZWN0b3JzLFxuICAgICAgICB2cGM6IHZwYyxcbiAgICAgICAgc3VibmV0U2VsZWN0aW9uOiB2cGMuc2VsZWN0U3VibmV0cyh7IHN1Ym5ldFR5cGU6IGVjMi5TdWJuZXRUeXBlLlBSSVZBVEVfV0lUSF9OQVQgfSksXG4gICAgICB9KTtcbiAgICAgIC8vIHRoaXMgaXMgcmVxdWlyZWQgZm9yIGxvZ2dpbmdcbiAgICAgIHAucG9kRXhlY3V0aW9uUm9sZS5hdHRhY2hJbmxpbmVQb2xpY3kocG9saWN5KVxuXG4gICAgICBwcm9maWxlcy5wdXNoKHApO1xuXG4gICAgfSk7XG5cbiAgICAvLyBFbmFibGUgYXV0b21hdGljIGNsb3Vkd3dhdGNoIGxvZ2dpbmcgZm9yIHRoZSBzYW1lLiBUaGlzIHJlcXVpcmVzIGEgbmFtZXNwYWNlIGFuZCBhIGNvbmZpZyBtYXBcblxuICAgIGNvbnN0IG5hbWVzcGFjZSA9IGNsdXN0ZXIuYWRkTWFuaWZlc3QoJ2F3cy1vYnNlcnZhYmlsaXR5Jywge1xuICAgICAgYXBpVmVyc2lvbjogJ3YxJyxcbiAgICAgIGtpbmQ6ICdOYW1lc3BhY2UnLFxuICAgICAgbWV0YWRhdGE6IHsgbmFtZTogJ2F3cy1vYnNlcnZhYmlsaXR5JywgbGFiZWxzOiB7ICdhd3Mtb2JzZXJ2YWJpbGl0eSc6ICdlbmFibGVkJyB9IH0sXG4gICAgfSk7XG5cbiAgICAvLyB5YW1sXG4gICAgbGV0IGRhdGFSZXN1bHQ6IFJlY29yZDxzdHJpbmcsIG9iamVjdD5bXSA9IFtdO1xuICAgIHRyeSB7XG5cbiAgICAgIGNvbnN0IHBhdGggPSByZXF1aXJlKCdwYXRoJyk7XG5cbiAgICAgIGxldCB2YWx1ZXNZYW1sID0gZnMucmVhZEZpbGVTeW5jKHBhdGguam9pbihfX2Rpcm5hbWUsIGAuL21hbmlmZXN0cy9mYXJnYXRlLWNsb3Vkd2F0Y2gtbG9nZ2luZy55YW1sYCkpO1xuICAgICAgLy8gUmVwbGFjZSBEb21haW4gYW5kIGxvYWQgWUFNTFxuICAgICAgbGV0IHZhbHVlc1BhcnNlZCA9IHlhbWwubG9hZEFsbCh2YWx1ZXNZYW1sLnRvU3RyaW5nKClcbiAgICAgICAgLnJlcGxhY2UobmV3IFJlZ0V4cCgne0FXU19SRUdJT059JywgJ2dpJyksIEF3cy5SRUdJT04pXG4gICAgICAgIC5yZXBsYWNlKG5ldyBSZWdFeHAoJ3tDTFVTVEVSX05BTUV9JywgJ2dpJyksIGNsdXN0ZXIuY2x1c3Rlck5hbWUpXG4gICAgICApO1xuICAgICAgaWYgKHR5cGVvZiB2YWx1ZXNQYXJzZWQgPT09ICdvYmplY3QnICYmIHZhbHVlc1BhcnNlZCAhPT0gbnVsbCkge1xuICAgICAgICBkYXRhUmVzdWx0ID0gdmFsdWVzUGFyc2VkIGFzIFJlY29yZDxzdHJpbmcsIG9iamVjdD5bXTtcbiAgICAgIH1cbiAgICB9IGNhdGNoIChleGNlcHRpb24pIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoXCIgPiBGYWlsZWQgdG8gbG9hZCAnZmFyZ2F0ZS1jbG91ZHdhdGNoLWxvZ2dpbmcueWFtbCcgZm9yICdFS1MgQ2x1c3RlcicgZGVwbG95Li4uXCIpO1xuICAgICAgY29uc29sZS5lcnJvcihleGNlcHRpb24pO1xuICAgICAgZXhpdFxuICAgIH1cblxuICAgIGRhdGFSZXN1bHQuZm9yRWFjaChmdW5jdGlvbiAodmFsLCBpZHgpIHtcbiAgICAgIGNvbnN0IGEgPSBjbHVzdGVyLmFkZE1hbmlmZXN0KCdmYXJnYXRlLWNsb3Vkd2F0Y2gtbG9nZ2luZy0nICsgaWR4LCB2YWwpO1xuICAgICAgYS5ub2RlLmFkZERlcGVuZGVuY3kobmFtZXNwYWNlKVxuICAgIH0pO1xuXG4gICAgcmV0dXJuIHByb2ZpbGVzO1xuICB9XG5cbiAgY3JlYXRlRUtTRmFyZ2F0ZUNsb3Vkd2F0Y2hQb2xpY3koKTogUG9saWN5IHtcbiAgICAvLyBlYWNoIHBvZCBleGVjdXRpb24gcm9sZSBuZWVkcyB0byBoYXZlIHRoZSBwb2xpY3lcbiAgICBjb25zdCBpYW1Qb2xpY3lEb2N1bWVudCA9IEpTT04ucGFyc2UoYHtcbiAgICAgIFwiVmVyc2lvblwiOiBcIjIwMTItMTAtMTdcIixcbiAgICAgIFwiU3RhdGVtZW50XCI6IFt7XG4gICAgICAgIFwiRWZmZWN0XCI6IFwiQWxsb3dcIixcbiAgICAgICAgXCJBY3Rpb25cIjogW1xuICAgICAgICAgIFwibG9nczpDcmVhdGVMb2dTdHJlYW1cIixcbiAgICAgICAgICBcImxvZ3M6Q3JlYXRlTG9nR3JvdXBcIixcbiAgICAgICAgICBcImxvZ3M6RGVzY3JpYmVMb2dTdHJlYW1zXCIsXG4gICAgICAgICAgXCJsb2dzOlB1dExvZ0V2ZW50c1wiXG4gICAgICAgIF0sXG4gICAgICAgIFwiUmVzb3VyY2VcIjogXCIqXCJcbiAgICAgIH1dXG4gICAgfWApXG5cbiAgICAvLyBDcmVhdGUgSUFNIFBvbGljeVxuICAgIGNvbnN0IGlhbVBvbGljeSA9IG5ldyBQb2xpY3kodGhpcywgJ0VLU0ZhcmdhdGVMb2dnaW5nUG9saWN5Jywge1xuICAgICAgcG9saWN5TmFtZTogJ0VLU0ZhcmdhdGVMb2dnaW5nUG9saWN5JyxcbiAgICAgIGRvY3VtZW50OiBQb2xpY3lEb2N1bWVudC5mcm9tSnNvbihpYW1Qb2xpY3lEb2N1bWVudCksXG4gICAgfSk7XG5cbiAgICByZXR1cm4gaWFtUG9saWN5XG4gIH1cblxuICBjcmVhdGVOYW1lc3BhY2VzKHNlbGVjdG9yczogU2VsZWN0b3JbXSwgY2x1c3RlcjogZWtzLkNsdXN0ZXIpOiBla3MuS3ViZXJuZXRlc01hbmlmZXN0W10ge1xuICAgIC8vIENyZWF0ZXMgbmFtZXNwYWNlICBmb3IgZmFyZ2F0ZSBwcm9maWxlc1xuXG4gICAgdmFyIG5zOiBla3MuS3ViZXJuZXRlc01hbmlmZXN0W10gPSBbXTtcblxuICAgIHNlbGVjdG9ycy5mb3JFYWNoKChzZWxlY3RvcikgPT4ge1xuICAgICAgY29uc3QgbmFtZXNwYWNlID0ge1xuICAgICAgICBhcGlWZXJzaW9uOiAndjEnLFxuICAgICAgICBraW5kOiAnTmFtZXNwYWNlJyxcbiAgICAgICAgbWV0YWRhdGE6IHsgbmFtZTogc2VsZWN0b3IubmFtZXNwYWNlIH0sXG4gICAgICB9O1xuXG4gICAgICBucy5wdXNoKFxuICAgICAgICBuZXcgZWtzLkt1YmVybmV0ZXNNYW5pZmVzdCh0aGlzLCBgJHtzZWxlY3Rvci5uYW1lc3BhY2V9TlNgLCB7XG4gICAgICAgICAgY2x1c3RlcixcbiAgICAgICAgICBtYW5pZmVzdDogW25hbWVzcGFjZV0sXG4gICAgICAgIH0pLFxuICAgICAgKTtcbiAgICB9KTtcblxuICAgIHJldHVybiBucztcbiAgfVxuXG4gIGNyZWF0ZVMzQnVja2V0cygpOiB2b2lkIHtcbiAgICB0aGlzLmNvbmZpZy5zM0J1Y2tldHM/LmZvckVhY2goYnVja2V0ID0+IHtcbiAgICAgIGlmIChidWNrZXQuaXNQcml2YXRlV2l0aENvcnMpIHtcbiAgICAgICAgY29uc3QgYiA9IG5ldyBCdWNrZXQodGhpcywgYnVja2V0Lm5hbWUsIHtcbiAgICAgICAgICBidWNrZXROYW1lOiBidWNrZXQubmFtZSxcbiAgICAgICAgICBlbmNyeXB0aW9uOiBCdWNrZXRFbmNyeXB0aW9uLlMzX01BTkFHRUQsXG4gICAgICAgICAgZW5mb3JjZVNTTDogdHJ1ZSxcbiAgICAgICAgICBwdWJsaWNSZWFkQWNjZXNzOiBmYWxzZSxcbiAgICAgICAgICBibG9ja1B1YmxpY0FjY2VzczogQmxvY2tQdWJsaWNBY2Nlc3MuQkxPQ0tfQUxMLFxuICAgICAgICAgIGNvcnM6IGJ1Y2tldC5jb3JzLFxuICAgICAgICAgIHZlcnNpb25lZDogdHJ1ZSxcbiAgICAgICAgICByZW1vdmFsUG9saWN5OiBSZW1vdmFsUG9saWN5LkRFU1RST1ksXG4gICAgICAgIH0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29uc3QgYiA9IG5ldyBCdWNrZXQodGhpcywgYnVja2V0Lm5hbWUsIHtcbiAgICAgICAgICBidWNrZXROYW1lOiBidWNrZXQubmFtZSxcbiAgICAgICAgICBlbmNyeXB0aW9uOiBCdWNrZXRFbmNyeXB0aW9uLlMzX01BTkFHRUQsXG4gICAgICAgICAgZW5mb3JjZVNTTDogdHJ1ZSxcbiAgICAgICAgICBwdWJsaWNSZWFkQWNjZXNzOiBmYWxzZSxcbiAgICAgICAgICBibG9ja1B1YmxpY0FjY2VzczogQmxvY2tQdWJsaWNBY2Nlc3MuQkxPQ0tfQUxMLFxuICAgICAgICAgIHZlcnNpb25lZDogdHJ1ZSxcbiAgICAgICAgICByZW1vdmFsUG9saWN5OiBSZW1vdmFsUG9saWN5LkRFU1RST1ksXG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgY3JlYXRlUGFyYW1zKCkge1xuICAgIC8vIEV4cG9ydCBmZXcgcGFyYW1ldGVycyBmb3IgYXBwbGljYXRpb24gdXNhZ2VcbiAgICBuZXcgU3RyaW5nUGFyYW1ldGVyKFxuICAgICAgdGhpcywgXCJFS1NDbHVzdGVySGFuZGxlclJvbGVcIixcbiAgICAgIHtcbiAgICAgICAgcGFyYW1ldGVyTmFtZTogYC9hY2NvdW50L3N0YWNrcy8ke3RoaXMuc3RhY2tOYW1lfS9rdWJlY3RsLXJvbGVgLFxuICAgICAgICBzdHJpbmdWYWx1ZTogdGhpcy5la3NDbHVzdGVyLmt1YmVjdGxSb2xlIS5yb2xlQXJuLFxuICAgICAgICBkZXNjcmlwdGlvbjogXCJLdWJlY3RsIFJvbGUgZm9yIHN0YWNrIG9wZXJhdGlvbnNcIlxuICAgICAgfVxuICAgICk7XG5cbiAgfVxufVxuIl19
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
const fs = __importStar(require("fs"));
const yaml = __importStar(require("js-yaml"));
const process_1 = require("process");
const aws_ssm_1 = require("aws-cdk-lib/aws-ssm");
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
        new efs_csi_driver_1.AwsEFSCSIDriver(this, 'AwsEFSCSIDriverNested', this.eksCluster);
        new secrets_csi_driver_1.AwsSecretsCSIDriver(this, 'AwsSecretsCSIDriverNested', this.eksCluster);
        new external_dns_1.ExternalDNS(this, 'ExternalDNS', this.eksCluster, this.config.externalDNS);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWtzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZWtzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsMkNBQTRDO0FBQzVDLDJDQUE0QztBQUM1QywyQ0FBNEM7QUFDNUMsMkNBQTRDO0FBQzVDLG1DQUFvQztBQUNwQyw2Q0FBaUQ7QUFFakQsaURBQXNFO0FBQ3RFLGlEQVE2QjtBQUM3QiwrQ0FBaUY7QUFHakYsNENBQXVEO0FBQ3ZELGlFQUErRDtBQUMvRCxxRkFBbUY7QUFDbkYseUVBQXVFO0FBQ3ZFLG1FQUE0RDtBQUM1RCxpREFBNkM7QUFFN0MsdUNBQXlCO0FBQ3pCLDhDQUFnQztBQUNoQyxxQ0FBK0I7QUFDL0IsaURBQXNEO0FBR3RELE1BQWEsVUFBVyxTQUFRLEdBQUcsQ0FBQyxLQUFLO0lBSXZDLFlBQVksS0FBZ0IsRUFBRSxFQUFVLEVBQUUsTUFBc0IsRUFBRSxLQUFzQjtRQUN0RixLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUN4QixJQUFJLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQztRQUVyQixNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7UUFFMUIsTUFBTSxrQkFBa0IsR0FBRyxJQUFJLENBQUMsd0JBQXdCLEVBQUUsQ0FBQztRQUUzRCxvQ0FBb0M7UUFDcEMsTUFBTSxVQUFVLEdBQUcsSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxlQUFlLEVBQUU7WUFDckQsU0FBUyxFQUFFLElBQUksR0FBRyxDQUFDLGdCQUFnQixDQUFDLG1CQUFtQixDQUFDO1lBQ3hELGVBQWUsRUFBRTtnQkFDZixHQUFHLENBQUMsYUFBYSxDQUFDLHdCQUF3QixDQUFDLDJCQUEyQixDQUFDO2dCQUN2RSxHQUFHLENBQUMsYUFBYSxDQUFDLHdCQUF3QixDQUFDLG9DQUFvQyxDQUFDO2dCQUNoRixHQUFHLENBQUMsYUFB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O29CQUN2QyxVQUFVLEVBQUUsSUFBSTtvQkFDaEIsZ0JBQWdCLEVBQUUsS0FBSztvQkFDdkIsaUJBQWlCLEVBQUUsMEJBQWlCLENBQUMsU0FBUztvQkFDOUMsSUFBSSxFQUFFLE1BQU0sQ0FBQyxJQUFJO29CQUNqQixTQUFTLEVBQUUsSUFBSTtvQkFDZixhQUFhLEVBQUUsMkJBQWEsQ0FBQyxPQUFPO2lCQUNyQyxDQUFDLENBQUM7YUFDSjtpQkFBTTtnQkFDTCxNQUFNLENBQUMsR0FBRyxJQUFJLGVBQU0sQ0FBQyxJQUFJLEVBQUUsTUFBTSxDQUFDLElBQUksRUFBRTtvQkFDdEMsVUFBVSxFQUFFLE1BQU0sQ0FBQyxJQUFJO29CQUN2QixVQUFVLEVBQUUseUJBQWdCLENBQUMsVUFBVTtvQkFDdkMsVUFBVSxFQUFFLElBQUk7b0JBQ2hCLGdCQUFnQixFQUFFLEtBQUs7b0JBQ3ZCLGlCQUFpQixFQUFFLDBCQUFpQixDQUFDLFNBQVM7b0JBQzlDLFNBQVMsRUFBRSxJQUFJO29CQUNmLGFBQWEsRUFBRSwyQkFBYSxDQUFDLE9BQU87aUJBQ3JDLENBQUMsQ0FBQzthQUNKO1FBQ0gsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDO0lBRUQsWUFBWTtRQUNWLDhDQUE4QztRQUM5QyxJQUFJLHlCQUFlLENBQ2pCLElBQUksRUFBRSx1QkFBdUIsRUFDN0I7WUFDRSxhQUFhLEVBQUUsbUJBQW1CLElBQUksQ0FBQyxTQUFTLGVBQWU7WUFDL0QsV0FBVyxFQUFFLElBQUksQ0FBQyxVQUFVLENBQUMsV0FBWSxDQUFDLE9BQU87WUFDakQsV0FBVyxFQUFFLG1DQUFtQztTQUNqRCxDQUNGLENBQUM7SUFFSixDQUFDO0NBQ0Y7QUF2U0QsZ0NBdVNDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IGlhbSA9IHJlcXVpcmUoJ2F3cy1jZGstbGliL2F3cy1pYW0nKTtcbmltcG9ydCBlYzIgPSByZXF1aXJlKCdhd3MtY2RrLWxpYi9hd3MtZWMyJyk7XG5pbXBvcnQgZWtzID0gcmVxdWlyZSgnYXdzLWNkay1saWIvYXdzLWVrcycpO1xuaW1wb3J0IHNzbSA9IHJlcXVpcmUoJ2F3cy1jZGstbGliL2F3cy1zc20nKTtcbmltcG9ydCBjZGsgPSByZXF1aXJlKCdhd3MtY2RrLWxpYicpO1xuaW1wb3J0IHsgQXdzLCBSZW1vdmFsUG9saWN5IH0gZnJvbSAnYXdzLWNkay1saWInO1xuaW1wb3J0IHsgSVZwYyB9IGZyb20gJ2F3cy1jZGstbGliL2F3cy1lYzInO1xuaW1wb3J0IHsgQ2FwYWNpdHlUeXBlLCBDbHVzdGVyLCBTZWxlY3RvciB9IGZyb20gJ2F3cy1jZGstbGliL2F3cy1la3MnO1xuaW1wb3J0IHtcbiAgQ29tcG9zaXRlUHJpbmNpcGFsLFxuICBFZmZlY3QsXG4gIFBvbGljeSxcbiAgUG9saWN5RG9jdW1lbnQsXG4gIFBvbGljeVN0YXRlbWVudCxcbiAgUm9sZSxcbiAgU2VydmljZVByaW5jaXBhbFxufSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtaWFtJztcbmltcG9ydCB7IEJsb2NrUHVibGljQWNjZXNzLCBCdWNrZXQsIEJ1Y2tldEVuY3J5cHRpb24gfSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtczMnO1xuaW1wb3J0IHsgQ29uc3RydWN0IH0gZnJvbSAnY29uc3RydWN0cyc7XG5pbXBvcnQgeyBFS1NTdGFja0NvbmZpZyB9IGZyb20gJy4uLy4uL2ludGVyZmFjZXMvbGliL2Vrcy9pbnRlcmZhY2VzJztcbmltcG9ydCB7IGNvbnZlcnRTdHJpbmdUb0FycmF5IH0gZnJvbSAnLi4vdXRpbHMvY29tbW9uJztcbmltcG9ydCB7IEF3c0VGU0NTSURyaXZlciB9IGZyb20gJy4vY29udHJvbGxlcnMvZWZzLWNzaS1kcml2ZXInO1xuaW1wb3J0IHsgQXdzTG9hZEJhbGFuY2VyQ29udHJvbGxlciB9IGZyb20gJy4vY29udHJvbGxlcnMvbG9hZC1iYWxhbmNlci1jb250cm9sbGVyJztcbmltcG9ydCB7IEF3c1NlY3JldHNDU0lEcml2ZXIgfSBmcm9tICcuL2NvbnRyb2xsZXJzL3NlY3JldHMtY3NpLWRyaXZlcic7XG5pbXBvcnQgeyBDbG91ZHdhdGNoTG9nZ2luZyB9IGZyb20gJy4vY3ctbG9nZ2luZy1tb25pdG9yaW5nJztcbmltcG9ydCB7IEV4dGVybmFsRE5TIH0gZnJvbSAnLi9leHRlcm5hbC1kbnMnO1xuXG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcyc7XG5pbXBvcnQgKiBhcyB5YW1sIGZyb20gJ2pzLXlhbWwnO1xuaW1wb3J0IHsgZXhpdCB9IGZyb20gJ3Byb2Nlc3MnO1xuaW1wb3J0IHsgU3RyaW5nUGFyYW1ldGVyIH0gZnJvbSAnYXdzLWNkay1saWIvYXdzLXNzbSc7XG5cblxuZXhwb3J0IGNsYXNzIEVLU0NsdXN0ZXIgZXh0ZW5kcyBjZGsuU3RhY2sge1xuICBjb25maWc6IEVLU1N0YWNrQ29uZmlnO1xuICBla3NDbHVzdGVyOiBDbHVzdGVyO1xuXG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcsIGNvbmZpZzogRUtTU3RhY2tDb25maWcsIHByb3BzPzogY2RrLlN0YWNrUHJvcHMpIHtcbiAgICBzdXBlcihzY29wZSwgaWQsIHByb3BzKTtcbiAgICB0aGlzLmNvbmZpZyA9IGNvbmZpZztcblxuICAgIGNvbnN0IHZwYyA9IHRoaXMuZ2V0VlBDKCk7XG5cbiAgICBjb25zdCBjbHVzdGVySGFuZGxlclJvbGUgPSB0aGlzLmNyZWF0ZUNsdXN0ZXJIYW5kbGVyUm9sZSgpO1xuXG4gICAgLy8gSUFNIHJvbGUgZm9yIG91ciBFQzIgd29ya2VyIG5vZGVzXG4gICAgY29uc3Qgd29ya2VyUm9sZSA9IG5ldyBpYW0uUm9sZSh0aGlzLCAnRUtTV29ya2VyUm9sZScsIHtcbiAgICAgIGFzc3VtZWRCeTogbmV3IGlhbS5TZXJ2aWNlUHJpbmNpcGFsKCdlYzIuYW1hem9uYXdzLmNvbScpLFxuICAgICAgbWFuYWdlZFBvbGljaWVzOiBbXG4gICAgICAgIGlhbS5NYW5hZ2VkUG9saWN5LmZyb21Bd3NNYW5hZ2VkUG9saWN5TmFtZSgnQW1hem9uRUtTV29ya2VyTm9kZVBvbGljeScpLFxuICAgICAgICBpYW0uTWFuYWdlZFBvbGljeS5mcm9tQXdzTWFuYWdlZFBvbGljeU5hbWUoJ0FtYXpvbkVDMkNvbnRhaW5lclJlZ2lzdHJ5UmVhZE9ubHknKSxcbiAgICAgICAgaWFtLk1hbmFnZWRQb2xpY3kuZnJvbUF3c01hbmFnZWRQb2xpY3lOYW1lKCdBbWF6b25FS1NfQ05JX1BvbGljeScpLFxuICAgICAgICBpYW0uTWFuYWdlZFBvbGljeS5mcm9tQXdzTWFuYWdlZFBvbGljeU5hbWUoJ0Nsb3VkV2F0Y2hBZ2VudFNlcnZlclBvbGljeScpLFxuICAgICAgXSxcbiAgICB9KTtcblxuICAgIHRoaXMuZWtzQ2x1c3RlciA9IHRoaXMuY3JlYXRlRUtTQ2x1c3Rlcih2cGMsIGNvbmZpZywgY2x1c3RlckhhbmRsZXJSb2xlKTtcblxuICAgIGlmICh0aGlzLmNvbmZpZy5hbGxvd0FkbWluUm9sZSkge1xuICAgICAgY29uc3Qgcm9sZSA9IFJvbGUuZnJvbVJvbGVBcm4oXG4gICAgICAgIHRoaXMsXG4gICAgICAgICdBZG1pblJvbGVBdXRoJyxcbiAgICAgICAgYGFybjphd3M6aWFtOjoke0F3cy5BQ0NPVU5UX0lEfTpyb2xlLyR7dGhpcy5jb25maWcuYWxsb3dBZG1pblJvbGV9YCxcbiAgICAgICk7XG5cbiAgICAgIHRoaXMuZWtzQ2x1c3Rlci5hd3NBdXRoLmFkZFJvbGVNYXBwaW5nKHJvbGUsIHtcbiAgICAgICAgZ3JvdXBzOiBbXCJzeXN0ZW06Ym9vdHN0cmFwcGVyc1wiLCBcInN5c3RlbTpub2Rlc1wiLCBcInN5c3RlbTptYXN0ZXJzXCJdLFxuICAgICAgICB1c2VybmFtZTogJ2FkbWluJyxcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIC8vIFdlIHdhbnQgdG8gY3JlYXRlIG5hbWVzcGFjZXMgZmlyc3QsIHNvIHRoZSBkZXBlbmRlbmNpZXMgYXJlIHJlc29sdmVkIGJldHdlZW4gU0EgYW5kIGNoYXJ0IGluc3RhbGxhdGlvbi5cbiAgICAvLyBEbyBpdCBzb29uZXIgYXMgdGhlcmUgaXMgYSBzbWFsbCBkZWxheSBiZXR3ZWVuIGNyZWF0aW9uIG9mIG5hbWVzcGFjZSBhbmQgY3JlYXRpb24gb2Ygc2VydmljZSBhY2NvdW50XG4gICAgdmFyIG5zOiBla3MuS3ViZXJuZXRlc01hbmlmZXN0W10gPSBbXTtcbiAgICBpZiAodGhpcy5jb25maWcubmFtZXNwYWNlcykge1xuICAgICAgbnMgPSB0aGlzLmNyZWF0ZU5hbWVzcGFjZXModGhpcy5jb25maWcubmFtZXNwYWNlcywgdGhpcy5la3NDbHVzdGVyKTtcbiAgICB9XG4gICAgLy8gV2UgY3JlYXRlIHByb2ZpbGVzIG9uY2UgYWxsIG5hbWVzcGFjZXMgYXJlIGNyZWF0ZWQuXG4gICAgdmFyIHByb2ZpbGVzOiBla3MuRmFyZ2F0ZVByb2ZpbGVbXSA9IFtdO1xuXG4gICAgcHJvZmlsZXMgPSB0aGlzLmNyZWF0ZUZhcmdhdGVQcm9maWxlcyh0aGlzLmVrc0NsdXN0ZXIsIHZwYywgbnMpO1xuICAgIHRoaXMuY3JlYXRlV29ya2VyTm9kZUdyb3VwKHRoaXMuZWtzQ2x1c3Rlciwgd29ya2VyUm9sZSwgdnBjKTtcblxuXG4gICAgLy8gRW5hYmxlIGNsdXN0ZXIgbG9nZ2luZyBhbmQgTW9uaXRvcmluZ1xuICAgIG5ldyBDbG91ZHdhdGNoTG9nZ2luZyh0aGlzLCAnQ2xvdWRXYXRjaExvZ2dpbmdOZXN0ZWQnLCB0aGlzLmVrc0NsdXN0ZXIpO1xuXG4gICAgLy8gRXh0ZXJhbmwgRE5TIHJlbGF0ZWQgc3RhY2tcbiAgICAvLyBuZXcgUHJvbWV0aGV1c1N0YWNrKHRoaXMsICdQcm9tZXRoZXVzU3RhY2snLCBla3NDbHVzdGVyKVxuXG4gICAgbmV3IEF3c0xvYWRCYWxhbmNlckNvbnRyb2xsZXIodGhpcywgJ0F3c0xvYWRCYWxhbmNlckNvbnRyb2xsZXInLCB0aGlzLmVrc0NsdXN0ZXIpO1xuICAgIG5ldyBBd3NFRlNDU0lEcml2ZXIodGhpcywgJ0F3c0VGU0NTSURyaXZlck5lc3RlZCcsIHRoaXMuZWtzQ2x1c3Rlcik7XG4gICAgbmV3IEF3c1NlY3JldHNDU0lEcml2ZXIodGhpcywgJ0F3c1NlY3JldHNDU0lEcml2ZXJOZXN0ZWQnLCB0aGlzLmVrc0NsdXN0ZXIpO1xuICAgIG5ldyBFeHRlcm5hbEROUyh0aGlzLCAnRXh0ZXJuYWxETlMnLCB0aGlzLmVrc0NsdXN0ZXIsIHRoaXMuY29uZmlnLmV4dGVybmFsRE5TKTtcblxuICAgIC8vIEZvciBFRlMgcmVsYXRlZCBzdGFjayAtIGNoZWNrb3V0IGVmcy1la3MtaW50ZWdyYXRpb24gc3RhY2tcblxuICAgIC8vIEluc3RhbGwgb3RoZXIgYml0cyBsaWtlIFMzICwgcG9zdGdyZXMgZXRjIHdoaWNoIG5lZWRzIHRvIGJlIGJlZm9yZSB0aGUgY2hhcnRzIGFyZSBpbnN0YWxsZWRcbiAgICB0aGlzLmNyZWF0ZVMzQnVja2V0cygpO1xuXG4gICAgdGhpcy5jcmVhdGVQYXJhbXMoKVxuXG4gIH1cblxuXG5cbiAgZ2V0VlBDKCk6IGVjMi5JVnBjIHtcbiAgICBjb25zdCB2cGNJZCA9IHNzbS5TdHJpbmdQYXJhbWV0ZXIudmFsdWVGcm9tTG9va3VwKHRoaXMsICcvYWNjb3VudC92cGMvaWQnKTtcbiAgICBjb25zdCB2cGMgPSBlYzIuVnBjLmZyb21Mb29rdXAodGhpcywgJ1ZQQycsIHsgdnBjSWQ6IHZwY0lkIH0pO1xuXG4gICAgcmV0dXJuIHZwYztcbiAgfVxuXG4gIGNyZWF0ZUNsdXN0ZXJIYW5kbGVyUm9sZSgpOiBSb2xlIHtcbiAgICAvLyBXaGVuIHRoaXMgaXMgcGFzc2VkIGFzIHJvbGUsIEVLUyBjbHVzdGVyIHN1Y2Nlc3NmdWxseSBjcmVhdGVkKEkgdGhpbmsgdGhlcmUgaXMgYSBidWcgaW4gQ0RLKS5cbiAgICBjb25zdCBwb2xpY3lTdGF0ZW1lbnQgPSBuZXcgUG9saWN5U3RhdGVtZW50KHtcbiAgICAgIHNpZDogJ0Zha2VQb2xpY3lTdGF0ZW1lbnQnLFxuICAgICAgYWN0aW9uczogWydsb2dzOlB1dExvZ0V2ZW50cyddLFxuICAgICAgZWZmZWN0OiBFZmZlY3QuQUxMT1csXG4gICAgICByZXNvdXJjZXM6IFsnKiddLFxuICAgIH0pO1xuXG4gICAgY29uc3QgcG9saWN5RG9jdW1lbnQgPSBuZXcgUG9saWN5RG9jdW1lbnQoe1xuICAgICAgc3RhdGVtZW50czogW3BvbGljeVN0YXRlbWVudF0sXG4gICAgfSk7XG5cbiAgICBjb25zdCBjbHVzdGVySGFuZGxlclJvbGUgPSBuZXcgUm9sZSh0aGlzLCBgQ2x1c3RlckhhbmRsZXJSb2xlYCwge1xuICAgICAgcm9sZU5hbWU6IGAke0F3cy5TVEFDS19OQU1FfS1DbHVzdGVySGFuZGxlclJvbGVgLFxuICAgICAgZGVzY3JpcHRpb246IGBSb2xlIGZvciBsYW1iZGEgaGFuZGxlcmAsXG4gICAgICBhc3N1bWVkQnk6IG5ldyBDb21wb3NpdGVQcmluY2lwYWwobmV3IFNlcnZpY2VQcmluY2lwYWwoJ2xhbWJkYS5hbWF6b25hd3MuY29tJykpLFxuICAgICAgaW5saW5lUG9saWNpZXM6IHtcbiAgICAgICAgQWNjZXNzUG9saWN5OiBwb2xpY3lEb2N1bWVudCxcbiAgICAgIH0sXG4gICAgfSk7XG5cbiAgICByZXR1cm4gY2x1c3RlckhhbmRsZXJSb2xlO1xuICB9XG5cbiAgY3JlYXRlRUtTQ2x1c3Rlcih2cGM6IGVjMi5JVnBjLCBjb25maWc6IEVLU1N0YWNrQ29uZmlnLCBjbHVzdGVySGFuZGxlclJvbGU6IGlhbS5Sb2xlKTogZWtzLkNsdXN0ZXIge1xuICAgIGNvbnN0IHJvbGUgPSBSb2xlLmZyb21Sb2xlQXJuKFxuICAgICAgdGhpcyxcbiAgICAgICdBZG1pblJvbGUnLFxuICAgICAgYGFybjphd3M6aWFtOjoke0F3cy5BQ0NPVU5UX0lEfTpyb2xlLyR7QXdzLlJFR0lPTn0vJHt0aGlzLmNvbmZpZy5hbGxvd0FkbWluUm9sZX1gLFxuICAgICk7XG5cbiAgICBjb25zdCBjbHVzdGVyID0gbmV3IGVrcy5DbHVzdGVyKHRoaXMsICdDbHVzdGVyJywge1xuICAgICAgY2x1c3Rlck5hbWU6IGNvbmZpZy5jbHVzdGVyTmFtZSxcbiAgICAgIHZwYzogdnBjLFxuICAgICAgZGVmYXVsdENhcGFjaXR5OiAwLCAvLyB3ZSB3YW50IHRvIG1hbmFnZSBjYXBhY2l0eSBvdXIgc2VsdmVzXG4gICAgICB2ZXJzaW9uOiBla3MuS3ViZXJuZXRlc1ZlcnNpb24uVjFfMjEsXG4gICAgICBjbHVzdGVySGFuZGxlckVudmlyb25tZW50OiB7XG4gICAgICAgIHJvbGVBcm46IGNsdXN0ZXJIYW5kbGVyUm9sZS5yb2xlQXJuLFxuICAgICAgfSxcbiAgICAgIHZwY1N1Ym5ldHM6IFt7IHN1Ym5ldFR5cGU6IGVjMi5TdWJuZXRUeXBlLlBSSVZBVEVfV0lUSF9OQVQgfV0sXG4gICAgICBzZWN1cml0eUdyb3VwOiBuZXcgZWMyLlNlY3VyaXR5R3JvdXAodGhpcywgJ0NsdXN0ZXJDb250cm9sUGFuZVNlY3VyaXR5R3JvdXAnLCB7XG4gICAgICAgIHZwYzogdnBjLFxuICAgICAgICBkZXNjcmlwdGlvbjogJ1NlY3VyaXR5IGdyb3VwIGZvciBFS1MgY2x1c3RlciBjb250cm9sIHBsYW5lJyxcbiAgICAgIH0pLFxuICAgICAgLy8gbWFzdGVyc1JvbGU6IHJvbGUgLy8gT3IgZWxzZSB3ZSBhcmUgdW5hYmxlIHRvIGxvZ2luXG4gICAgfSk7XG5cbiAgICByZXR1cm4gY2x1c3RlcjtcbiAgfVxuXG4gIGNyZWF0ZVdvcmtlck5vZGVHcm91cChla3NDbHVzdGVyOiBla3MuQ2x1c3Rlciwgd29ya2VyTm9kZVJvbGU6IFJvbGUsIHZwYzogSVZwYykge1xuICAgIGVrc0NsdXN0ZXIuYWRkTm9kZWdyb3VwQ2FwYWNpdHkodGhpcy5jb25maWcud29ya2VyR3JvdXBOYW1lLCB7XG4gICAgICBpbnN0YW5jZVR5cGVzOiBjb252ZXJ0U3RyaW5nVG9BcnJheSh0aGlzLmNvbmZpZy53b3JrZXJJbnN0YW5jZVR5cGVzKS5tYXAoXG4gICAgICAgIChpbnN0YW5jZVR5cGUpID0+IG5ldyBlYzIuSW5zdGFuY2VUeXBlKGluc3RhbmNlVHlwZSksXG4gICAgICApLFxuICAgICAgbm9kZWdyb3VwTmFtZTogdGhpcy5jb25maWcud29ya2VyR3JvdXBOYW1lLFxuICAgICAgbm9kZVJvbGU6IHdvcmtlck5vZGVSb2xlLFxuICAgICAgY2FwYWNpdHlUeXBlOiB0aGlzLmNvbmZpZy53b3JrZXJDYXBhY2l0eVR5cGUgPT09ICdTUE9UJyA/IENhcGFjaXR5VHlwZS5TUE9UIDogQ2FwYWNpdHlUeXBlLk9OX0RFTUFORCxcbiAgICAgIHN1Ym5ldHM6IHZwYy5zZWxlY3RTdWJuZXRzKHsgc3VibmV0VHlwZTogZWMyLlN1Ym5ldFR5cGUuUFJJVkFURV9XSVRIX05BVCB9KSxcbiAgICAgIGRlc2lyZWRTaXplOiBOdW1iZXIodGhpcy5jb25maWcud29ya2VyRGVzaXJlZFNpemUpLFxuICAgICAgbWluU2l6ZTogTnVtYmVyKHRoaXMuY29uZmlnLndvcmtlck1pblNpemUpLFxuICAgICAgbWF4U2l6ZTogTnVtYmVyKHRoaXMuY29uZmlnLndvcmtlck1heFNpemUpLFxuICAgIH0pO1xuICB9XG5cbiAgLy8gV2hlbiB1c2luZyBmYXJnYXRlIGZvciBmaXJzdCB0aW1lIHlvdSBtYXkgaGF2ZSB0byBjcmVhdGUgdGhlIHNlcnZpY2UgbGlua2VkIHJvbGVcbiAgLy8gYXdzIGlhbSBjcmVhdGUtc2VydmljZS1saW5rZWQtcm9sZSBcXFxuICAvLyAtLWF3cy1zZXJ2aWNlLW5hbWUgZWtzLWZhcmdhdGUuYW1hem9uYXdzLmNvbSBcXFxuICAvLyAtLWRlc2NyaXB0aW9uIFwiU2VydmljZS1saW5rZWQgcm9sZSB0byBzdXBwb3J0IGZhcmdhdGVcIlxuXG4gIGNyZWF0ZUZhcmdhdGVQcm9maWxlcyhjbHVzdGVyOiBla3MuQ2x1c3RlciwgdnBjOiBJVnBjLCBuczogZWtzLkt1YmVybmV0ZXNNYW5pZmVzdFtdKTogZWtzLkZhcmdhdGVQcm9maWxlW10ge1xuXG4gICAgY29uc3QgcG9saWN5ID0gdGhpcy5jcmVhdGVFS1NGYXJnYXRlQ2xvdWR3YXRjaFBvbGljeSgpXG5cbiAgICB2YXIgcHJvZmlsZXM6IGVrcy5GYXJnYXRlUHJvZmlsZVtdID0gW107XG4gICAgdGhpcy5jb25maWcuZmFyZ2F0ZVByb2ZpbGVzPy5mb3JFYWNoKChwcm9maWxlKSA9PiB7XG5cbiAgICAgIGNvbnN0IHAgPSBuZXcgZWtzLkZhcmdhdGVQcm9maWxlKHRoaXMsIHByb2ZpbGUubmFtZSwge1xuICAgICAgICBjbHVzdGVyLFxuICAgICAgICBzZWxlY3RvcnM6IHByb2ZpbGUuc2VsZWN0b3JzLFxuICAgICAgICB2cGM6IHZwYyxcbiAgICAgICAgc3VibmV0U2VsZWN0aW9uOiB2cGMuc2VsZWN0U3VibmV0cyh7IHN1Ym5ldFR5cGU6IGVjMi5TdWJuZXRUeXBlLlBSSVZBVEVfV0lUSF9OQVQgfSksXG4gICAgICB9KTtcbiAgICAgIC8vIHRoaXMgaXMgcmVxdWlyZWQgZm9yIGxvZ2dpbmdcbiAgICAgIHAucG9kRXhlY3V0aW9uUm9sZS5hdHRhY2hJbmxpbmVQb2xpY3kocG9saWN5KVxuXG4gICAgICBwcm9maWxlcy5wdXNoKHApO1xuXG4gICAgfSk7XG5cbiAgICAvLyBFbmFibGUgYXV0b21hdGljIGNsb3Vkd3dhdGNoIGxvZ2dpbmcgZm9yIHRoZSBzYW1lLiBUaGlzIHJlcXVpcmVzIGEgbmFtZXNwYWNlIGFuZCBhIGNvbmZpZyBtYXBcblxuICAgIGNvbnN0IG5hbWVzcGFjZSA9IGNsdXN0ZXIuYWRkTWFuaWZlc3QoJ2F3cy1vYnNlcnZhYmlsaXR5Jywge1xuICAgICAgYXBpVmVyc2lvbjogJ3YxJyxcbiAgICAgIGtpbmQ6ICdOYW1lc3BhY2UnLFxuICAgICAgbWV0YWRhdGE6IHsgbmFtZTogJ2F3cy1vYnNlcnZhYmlsaXR5JywgbGFiZWxzOiB7ICdhd3Mtb2JzZXJ2YWJpbGl0eSc6ICdlbmFibGVkJyB9IH0sXG4gICAgfSk7XG5cbiAgICAvLyB5YW1sXG4gICAgbGV0IGRhdGFSZXN1bHQ6IFJlY29yZDxzdHJpbmcsIG9iamVjdD5bXSA9IFtdO1xuICAgIHRyeSB7XG5cbiAgICAgIGNvbnN0IHBhdGggPSByZXF1aXJlKCdwYXRoJyk7XG5cbiAgICAgIGxldCB2YWx1ZXNZYW1sID0gZnMucmVhZEZpbGVTeW5jKHBhdGguam9pbihfX2Rpcm5hbWUsIGAuL21hbmlmZXN0cy9mYXJnYXRlLWNsb3Vkd2F0Y2gtbG9nZ2luZy55YW1sYCkpO1xuICAgICAgLy8gUmVwbGFjZSBEb21haW4gYW5kIGxvYWQgWUFNTFxuICAgICAgbGV0IHZhbHVlc1BhcnNlZCA9IHlhbWwubG9hZEFsbCh2YWx1ZXNZYW1sLnRvU3RyaW5nKClcbiAgICAgICAgLnJlcGxhY2UobmV3IFJlZ0V4cCgne0FXU19SRUdJT059JywgJ2dpJyksIEF3cy5SRUdJT04pXG4gICAgICAgIC5yZXBsYWNlKG5ldyBSZWdFeHAoJ3tDTFVTVEVSX05BTUV9JywgJ2dpJyksIGNsdXN0ZXIuY2x1c3Rlck5hbWUpXG4gICAgICApO1xuICAgICAgaWYgKHR5cGVvZiB2YWx1ZXNQYXJzZWQgPT09ICdvYmplY3QnICYmIHZhbHVlc1BhcnNlZCAhPT0gbnVsbCkge1xuICAgICAgICBkYXRhUmVzdWx0ID0gdmFsdWVzUGFyc2VkIGFzIFJlY29yZDxzdHJpbmcsIG9iamVjdD5bXTtcbiAgICAgIH1cbiAgICB9IGNhdGNoIChleGNlcHRpb24pIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoXCIgPiBGYWlsZWQgdG8gbG9hZCAnZmFyZ2F0ZS1jbG91ZHdhdGNoLWxvZ2dpbmcueWFtbCcgZm9yICdFS1MgQ2x1c3RlcicgZGVwbG95Li4uXCIpO1xuICAgICAgY29uc29sZS5lcnJvcihleGNlcHRpb24pO1xuICAgICAgZXhpdFxuICAgIH1cblxuICAgIGRhdGFSZXN1bHQuZm9yRWFjaChmdW5jdGlvbiAodmFsLCBpZHgpIHtcbiAgICAgIGNvbnN0IGEgPSBjbHVzdGVyLmFkZE1hbmlmZXN0KCdmYXJnYXRlLWNsb3Vkd2F0Y2gtbG9nZ2luZy0nICsgaWR4LCB2YWwpO1xuICAgICAgYS5ub2RlLmFkZERlcGVuZGVuY3kobmFtZXNwYWNlKVxuICAgIH0pO1xuXG4gICAgcmV0dXJuIHByb2ZpbGVzO1xuICB9XG5cbiAgY3JlYXRlRUtTRmFyZ2F0ZUNsb3Vkd2F0Y2hQb2xpY3koKTogUG9saWN5IHtcbiAgICAvLyBlYWNoIHBvZCBleGVjdXRpb24gcm9sZSBuZWVkcyB0byBoYXZlIHRoZSBwb2xpY3lcbiAgICBjb25zdCBpYW1Qb2xpY3lEb2N1bWVudCA9IEpTT04ucGFyc2UoYHtcbiAgICAgIFwiVmVyc2lvblwiOiBcIjIwMTItMTAtMTdcIixcbiAgICAgIFwiU3RhdGVtZW50XCI6IFt7XG4gICAgICAgIFwiRWZmZWN0XCI6IFwiQWxsb3dcIixcbiAgICAgICAgXCJBY3Rpb25cIjogW1xuICAgICAgICAgIFwibG9nczpDcmVhdGVMb2dTdHJlYW1cIixcbiAgICAgICAgICBcImxvZ3M6Q3JlYXRlTG9nR3JvdXBcIixcbiAgICAgICAgICBcImxvZ3M6RGVzY3JpYmVMb2dTdHJlYW1zXCIsXG4gICAgICAgICAgXCJsb2dzOlB1dExvZ0V2ZW50c1wiXG4gICAgICAgIF0sXG4gICAgICAgIFwiUmVzb3VyY2VcIjogXCIqXCJcbiAgICAgIH1dXG4gICAgfWApXG5cbiAgICAvLyBDcmVhdGUgSUFNIFBvbGljeVxuICAgIGNvbnN0IGlhbVBvbGljeSA9IG5ldyBQb2xpY3kodGhpcywgJ0VLU0ZhcmdhdGVMb2dnaW5nUG9saWN5Jywge1xuICAgICAgcG9saWN5TmFtZTogJ0VLU0ZhcmdhdGVMb2dnaW5nUG9saWN5JyxcbiAgICAgIGRvY3VtZW50OiBQb2xpY3lEb2N1bWVudC5mcm9tSnNvbihpYW1Qb2xpY3lEb2N1bWVudCksXG4gICAgfSk7XG5cbiAgICByZXR1cm4gaWFtUG9saWN5XG4gIH1cblxuICBjcmVhdGVOYW1lc3BhY2VzKHNlbGVjdG9yczogU2VsZWN0b3JbXSwgY2x1c3RlcjogZWtzLkNsdXN0ZXIpOiBla3MuS3ViZXJuZXRlc01hbmlmZXN0W10ge1xuICAgIC8vIENyZWF0ZXMgbmFtZXNwYWNlICBmb3IgZmFyZ2F0ZSBwcm9maWxlc1xuXG4gICAgdmFyIG5zOiBla3MuS3ViZXJuZXRlc01hbmlmZXN0W10gPSBbXTtcblxuICAgIHNlbGVjdG9ycy5mb3JFYWNoKChzZWxlY3RvcikgPT4ge1xuICAgICAgY29uc3QgbmFtZXNwYWNlID0ge1xuICAgICAgICBhcGlWZXJzaW9uOiAndjEnLFxuICAgICAgICBraW5kOiAnTmFtZXNwYWNlJyxcbiAgICAgICAgbWV0YWRhdGE6IHsgbmFtZTogc2VsZWN0b3IubmFtZXNwYWNlIH0sXG4gICAgICB9O1xuXG4gICAgICBucy5wdXNoKFxuICAgICAgICBuZXcgZWtzLkt1YmVybmV0ZXNNYW5pZmVzdCh0aGlzLCBgJHtzZWxlY3Rvci5uYW1lc3BhY2V9TlNgLCB7XG4gICAgICAgICAgY2x1c3RlcixcbiAgICAgICAgICBtYW5pZmVzdDogW25hbWVzcGFjZV0sXG4gICAgICAgIH0pLFxuICAgICAgKTtcbiAgICB9KTtcblxuICAgIHJldHVybiBucztcbiAgfVxuXG4gIGNyZWF0ZVMzQnVja2V0cygpOiB2b2lkIHtcbiAgICB0aGlzLmNvbmZpZy5zM0J1Y2tldHM/LmZvckVhY2goYnVja2V0ID0+IHtcbiAgICAgIGlmIChidWNrZXQuaXNQcml2YXRlV2l0aENvcnMpIHtcbiAgICAgICAgY29uc3QgYiA9IG5ldyBCdWNrZXQodGhpcywgYnVja2V0Lm5hbWUsIHtcbiAgICAgICAgICBidWNrZXROYW1lOiBidWNrZXQubmFtZSxcbiAgICAgICAgICBlbmNyeXB0aW9uOiBCdWNrZXRFbmNyeXB0aW9uLlMzX01BTkFHRUQsXG4gICAgICAgICAgZW5mb3JjZVNTTDogdHJ1ZSxcbiAgICAgICAgICBwdWJsaWNSZWFkQWNjZXNzOiBmYWxzZSxcbiAgICAgICAgICBibG9ja1B1YmxpY0FjY2VzczogQmxvY2tQdWJsaWNBY2Nlc3MuQkxPQ0tfQUxMLFxuICAgICAgICAgIGNvcnM6IGJ1Y2tldC5jb3JzLFxuICAgICAgICAgIHZlcnNpb25lZDogdHJ1ZSxcbiAgICAgICAgICByZW1vdmFsUG9saWN5OiBSZW1vdmFsUG9saWN5LkRFU1RST1ksXG4gICAgICAgIH0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29uc3QgYiA9IG5ldyBCdWNrZXQodGhpcywgYnVja2V0Lm5hbWUsIHtcbiAgICAgICAgICBidWNrZXROYW1lOiBidWNrZXQubmFtZSxcbiAgICAgICAgICBlbmNyeXB0aW9uOiBCdWNrZXRFbmNyeXB0aW9uLlMzX01BTkFHRUQsXG4gICAgICAgICAgZW5mb3JjZVNTTDogdHJ1ZSxcbiAgICAgICAgICBwdWJsaWNSZWFkQWNjZXNzOiBmYWxzZSxcbiAgICAgICAgICBibG9ja1B1YmxpY0FjY2VzczogQmxvY2tQdWJsaWNBY2Nlc3MuQkxPQ0tfQUxMLFxuICAgICAgICAgIHZlcnNpb25lZDogdHJ1ZSxcbiAgICAgICAgICByZW1vdmFsUG9saWN5OiBSZW1vdmFsUG9saWN5LkRFU1RST1ksXG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgY3JlYXRlUGFyYW1zKCkge1xuICAgIC8vIEV4cG9ydCBmZXcgcGFyYW1ldGVycyBmb3IgYXBwbGljYXRpb24gdXNhZ2VcbiAgICBuZXcgU3RyaW5nUGFyYW1ldGVyKFxuICAgICAgdGhpcywgXCJFS1NDbHVzdGVySGFuZGxlclJvbGVcIixcbiAgICAgIHtcbiAgICAgICAgcGFyYW1ldGVyTmFtZTogYC9hY2NvdW50L3N0YWNrcy8ke3RoaXMuc3RhY2tOYW1lfS9rdWJlY3RsLXJvbGVgLFxuICAgICAgICBzdHJpbmdWYWx1ZTogdGhpcy5la3NDbHVzdGVyLmt1YmVjdGxSb2xlIS5yb2xlQXJuLFxuICAgICAgICBkZXNjcmlwdGlvbjogXCJLdWJlY3RsIFJvbGUgZm9yIHN0YWNrIG9wZXJhdGlvbnNcIlxuICAgICAgfVxuICAgICk7XG5cbiAgfVxufVxuIl19
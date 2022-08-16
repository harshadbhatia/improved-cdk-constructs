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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
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
const argo_cd_1 = require("./argo-cd");
const aws_load_balancer_controller_2_4_2_json_1 = __importDefault(require("./policies/aws-load-balancer-controller-2.4.2.json"));
class EKSCluster extends cdk.Stack {
    constructor(scope, id, config, props) {
        var _a, _b, _c;
        super(scope, id, props);
        this.config = config;
        const vpc = this.getVPC();
        const clusterHandlerRole = this.createClusterHandlerRole();
        const policyStatement = new aws_iam_1.PolicyStatement({
            sid: 'AllowSubnetDiscovery',
            actions: ['ec2:DescribeAvailabilityZones'],
            effect: aws_iam_1.Effect.ALLOW,
            resources: ['*'],
        });
        const policyDocument = new aws_iam_1.PolicyDocument({
            statements: [policyStatement],
        });
        // IAM role for our EC2 worker nodes
        const workerRole = new iam.Role(this, 'EKSWorkerRole', {
            assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
            managedPolicies: [
                iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonEKSWorkerNodePolicy'),
                iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonEC2ContainerRegistryReadOnly'),
                iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonEKS_CNI_Policy'),
                iam.ManagedPolicy.fromAwsManagedPolicyName('CloudWatchAgentServerPolicy'),
                iam.ManagedPolicy.fromAwsManagedPolicyName('ElasticLoadBalancingFullAccess'),
            ],
            inlinePolicies: {
                AllowSubnetDiscovery: aws_iam_1.PolicyDocument.fromJson(aws_load_balancer_controller_2_4_2_json_1.default),
            }
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
        if ((_a = this.config.addons) === null || _a === void 0 ? void 0 : _a.loadBalancer) {
            new load_balancer_controller_1.AwsLoadBalancerController(this, 'AwsLoadBalancerController', this.eksCluster, this.config.addons.loadBalancer);
        }
        if ((_c = (_b = this.config.addons) === null || _b === void 0 ? void 0 : _b.efs) === null || _c === void 0 ? void 0 : _c.enabled) {
            new efs_csi_driver_1.AwsEFSCSIDriver(this, 'AwsEFSCSIDriver', this.eksCluster, this.config.addons.efs);
        }
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
        this.installArgoCD(this.eksCluster);
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
            managedPolicies: [
                iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonEKSClusterPolicy')
            ]
        });
        return clusterHandlerRole;
    }
    createEKSCluster(vpc, config, clusterHandlerRole) {
        // const role = Role.fromRoleArn(
        //   this,
        //   'AdminRole',
        //   `arn:aws:iam::${Aws.ACCOUNT_ID}:role/${Aws.REGION}/${this.config.allowAdminRole}`,
        // );
        const cpSg = new ec2.SecurityGroup(this, 'ClusterControlPaneSecurityGroup', {
            vpc: vpc,
            description: 'Security group for EKS cluster control plane',
            securityGroupName: `${config.clusterName}-control-plane-sg`,
        });
        if (config.isPrivateCluster) { // We allow by default all traffic to the cluster from Private subnets
            vpc.privateSubnets.forEach(subnet => {
                cpSg.addIngressRule(ec2.Peer.ipv4(subnet.ipv4CidrBlock), ec2.Port.allTcp(), 'Allow control plane traffic from VPC (Private)');
            });
        }
        const cluster = new eks.Cluster(this, 'Cluster', {
            clusterName: config.clusterName,
            vpc: vpc,
            placeClusterHandlerInVpc: config.placeClusterHandlerInVpc ? config.placeClusterHandlerInVpc : false,
            defaultCapacity: 0,
            version: eks.KubernetesVersion.V1_21,
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
    installArgoCD(cluster) {
        // https://raw.githubusercontent.com/argoproj/argo-cd/v2.4.7/manifests/install.yaml
        if (this.config.installArgoCD) {
            new argo_cd_1.ArgoCD(this, 'ArgoCD', {
                clusterName: this.config.clusterName,
                eksCluster: this.eksCluster,
            });
        }
    }
}
exports.EKSCluster = EKSCluster;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWtzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZWtzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsMkNBQTRDO0FBQzVDLDJDQUE0QztBQUM1QywyQ0FBNEM7QUFDNUMsMkNBQTRDO0FBQzVDLG1DQUFvQztBQUNwQyw2Q0FBaUQ7QUFFakQsaURBQXNGO0FBQ3RGLGlEQVE2QjtBQUM3QiwrQ0FBaUY7QUFHakYsNENBQXVEO0FBQ3ZELGlFQUErRDtBQUMvRCxxRkFBbUY7QUFDbkYseUVBQXVFO0FBQ3ZFLG1FQUE0RDtBQUM1RCxpREFBNkM7QUFFN0MsaURBQXNEO0FBQ3RELHVDQUF5QjtBQUN6Qiw4Q0FBZ0M7QUFDaEMscUNBQStCO0FBQy9CLHVDQUFtQztBQUNuQyxpSUFBbUU7QUFHbkUsTUFBYSxVQUFXLFNBQVEsR0FBRyxDQUFDLEtBQUs7SUFJdkMsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxNQUFzQixFQUFFLEtBQXNCOztRQUN0RixLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUN4QixJQUFJLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQztRQUVyQixNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7UUFFMUIsTUFBTSxrQkFBa0IsR0FBRyxJQUFJLENBQUMsd0JBQXdCLEVBQUUsQ0FBQztRQUUzRCxNQUFNLGVBQWUsR0FBRyxJQUFJLHlCQUFlLENBQUM7WUFDMUMsR0FBRyxFQUFFLHNCQUFzQjtZQUMzQixPQUFPLEVBQUUsQ0FBQywrQkFBK0IsQ0FBQztZQUMxQyxNQUFNLEVBQUUsZ0JBQU0sQ0FBQyxLQUFLO1lBQ3BCLFNBQVMsRUFBRSxDQUFDLEdBQUcsQ0FBQztTQUNqQixDQUFDLENBQUM7UUFFSCxNQUFNLGNBQWMsR0FBRyxJQUFJLHdCQUFjLENBQUM7WUFDeEMsVUFBVSxFQUFFLENBQUMsZUFBZSxDQUFDO1NB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Q0FBQyxTQUFTLGVBQWU7WUFDL0QsV0FBVyxFQUFFLElBQUksQ0FBQyxVQUFVLENBQUMsV0FBWSxDQUFDLE9BQU87WUFDakQsV0FBVyxFQUFFLG1DQUFtQztTQUNqRCxDQUNGLENBQUM7SUFFSixDQUFDO0lBRUQsYUFBYSxDQUFDLE9BQW9CO1FBQ2hDLG1GQUFtRjtRQUNuRixJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsYUFBYSxFQUFFO1lBQzdCLElBQUksZ0JBQU0sQ0FBQyxJQUFJLEVBQUUsUUFBUSxFQUFFO2dCQUN6QixXQUFXLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxXQUFXO2dCQUNwQyxVQUFVLEVBQUUsSUFBSSxDQUFDLFVBQVU7YUFDNUIsQ0FBQyxDQUFDO1NBQ0o7SUFDSCxDQUFDO0NBQ0Y7QUEzVkQsZ0NBMlZDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IGlhbSA9IHJlcXVpcmUoJ2F3cy1jZGstbGliL2F3cy1pYW0nKTtcbmltcG9ydCBlYzIgPSByZXF1aXJlKCdhd3MtY2RrLWxpYi9hd3MtZWMyJyk7XG5pbXBvcnQgZWtzID0gcmVxdWlyZSgnYXdzLWNkay1saWIvYXdzLWVrcycpO1xuaW1wb3J0IHNzbSA9IHJlcXVpcmUoJ2F3cy1jZGstbGliL2F3cy1zc20nKTtcbmltcG9ydCBjZGsgPSByZXF1aXJlKCdhd3MtY2RrLWxpYicpO1xuaW1wb3J0IHsgQXdzLCBSZW1vdmFsUG9saWN5IH0gZnJvbSAnYXdzLWNkay1saWInO1xuaW1wb3J0IHsgSVZwYyB9IGZyb20gJ2F3cy1jZGstbGliL2F3cy1lYzInO1xuaW1wb3J0IHsgQ2FwYWNpdHlUeXBlLCBDbHVzdGVyLCBFbmRwb2ludEFjY2VzcywgU2VsZWN0b3IgfSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtZWtzJztcbmltcG9ydCB7XG4gIENvbXBvc2l0ZVByaW5jaXBhbCxcbiAgRWZmZWN0LFxuICBQb2xpY3ksXG4gIFBvbGljeURvY3VtZW50LFxuICBQb2xpY3lTdGF0ZW1lbnQsXG4gIFJvbGUsXG4gIFNlcnZpY2VQcmluY2lwYWxcbn0gZnJvbSAnYXdzLWNkay1saWIvYXdzLWlhbSc7XG5pbXBvcnQgeyBCbG9ja1B1YmxpY0FjY2VzcywgQnVja2V0LCBCdWNrZXRFbmNyeXB0aW9uIH0gZnJvbSAnYXdzLWNkay1saWIvYXdzLXMzJztcbmltcG9ydCB7IENvbnN0cnVjdCB9IGZyb20gJ2NvbnN0cnVjdHMnO1xuaW1wb3J0IHsgRUtTU3RhY2tDb25maWcgfSBmcm9tICcuLi8uLi9pbnRlcmZhY2VzL2xpYi9la3MvaW50ZXJmYWNlcyc7XG5pbXBvcnQgeyBjb252ZXJ0U3RyaW5nVG9BcnJheSB9IGZyb20gJy4uL3V0aWxzL2NvbW1vbic7XG5pbXBvcnQgeyBBd3NFRlNDU0lEcml2ZXIgfSBmcm9tICcuL2NvbnRyb2xsZXJzL2Vmcy1jc2ktZHJpdmVyJztcbmltcG9ydCB7IEF3c0xvYWRCYWxhbmNlckNvbnRyb2xsZXIgfSBmcm9tICcuL2NvbnRyb2xsZXJzL2xvYWQtYmFsYW5jZXItY29udHJvbGxlcic7XG5pbXBvcnQgeyBBd3NTZWNyZXRzQ1NJRHJpdmVyIH0gZnJvbSAnLi9jb250cm9sbGVycy9zZWNyZXRzLWNzaS1kcml2ZXInO1xuaW1wb3J0IHsgQ2xvdWR3YXRjaExvZ2dpbmcgfSBmcm9tICcuL2N3LWxvZ2dpbmctbW9uaXRvcmluZyc7XG5pbXBvcnQgeyBFeHRlcm5hbEROUyB9IGZyb20gJy4vZXh0ZXJuYWwtZG5zJztcblxuaW1wb3J0IHsgU3RyaW5nUGFyYW1ldGVyIH0gZnJvbSAnYXdzLWNkay1saWIvYXdzLXNzbSc7XG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcyc7XG5pbXBvcnQgKiBhcyB5YW1sIGZyb20gJ2pzLXlhbWwnO1xuaW1wb3J0IHsgZXhpdCB9IGZyb20gJ3Byb2Nlc3MnO1xuaW1wb3J0IHsgQXJnb0NEIH0gZnJvbSAnLi9hcmdvLWNkJztcbmltcG9ydCBsYiBmcm9tICcuL3BvbGljaWVzL2F3cy1sb2FkLWJhbGFuY2VyLWNvbnRyb2xsZXItMi40LjIuanNvbidcblxuXG5leHBvcnQgY2xhc3MgRUtTQ2x1c3RlciBleHRlbmRzIGNkay5TdGFjayB7XG4gIGNvbmZpZzogRUtTU3RhY2tDb25maWc7XG4gIGVrc0NsdXN0ZXI6IENsdXN0ZXI7XG5cbiAgY29uc3RydWN0b3Ioc2NvcGU6IENvbnN0cnVjdCwgaWQ6IHN0cmluZywgY29uZmlnOiBFS1NTdGFja0NvbmZpZywgcHJvcHM/OiBjZGsuU3RhY2tQcm9wcykge1xuICAgIHN1cGVyKHNjb3BlLCBpZCwgcHJvcHMpO1xuICAgIHRoaXMuY29uZmlnID0gY29uZmlnO1xuXG4gICAgY29uc3QgdnBjID0gdGhpcy5nZXRWUEMoKTtcblxuICAgIGNvbnN0IGNsdXN0ZXJIYW5kbGVyUm9sZSA9IHRoaXMuY3JlYXRlQ2x1c3RlckhhbmRsZXJSb2xlKCk7XG5cbiAgICBjb25zdCBwb2xpY3lTdGF0ZW1lbnQgPSBuZXcgUG9saWN5U3RhdGVtZW50KHtcbiAgICAgIHNpZDogJ0FsbG93U3VibmV0RGlzY292ZXJ5JyxcbiAgICAgIGFjdGlvbnM6IFsnZWMyOkRlc2NyaWJlQXZhaWxhYmlsaXR5Wm9uZXMnXSxcbiAgICAgIGVmZmVjdDogRWZmZWN0LkFMTE9XLFxuICAgICAgcmVzb3VyY2VzOiBbJyonXSxcbiAgICB9KTtcblxuICAgIGNvbnN0IHBvbGljeURvY3VtZW50ID0gbmV3IFBvbGljeURvY3VtZW50KHtcbiAgICAgIHN0YXRlbWVudHM6IFtwb2xpY3lTdGF0ZW1lbnRdLFxuXG4gICAgfSk7XG5cbiAgICAvLyBJQU0gcm9sZSBmb3Igb3VyIEVDMiB3b3JrZXIgbm9kZXNcbiAgICBjb25zdCB3b3JrZXJSb2xlID0gbmV3IGlhbS5Sb2xlKHRoaXMsICdFS1NXb3JrZXJSb2xlJywge1xuICAgICAgYXNzdW1lZEJ5OiBuZXcgaWFtLlNlcnZpY2VQcmluY2lwYWwoJ2VjMi5hbWF6b25hd3MuY29tJyksXG4gICAgICBtYW5hZ2VkUG9saWNpZXM6IFtcbiAgICAgICAgaWFtLk1hbmFnZWRQb2xpY3kuZnJvbUF3c01hbmFnZWRQb2xpY3lOYW1lKCdBbWF6b25FS1NXb3JrZXJOb2RlUG9saWN5JyksXG4gICAgICAgIGlhbS5NYW5hZ2VkUG9saWN5LmZyb21Bd3NNYW5hZ2VkUG9saWN5TmFtZSgnQW1hem9uRUMyQ29udGFpbmVyUmVnaXN0cnlSZWFkT25seScpLFxuICAgICAgICBpYW0uTWFuYWdlZFBvbGljeS5mcm9tQXdzTWFuYWdlZFBvbGljeU5hbWUoJ0FtYXpvbkVLU19DTklfUG9saWN5JyksXG4gICAgICAgIGlhbS5NYW5hZ2VkUG9saWN5LmZyb21Bd3NNYW5hZ2VkUG9saWN5TmFtZSgnQ2xvdWRXYXRjaEFnZW50U2VydmVyUG9saWN5JyksXG4gICAgICAgIGlhbS5NYW5hZ2VkUG9saWN5LmZyb21Bd3NNYW5hZ2VkUG9saWN5TmFtZSgnRWxhc3RpY0xvYWRCYWxhbmNpbmdGdWxsQWNjZXNzJyksXG4gICAgICBdLFxuICAgICAgaW5saW5lUG9saWNpZXM6IHtcbiAgICAgICAgQWxsb3dTdWJuZXREaXNjb3Zlcnk6IFBvbGljeURvY3VtZW50LmZyb21Kc29uKGxiKSxcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIHRoaXMuZWtzQ2x1c3RlciA9IHRoaXMuY3JlYXRlRUtTQ2x1c3Rlcih2cGMsIGNvbmZpZywgY2x1c3RlckhhbmRsZXJSb2xlKTtcblxuICAgIGlmICh0aGlzLmNvbmZpZy5hbGxvd0FkbWluUm9sZSkge1xuICAgICAgY29uc3Qgcm9sZSA9IFJvbGUuZnJvbVJvbGVBcm4oXG4gICAgICAgIHRoaXMsXG4gICAgICAgICdBZG1pblJvbGVBdXRoJyxcbiAgICAgICAgYGFybjphd3M6aWFtOjoke0F3cy5BQ0NPVU5UX0lEfTpyb2xlLyR7dGhpcy5jb25maWcuYWxsb3dBZG1pblJvbGV9YCxcbiAgICAgICk7XG5cbiAgICAgIHRoaXMuZWtzQ2x1c3Rlci5hd3NBdXRoLmFkZFJvbGVNYXBwaW5nKHJvbGUsIHtcbiAgICAgICAgZ3JvdXBzOiBbXCJzeXN0ZW06Ym9vdHN0cmFwcGVyc1wiLCBcInN5c3RlbTpub2Rlc1wiLCBcInN5c3RlbTptYXN0ZXJzXCJdLFxuICAgICAgICB1c2VybmFtZTogJ2FkbWluJyxcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIC8vIFdlIHdhbnQgdG8gY3JlYXRlIG5hbWVzcGFjZXMgZmlyc3QsIHNvIHRoZSBkZXBlbmRlbmNpZXMgYXJlIHJlc29sdmVkIGJldHdlZW4gU0EgYW5kIGNoYXJ0IGluc3RhbGxhdGlvbi5cbiAgICAvLyBEbyBpdCBzb29uZXIgYXMgdGhlcmUgaXMgYSBzbWFsbCBkZWxheSBiZXR3ZWVuIGNyZWF0aW9uIG9mIG5hbWVzcGFjZSBhbmQgY3JlYXRpb24gb2Ygc2VydmljZSBhY2NvdW50XG4gICAgdmFyIG5zOiBla3MuS3ViZXJuZXRlc01hbmlmZXN0W10gPSBbXTtcbiAgICBpZiAodGhpcy5jb25maWcubmFtZXNwYWNlcykge1xuICAgICAgbnMgPSB0aGlzLmNyZWF0ZU5hbWVzcGFjZXModGhpcy5jb25maWcubmFtZXNwYWNlcywgdGhpcy5la3NDbHVzdGVyKTtcbiAgICB9XG4gICAgLy8gV2UgY3JlYXRlIHByb2ZpbGVzIG9uY2UgYWxsIG5hbWVzcGFjZXMgYXJlIGNyZWF0ZWQuXG4gICAgdmFyIHByb2ZpbGVzOiBla3MuRmFyZ2F0ZVByb2ZpbGVbXSA9IFtdO1xuXG4gICAgcHJvZmlsZXMgPSB0aGlzLmNyZWF0ZUZhcmdhdGVQcm9maWxlcyh0aGlzLmVrc0NsdXN0ZXIsIHZwYywgbnMpO1xuICAgIHRoaXMuY3JlYXRlV29ya2VyTm9kZUdyb3VwKHRoaXMuZWtzQ2x1c3Rlciwgd29ya2VyUm9sZSwgdnBjKTtcblxuICAgIC8vIEVuYWJsZSBjbHVzdGVyIGxvZ2dpbmcgYW5kIE1vbml0b3JpbmdcbiAgICBuZXcgQ2xvdWR3YXRjaExvZ2dpbmcodGhpcywgJ0Nsb3VkV2F0Y2hMb2dnaW5nTmVzdGVkJywgdGhpcy5la3NDbHVzdGVyKTtcblxuICAgIC8vIEV4dGVyYW5sIEROUyByZWxhdGVkIHN0YWNrXG4gICAgLy8gbmV3IFByb21ldGhldXNTdGFjayh0aGlzLCAnUHJvbWV0aGV1c1N0YWNrJywgZWtzQ2x1c3RlcilcblxuICAgIGlmICh0aGlzLmNvbmZpZy5hZGRvbnM/LmxvYWRCYWxhbmNlcikge1xuICAgICAgbmV3IEF3c0xvYWRCYWxhbmNlckNvbnRyb2xsZXIodGhpcywgJ0F3c0xvYWRCYWxhbmNlckNvbnRyb2xsZXInLCB0aGlzLmVrc0NsdXN0ZXIsIHRoaXMuY29uZmlnLmFkZG9ucy5sb2FkQmFsYW5jZXIpO1xuICAgIH1cblxuICAgIGlmICh0aGlzLmNvbmZpZy5hZGRvbnM/LmVmcz8uZW5hYmxlZCkge1xuICAgICAgbmV3IEF3c0VGU0NTSURyaXZlcih0aGlzLCAnQXdzRUZTQ1NJRHJpdmVyJywgdGhpcy5la3NDbHVzdGVyLCB0aGlzLmNvbmZpZy5hZGRvbnMuZWZzKTtcbiAgICB9XG5cblxuICAgIG5ldyBBd3NTZWNyZXRzQ1NJRHJpdmVyKHRoaXMsICdBd3NTZWNyZXRzQ1NJRHJpdmVyJywgdGhpcy5la3NDbHVzdGVyKTtcbiAgICBuZXcgRXh0ZXJuYWxETlModGhpcywgJ0V4dGVybmFsRE5TJywge1xuICAgICAgY2x1c3Rlck5hbWU6IGNvbmZpZy5jbHVzdGVyTmFtZSxcbiAgICAgIGVrc0NsdXN0ZXI6IHRoaXMuZWtzQ2x1c3RlcixcbiAgICAgIGRvbWFpbkZpbHRlcjogdGhpcy5jb25maWcuZXh0ZXJuYWxETlMuZG9tYWluRmlsdGVyXG4gICAgfSk7XG5cbiAgICAvLyBGb3IgRUZTIHJlbGF0ZWQgc3RhY2sgLSBjaGVja291dCBlZnMtZWtzLWludGVncmF0aW9uIHN0YWNrXG4gICAgLy8gSW5zdGFsbCBvdGhlciBiaXRzIGxpa2UgUzMgLCBwb3N0Z3JlcyBldGMgd2hpY2ggbmVlZHMgdG8gYmUgYmVmb3JlIHRoZSBjaGFydHMgYXJlIGluc3RhbGxlZFxuICAgIHRoaXMuY3JlYXRlUzNCdWNrZXRzKCk7XG5cbiAgICB0aGlzLmNyZWF0ZVBhcmFtcygpXG5cbiAgICB0aGlzLmluc3RhbGxBcmdvQ0QodGhpcy5la3NDbHVzdGVyKTtcblxuICB9XG5cblxuXG4gIGdldFZQQygpOiBlYzIuSVZwYyB7XG4gICAgY29uc3QgdnBjSWQgPSBzc20uU3RyaW5nUGFyYW1ldGVyLnZhbHVlRnJvbUxvb2t1cCh0aGlzLCAnL2FjY291bnQvdnBjL2lkJyk7XG4gICAgY29uc3QgdnBjID0gZWMyLlZwYy5mcm9tTG9va3VwKHRoaXMsICdWUEMnLCB7IHZwY0lkOiB2cGNJZCB9KTtcblxuICAgIHJldHVybiB2cGM7XG4gIH1cblxuICBjcmVhdGVDbHVzdGVySGFuZGxlclJvbGUoKTogUm9sZSB7XG4gICAgLy8gV2hlbiB0aGlzIGlzIHBhc3NlZCBhcyByb2xlLCBFS1MgY2x1c3RlciBzdWNjZXNzZnVsbHkgY3JlYXRlZChJIHRoaW5rIHRoZXJlIGlzIGEgYnVnIGluIENESykuXG4gICAgY29uc3QgcG9saWN5U3RhdGVtZW50ID0gbmV3IFBvbGljeVN0YXRlbWVudCh7XG4gICAgICBzaWQ6ICdGYWtlUG9saWN5U3RhdGVtZW50JyxcbiAgICAgIGFjdGlvbnM6IFsnbG9nczpQdXRMb2dFdmVudHMnXSxcbiAgICAgIGVmZmVjdDogRWZmZWN0LkFMTE9XLFxuICAgICAgcmVzb3VyY2VzOiBbJyonXSxcbiAgICB9KTtcblxuICAgIGNvbnN0IHBvbGljeURvY3VtZW50ID0gbmV3IFBvbGljeURvY3VtZW50KHtcbiAgICAgIHN0YXRlbWVudHM6IFtwb2xpY3lTdGF0ZW1lbnRdLFxuXG4gICAgfSk7XG5cbiAgICBjb25zdCBjbHVzdGVySGFuZGxlclJvbGUgPSBuZXcgUm9sZSh0aGlzLCBgQ2x1c3RlckhhbmRsZXJSb2xlYCwge1xuICAgICAgcm9sZU5hbWU6IGAke0F3cy5TVEFDS19OQU1FfS1DbHVzdGVySGFuZGxlclJvbGVgLFxuICAgICAgZGVzY3JpcHRpb246IGBSb2xlIGZvciBsYW1iZGEgaGFuZGxlcmAsXG4gICAgICBhc3N1bWVkQnk6IG5ldyBDb21wb3NpdGVQcmluY2lwYWwobmV3IFNlcnZpY2VQcmluY2lwYWwoJ2xhbWJkYS5hbWF6b25hd3MuY29tJykpLFxuICAgICAgaW5saW5lUG9saWNpZXM6IHtcbiAgICAgICAgQWNjZXNzUG9saWN5OiBwb2xpY3lEb2N1bWVudCxcbiAgICAgIH0sXG4gICAgICBtYW5hZ2VkUG9saWNpZXM6IFtcbiAgICAgICAgaWFtLk1hbmFnZWRQb2xpY3kuZnJvbUF3c01hbmFnZWRQb2xpY3lOYW1lKCdBbWF6b25FS1NDbHVzdGVyUG9saWN5JyldXG4gICAgfSk7XG5cbiAgICByZXR1cm4gY2x1c3RlckhhbmRsZXJSb2xlO1xuICB9XG5cbiAgY3JlYXRlRUtTQ2x1c3Rlcih2cGM6IGVjMi5JVnBjLCBjb25maWc6IEVLU1N0YWNrQ29uZmlnLCBjbHVzdGVySGFuZGxlclJvbGU6IGlhbS5Sb2xlKTogZWtzLkNsdXN0ZXIge1xuICAgIC8vIGNvbnN0IHJvbGUgPSBSb2xlLmZyb21Sb2xlQXJuKFxuICAgIC8vICAgdGhpcyxcbiAgICAvLyAgICdBZG1pblJvbGUnLFxuICAgIC8vICAgYGFybjphd3M6aWFtOjoke0F3cy5BQ0NPVU5UX0lEfTpyb2xlLyR7QXdzLlJFR0lPTn0vJHt0aGlzLmNvbmZpZy5hbGxvd0FkbWluUm9sZX1gLFxuICAgIC8vICk7XG5cbiAgICBjb25zdCBjcFNnID0gbmV3IGVjMi5TZWN1cml0eUdyb3VwKHRoaXMsICdDbHVzdGVyQ29udHJvbFBhbmVTZWN1cml0eUdyb3VwJywge1xuICAgICAgdnBjOiB2cGMsXG4gICAgICBkZXNjcmlwdGlvbjogJ1NlY3VyaXR5IGdyb3VwIGZvciBFS1MgY2x1c3RlciBjb250cm9sIHBsYW5lJyxcbiAgICAgIHNlY3VyaXR5R3JvdXBOYW1lOiBgJHtjb25maWcuY2x1c3Rlck5hbWV9LWNvbnRyb2wtcGxhbmUtc2dgLFxuICAgIH0pXG5cbiAgICBpZiAoY29uZmlnLmlzUHJpdmF0ZUNsdXN0ZXIpIHsgLy8gV2UgYWxsb3cgYnkgZGVmYXVsdCBhbGwgdHJhZmZpYyB0byB0aGUgY2x1c3RlciBmcm9tIFByaXZhdGUgc3VibmV0c1xuICAgICAgdnBjLnByaXZhdGVTdWJuZXRzLmZvckVhY2goc3VibmV0ID0+IHtcbiAgICAgICAgY3BTZy5hZGRJbmdyZXNzUnVsZShcbiAgICAgICAgICBlYzIuUGVlci5pcHY0KHN1Ym5ldC5pcHY0Q2lkckJsb2NrKSxcbiAgICAgICAgICBlYzIuUG9ydC5hbGxUY3AoKSxcbiAgICAgICAgICAnQWxsb3cgY29udHJvbCBwbGFuZSB0cmFmZmljIGZyb20gVlBDIChQcml2YXRlKSdcbiAgICAgICAgKVxuICAgICAgfSlcbiAgICB9XG5cbiAgICBjb25zdCBjbHVzdGVyID0gbmV3IGVrcy5DbHVzdGVyKHRoaXMsICdDbHVzdGVyJywge1xuICAgICAgY2x1c3Rlck5hbWU6IGNvbmZpZy5jbHVzdGVyTmFtZSxcbiAgICAgIHZwYzogdnBjLFxuICAgICAgcGxhY2VDbHVzdGVySGFuZGxlckluVnBjOiBjb25maWcucGxhY2VDbHVzdGVySGFuZGxlckluVnBjID8gY29uZmlnLnBsYWNlQ2x1c3RlckhhbmRsZXJJblZwYyA6IGZhbHNlLFxuICAgICAgZGVmYXVsdENhcGFjaXR5OiAwLCAvLyB3ZSB3YW50IHRvIG1hbmFnZSBjYXBhY2l0eSBvdXIgc2VsdmVzXG4gICAgICB2ZXJzaW9uOiBla3MuS3ViZXJuZXRlc1ZlcnNpb24uVjFfMjEsXG4gICAgICB2cGNTdWJuZXRzOiBbeyBzdWJuZXRUeXBlOiBlYzIuU3VibmV0VHlwZS5QUklWQVRFX1dJVEhfTkFUIH1dLFxuICAgICAgc2VjdXJpdHlHcm91cDogY3BTZyxcbiAgICAgIGVuZHBvaW50QWNjZXNzOiBjb25maWcuaXNQcml2YXRlQ2x1c3RlciA/IEVuZHBvaW50QWNjZXNzLlBSSVZBVEUgOiBFbmRwb2ludEFjY2Vzcy5QVUJMSUNfQU5EX1BSSVZBVEUsXG4gICAgICAvLyBtYXN0ZXJzUm9sZTogcm9sZSAvLyBPciBlbHNlIHdlIGFyZSB1bmFibGUgdG8gbG9naW5cbiAgICB9KTtcblxuICAgIHJldHVybiBjbHVzdGVyO1xuICB9XG5cbiAgY3JlYXRlV29ya2VyTm9kZUdyb3VwKGVrc0NsdXN0ZXI6IGVrcy5DbHVzdGVyLCB3b3JrZXJOb2RlUm9sZTogUm9sZSwgdnBjOiBJVnBjKSB7XG4gICAgZWtzQ2x1c3Rlci5hZGROb2RlZ3JvdXBDYXBhY2l0eSh0aGlzLmNvbmZpZy53b3JrZXJHcm91cE5hbWUsIHtcbiAgICAgIGluc3RhbmNlVHlwZXM6IGNvbnZlcnRTdHJpbmdUb0FycmF5KHRoaXMuY29uZmlnLndvcmtlckluc3RhbmNlVHlwZXMpLm1hcChcbiAgICAgICAgKGluc3RhbmNlVHlwZSkgPT4gbmV3IGVjMi5JbnN0YW5jZVR5cGUoaW5zdGFuY2VUeXBlKSxcbiAgICAgICksXG4gICAgICBub2RlZ3JvdXBOYW1lOiB0aGlzLmNvbmZpZy53b3JrZXJHcm91cE5hbWUsXG4gICAgICBub2RlUm9sZTogd29ya2VyTm9kZVJvbGUsXG4gICAgICBjYXBhY2l0eVR5cGU6IHRoaXMuY29uZmlnLndvcmtlckNhcGFjaXR5VHlwZSA9PT0gJ1NQT1QnID8gQ2FwYWNpdHlUeXBlLlNQT1QgOiBDYXBhY2l0eVR5cGUuT05fREVNQU5ELFxuICAgICAgc3VibmV0czogdnBjLnNlbGVjdFN1Ym5ldHMoeyBzdWJuZXRUeXBlOiBlYzIuU3VibmV0VHlwZS5QUklWQVRFX1dJVEhfTkFUIH0pLFxuICAgICAgZGVzaXJlZFNpemU6IE51bWJlcih0aGlzLmNvbmZpZy53b3JrZXJEZXNpcmVkU2l6ZSksXG4gICAgICBtaW5TaXplOiBOdW1iZXIodGhpcy5jb25maWcud29ya2VyTWluU2l6ZSksXG4gICAgICBtYXhTaXplOiBOdW1iZXIodGhpcy5jb25maWcud29ya2VyTWF4U2l6ZSksXG4gICAgfSk7XG4gIH1cblxuICAvLyBXaGVuIHVzaW5nIGZhcmdhdGUgZm9yIGZpcnN0IHRpbWUgeW91IG1heSBoYXZlIHRvIGNyZWF0ZSB0aGUgc2VydmljZSBsaW5rZWQgcm9sZVxuICAvLyBhd3MgaWFtIGNyZWF0ZS1zZXJ2aWNlLWxpbmtlZC1yb2xlIFxcXG4gIC8vIC0tYXdzLXNlcnZpY2UtbmFtZSBla3MtZmFyZ2F0ZS5hbWF6b25hd3MuY29tIFxcXG4gIC8vIC0tZGVzY3JpcHRpb24gXCJTZXJ2aWNlLWxpbmtlZCByb2xlIHRvIHN1cHBvcnQgZmFyZ2F0ZVwiXG5cbiAgY3JlYXRlRmFyZ2F0ZVByb2ZpbGVzKGNsdXN0ZXI6IGVrcy5DbHVzdGVyLCB2cGM6IElWcGMsIG5zOiBla3MuS3ViZXJuZXRlc01hbmlmZXN0W10pOiBla3MuRmFyZ2F0ZVByb2ZpbGVbXSB7XG5cbiAgICBjb25zdCBwb2xpY3kgPSB0aGlzLmNyZWF0ZUVLU0ZhcmdhdGVDbG91ZHdhdGNoUG9saWN5KClcblxuICAgIHZhciBwcm9maWxlczogZWtzLkZhcmdhdGVQcm9maWxlW10gPSBbXTtcbiAgICB0aGlzLmNvbmZpZy5mYXJnYXRlUHJvZmlsZXM/LmZvckVhY2goKHByb2ZpbGUpID0+IHtcblxuICAgICAgY29uc3QgcCA9IG5ldyBla3MuRmFyZ2F0ZVByb2ZpbGUodGhpcywgcHJvZmlsZS5uYW1lLCB7XG4gICAgICAgIGNsdXN0ZXIsXG4gICAgICAgIHNlbGVjdG9yczogcHJvZmlsZS5zZWxlY3RvcnMsXG4gICAgICAgIHZwYzogdnBjLFxuICAgICAgICBzdWJuZXRTZWxlY3Rpb246IHZwYy5zZWxlY3RTdWJuZXRzKHsgc3VibmV0VHlwZTogZWMyLlN1Ym5ldFR5cGUuUFJJVkFURV9XSVRIX05BVCB9KSxcbiAgICAgIH0pO1xuICAgICAgLy8gdGhpcyBpcyByZXF1aXJlZCBmb3IgbG9nZ2luZ1xuICAgICAgcC5wb2RFeGVjdXRpb25Sb2xlLmF0dGFjaElubGluZVBvbGljeShwb2xpY3kpXG5cbiAgICAgIHByb2ZpbGVzLnB1c2gocCk7XG5cbiAgICB9KTtcblxuICAgIC8vIEVuYWJsZSBhdXRvbWF0aWMgY2xvdWR3d2F0Y2ggbG9nZ2luZyBmb3IgdGhlIHNhbWUuIFRoaXMgcmVxdWlyZXMgYSBuYW1lc3BhY2UgYW5kIGEgY29uZmlnIG1hcFxuXG4gICAgY29uc3QgbmFtZXNwYWNlID0gY2x1c3Rlci5hZGRNYW5pZmVzdCgnYXdzLW9ic2VydmFiaWxpdHknLCB7XG4gICAgICBhcGlWZXJzaW9uOiAndjEnLFxuICAgICAga2luZDogJ05hbWVzcGFjZScsXG4gICAgICBtZXRhZGF0YTogeyBuYW1lOiAnYXdzLW9ic2VydmFiaWxpdHknLCBsYWJlbHM6IHsgJ2F3cy1vYnNlcnZhYmlsaXR5JzogJ2VuYWJsZWQnIH0gfSxcbiAgICB9KTtcblxuICAgIC8vIHlhbWxcbiAgICBsZXQgZGF0YVJlc3VsdDogUmVjb3JkPHN0cmluZywgb2JqZWN0PltdID0gW107XG4gICAgdHJ5IHtcblxuICAgICAgY29uc3QgcGF0aCA9IHJlcXVpcmUoJ3BhdGgnKTtcblxuICAgICAgbGV0IHZhbHVlc1lhbWwgPSBmcy5yZWFkRmlsZVN5bmMocGF0aC5qb2luKF9fZGlybmFtZSwgYC4vbWFuaWZlc3RzL2ZhcmdhdGUtY2xvdWR3YXRjaC1sb2dnaW5nLnlhbWxgKSk7XG4gICAgICAvLyBSZXBsYWNlIERvbWFpbiBhbmQgbG9hZCBZQU1MXG4gICAgICBsZXQgdmFsdWVzUGFyc2VkID0geWFtbC5sb2FkQWxsKHZhbHVlc1lhbWwudG9TdHJpbmcoKVxuICAgICAgICAucmVwbGFjZShuZXcgUmVnRXhwKCd7QVdTX1JFR0lPTn0nLCAnZ2knKSwgQXdzLlJFR0lPTilcbiAgICAgICAgLnJlcGxhY2UobmV3IFJlZ0V4cCgne0NMVVNURVJfTkFNRX0nLCAnZ2knKSwgY2x1c3Rlci5jbHVzdGVyTmFtZSlcbiAgICAgICk7XG4gICAgICBpZiAodHlwZW9mIHZhbHVlc1BhcnNlZCA9PT0gJ29iamVjdCcgJiYgdmFsdWVzUGFyc2VkICE9PSBudWxsKSB7XG4gICAgICAgIGRhdGFSZXN1bHQgPSB2YWx1ZXNQYXJzZWQgYXMgUmVjb3JkPHN0cmluZywgb2JqZWN0PltdO1xuICAgICAgfVxuICAgIH0gY2F0Y2ggKGV4Y2VwdGlvbikge1xuICAgICAgY29uc29sZS5lcnJvcihcIiA+IEZhaWxlZCB0byBsb2FkICdmYXJnYXRlLWNsb3Vkd2F0Y2gtbG9nZ2luZy55YW1sJyBmb3IgJ0VLUyBDbHVzdGVyJyBkZXBsb3kuLi5cIik7XG4gICAgICBjb25zb2xlLmVycm9yKGV4Y2VwdGlvbik7XG4gICAgICBleGl0XG4gICAgfVxuXG4gICAgZGF0YVJlc3VsdC5mb3JFYWNoKGZ1bmN0aW9uICh2YWwsIGlkeCkge1xuICAgICAgY29uc3QgYSA9IGNsdXN0ZXIuYWRkTWFuaWZlc3QoJ2ZhcmdhdGUtY2xvdWR3YXRjaC1sb2dnaW5nLScgKyBpZHgsIHZhbCk7XG4gICAgICBhLm5vZGUuYWRkRGVwZW5kZW5jeShuYW1lc3BhY2UpXG4gICAgfSk7XG5cbiAgICByZXR1cm4gcHJvZmlsZXM7XG4gIH1cblxuICBjcmVhdGVFS1NGYXJnYXRlQ2xvdWR3YXRjaFBvbGljeSgpOiBQb2xpY3kge1xuICAgIC8vIGVhY2ggcG9kIGV4ZWN1dGlvbiByb2xlIG5lZWRzIHRvIGhhdmUgdGhlIHBvbGljeVxuICAgIGNvbnN0IGlhbVBvbGljeURvY3VtZW50ID0gSlNPTi5wYXJzZShge1xuICAgICAgXCJWZXJzaW9uXCI6IFwiMjAxMi0xMC0xN1wiLFxuICAgICAgXCJTdGF0ZW1lbnRcIjogW3tcbiAgICAgICAgXCJFZmZlY3RcIjogXCJBbGxvd1wiLFxuICAgICAgICBcIkFjdGlvblwiOiBbXG4gICAgICAgICAgXCJsb2dzOkNyZWF0ZUxvZ1N0cmVhbVwiLFxuICAgICAgICAgIFwibG9nczpDcmVhdGVMb2dHcm91cFwiLFxuICAgICAgICAgIFwibG9nczpEZXNjcmliZUxvZ1N0cmVhbXNcIixcbiAgICAgICAgICBcImxvZ3M6UHV0TG9nRXZlbnRzXCJcbiAgICAgICAgXSxcbiAgICAgICAgXCJSZXNvdXJjZVwiOiBcIipcIlxuICAgICAgfV1cbiAgICB9YClcblxuICAgIC8vIENyZWF0ZSBJQU0gUG9saWN5XG4gICAgY29uc3QgaWFtUG9saWN5ID0gbmV3IFBvbGljeSh0aGlzLCAnRUtTRmFyZ2F0ZUxvZ2dpbmdQb2xpY3knLCB7XG4gICAgICBwb2xpY3lOYW1lOiAnRUtTRmFyZ2F0ZUxvZ2dpbmdQb2xpY3knLFxuICAgICAgZG9jdW1lbnQ6IFBvbGljeURvY3VtZW50LmZyb21Kc29uKGlhbVBvbGljeURvY3VtZW50KSxcbiAgICB9KTtcblxuICAgIHJldHVybiBpYW1Qb2xpY3lcbiAgfVxuXG4gIGNyZWF0ZU5hbWVzcGFjZXMoc2VsZWN0b3JzOiBTZWxlY3RvcltdLCBjbHVzdGVyOiBla3MuQ2x1c3Rlcik6IGVrcy5LdWJlcm5ldGVzTWFuaWZlc3RbXSB7XG4gICAgLy8gQ3JlYXRlcyBuYW1lc3BhY2UgIGZvciBmYXJnYXRlIHByb2ZpbGVzXG5cbiAgICB2YXIgbnM6IGVrcy5LdWJlcm5ldGVzTWFuaWZlc3RbXSA9IFtdO1xuXG4gICAgc2VsZWN0b3JzLmZvckVhY2goKHNlbGVjdG9yKSA9PiB7XG4gICAgICBjb25zdCBuYW1lc3BhY2UgPSB7XG4gICAgICAgIGFwaVZlcnNpb246ICd2MScsXG4gICAgICAgIGtpbmQ6ICdOYW1lc3BhY2UnLFxuICAgICAgICBtZXRhZGF0YTogeyBuYW1lOiBzZWxlY3Rvci5uYW1lc3BhY2UgfSxcbiAgICAgIH07XG5cbiAgICAgIG5zLnB1c2goXG4gICAgICAgIG5ldyBla3MuS3ViZXJuZXRlc01hbmlmZXN0KHRoaXMsIGAke3NlbGVjdG9yLm5hbWVzcGFjZX1OU2AsIHtcbiAgICAgICAgICBjbHVzdGVyLFxuICAgICAgICAgIG1hbmlmZXN0OiBbbmFtZXNwYWNlXSxcbiAgICAgICAgfSksXG4gICAgICApO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIG5zO1xuICB9XG5cbiAgY3JlYXRlUzNCdWNrZXRzKCk6IHZvaWQge1xuICAgIHRoaXMuY29uZmlnLnMzQnVja2V0cz8uZm9yRWFjaChidWNrZXQgPT4ge1xuICAgICAgaWYgKGJ1Y2tldC5pc1ByaXZhdGVXaXRoQ29ycykge1xuICAgICAgICBjb25zdCBiID0gbmV3IEJ1Y2tldCh0aGlzLCBidWNrZXQubmFtZSwge1xuICAgICAgICAgIGJ1Y2tldE5hbWU6IGJ1Y2tldC5uYW1lLFxuICAgICAgICAgIGVuY3J5cHRpb246IEJ1Y2tldEVuY3J5cHRpb24uUzNfTUFOQUdFRCxcbiAgICAgICAgICBlbmZvcmNlU1NMOiB0cnVlLFxuICAgICAgICAgIHB1YmxpY1JlYWRBY2Nlc3M6IGZhbHNlLFxuICAgICAgICAgIGJsb2NrUHVibGljQWNjZXNzOiBCbG9ja1B1YmxpY0FjY2Vzcy5CTE9DS19BTEwsXG4gICAgICAgICAgY29yczogYnVja2V0LmNvcnMsXG4gICAgICAgICAgdmVyc2lvbmVkOiB0cnVlLFxuICAgICAgICAgIHJlbW92YWxQb2xpY3k6IFJlbW92YWxQb2xpY3kuREVTVFJPWSxcbiAgICAgICAgfSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb25zdCBiID0gbmV3IEJ1Y2tldCh0aGlzLCBidWNrZXQubmFtZSwge1xuICAgICAgICAgIGJ1Y2tldE5hbWU6IGJ1Y2tldC5uYW1lLFxuICAgICAgICAgIGVuY3J5cHRpb246IEJ1Y2tldEVuY3J5cHRpb24uUzNfTUFOQUdFRCxcbiAgICAgICAgICBlbmZvcmNlU1NMOiB0cnVlLFxuICAgICAgICAgIHB1YmxpY1JlYWRBY2Nlc3M6IGZhbHNlLFxuICAgICAgICAgIGJsb2NrUHVibGljQWNjZXNzOiBCbG9ja1B1YmxpY0FjY2Vzcy5CTE9DS19BTEwsXG4gICAgICAgICAgdmVyc2lvbmVkOiB0cnVlLFxuICAgICAgICAgIHJlbW92YWxQb2xpY3k6IFJlbW92YWxQb2xpY3kuREVTVFJPWSxcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICBjcmVhdGVQYXJhbXMoKSB7XG4gICAgLy8gRXhwb3J0IGZldyBwYXJhbWV0ZXJzIGZvciBhcHBsaWNhdGlvbiB1c2FnZVxuICAgIG5ldyBTdHJpbmdQYXJhbWV0ZXIoXG4gICAgICB0aGlzLCBcIkVLU0NsdXN0ZXJIYW5kbGVyUm9sZVwiLFxuICAgICAge1xuICAgICAgICBwYXJhbWV0ZXJOYW1lOiBgL2FjY291bnQvc3RhY2tzLyR7dGhpcy5zdGFja05hbWV9L2t1YmVjdGwtcm9sZWAsXG4gICAgICAgIHN0cmluZ1ZhbHVlOiB0aGlzLmVrc0NsdXN0ZXIua3ViZWN0bFJvbGUhLnJvbGVBcm4sXG4gICAgICAgIGRlc2NyaXB0aW9uOiBcIkt1YmVjdGwgUm9sZSBmb3Igc3RhY2sgb3BlcmF0aW9uc1wiXG4gICAgICB9XG4gICAgKTtcblxuICB9XG5cbiAgaW5zdGFsbEFyZ29DRChjbHVzdGVyOiBla3MuQ2x1c3Rlcikge1xuICAgIC8vIGh0dHBzOi8vcmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbS9hcmdvcHJvai9hcmdvLWNkL3YyLjQuNy9tYW5pZmVzdHMvaW5zdGFsbC55YW1sXG4gICAgaWYgKHRoaXMuY29uZmlnLmluc3RhbGxBcmdvQ0QpIHtcbiAgICAgIG5ldyBBcmdvQ0QodGhpcywgJ0FyZ29DRCcsIHtcbiAgICAgICAgY2x1c3Rlck5hbWU6IHRoaXMuY29uZmlnLmNsdXN0ZXJOYW1lLFxuICAgICAgICBla3NDbHVzdGVyOiB0aGlzLmVrc0NsdXN0ZXIsXG4gICAgICB9KTtcbiAgICB9XG4gIH1cbn1cbiJdfQ==
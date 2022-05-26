"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
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
    if (mod != null) for (var k in mod) if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWtzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZWtzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSwyQ0FBNEM7QUFDNUMsMkNBQTRDO0FBQzVDLDJDQUE0QztBQUM1QywyQ0FBNEM7QUFDNUMsbUNBQW9DO0FBQ3BDLDZDQUFpRDtBQUVqRCxpREFBZ0Y7QUFDaEYsaURBUTZCO0FBRzdCLDRDQUF1RDtBQUN2RCxvQ0FBNEM7QUFDNUMsaUVBQXFFO0FBQ3JFLHFGQUF5RjtBQUN6RixtRUFBa0U7QUFDbEUsaURBQW1EO0FBRW5ELCtDQUFpRjtBQUNqRix5RUFBNkU7QUFFN0UsdUNBQXlCO0FBQ3pCLDhDQUFnQztBQUNoQyxxQ0FBK0I7QUFHL0IsTUFBYSxVQUFXLFNBQVEsR0FBRyxDQUFDLEtBQUs7SUFJdkMsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxNQUFzQixFQUFFLEtBQXNCO1FBQ3RGLEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQ3hCLElBQUksQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFDO1FBRXJCLE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztRQUUxQixNQUFNLGtCQUFrQixHQUFHLElBQUksQ0FBQyx3QkFBd0IsRUFBRSxDQUFDO1FBRTNELG9DQUFvQztRQUNwQyxNQUFNLFVBQVUsR0FBRyxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLGVBQWUsRUFBRTtZQUNyRCxTQUFTLEVBQUUsSUFBSSxHQUFHLENBQUMsZ0JBQWdCLENBQUMsbUJBQW1CLENBQUM7WUFDeEQsZUFBZSxFQUFFO2dCQUNmLEdBQUcsQ0FBQyxhQUFhLENBQUMsd0JBQXdCLENBQUMsMkJBQTJCLENBQUM7Z0JBQ3ZFLEdBQUcsQ0FBQyxhQUFhLENBQUMsd0JBQXdCLENBQUMsb0NBQW9DLENBQUM7Z0JBQ2hGLEdBQUcsQ0FBQyxhQUFhLENB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LENBQUMsSUFBSTtvQkFDdkIsVUFBVSxFQUFFLHlCQUFnQixDQUFDLFVBQVU7b0JBQ3ZDLFVBQVUsRUFBRSxJQUFJO29CQUNoQixnQkFBZ0IsRUFBRSxLQUFLO29CQUN2QixpQkFBaUIsRUFBRSwwQkFBaUIsQ0FBQyxTQUFTO29CQUM5QyxTQUFTLEVBQUUsSUFBSTtvQkFDZixhQUFhLEVBQUUsMkJBQWEsQ0FBQyxPQUFPO2lCQUNyQyxDQUFDLENBQUM7YUFDSjtRQUNILENBQUMsRUFBRTtJQUNMLENBQUM7Q0FDRjtBQXJURCxnQ0FxVEMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgaWFtID0gcmVxdWlyZSgnYXdzLWNkay1saWIvYXdzLWlhbScpO1xuaW1wb3J0IGVjMiA9IHJlcXVpcmUoJ2F3cy1jZGstbGliL2F3cy1lYzInKTtcbmltcG9ydCBla3MgPSByZXF1aXJlKCdhd3MtY2RrLWxpYi9hd3MtZWtzJyk7XG5pbXBvcnQgc3NtID0gcmVxdWlyZSgnYXdzLWNkay1saWIvYXdzLXNzbScpO1xuaW1wb3J0IGNkayA9IHJlcXVpcmUoJ2F3cy1jZGstbGliJyk7XG5pbXBvcnQgeyBBd3MsIFJlbW92YWxQb2xpY3kgfSBmcm9tICdhd3MtY2RrLWxpYic7XG5pbXBvcnQgeyBJVnBjIH0gZnJvbSAnYXdzLWNkay1saWIvYXdzLWVjMic7XG5pbXBvcnQgeyBDYXBhY2l0eVR5cGUsIENsdXN0ZXIsIEt1YmVybmV0ZXNNYW5pZmVzdCB9IGZyb20gJ2F3cy1jZGstbGliL2F3cy1la3MnO1xuaW1wb3J0IHtcbiAgQ29tcG9zaXRlUHJpbmNpcGFsLFxuICBFZmZlY3QsXG4gIFBvbGljeSxcbiAgUG9saWN5RG9jdW1lbnQsXG4gIFBvbGljeVN0YXRlbWVudCxcbiAgUm9sZSxcbiAgU2VydmljZVByaW5jaXBhbCxcbn0gZnJvbSAnYXdzLWNkay1saWIvYXdzLWlhbSc7XG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tICdjb25zdHJ1Y3RzJztcbmltcG9ydCB7IEVLU1N0YWNrQ29uZmlnIH0gZnJvbSAnLi4vLi4vaW50ZXJmYWNlcy9saWIvZWtzL2ludGVyZmFjZXMnO1xuaW1wb3J0IHsgY29udmVydFN0cmluZ1RvQXJyYXkgfSBmcm9tICcuLi91dGlscy9jb21tb24nO1xuaW1wb3J0IHsgRUZTTmVzdGVkU3RhY2sgfSBmcm9tICcuLi9lZnMvZWZzJztcbmltcG9ydCB7IEF3c0VGU0NTSURyaXZlck5lc3RlZCB9IGZyb20gJy4vY29udHJvbGxlcnMvZWZzLWNzaS1kcml2ZXInO1xuaW1wb3J0IHsgQXdzTG9hZEJhbGFuY2VyQ29udHJvbGxlck5lc3RlZCB9IGZyb20gJy4vY29udHJvbGxlcnMvbG9hZC1iYWxhbmNlci1jb250cm9sbGVyJztcbmltcG9ydCB7IENsb3Vkd2F0Y2hMb2dnaW5nTmVzdGVkIH0gZnJvbSAnLi9jdy1sb2dnaW5nLW1vbml0b3JpbmcnO1xuaW1wb3J0IHsgRXh0ZXJuYWxETlNOZXN0ZWQgfSBmcm9tICcuL2V4dGVybmFsLWRucyc7XG5pbXBvcnQgeyBTZWxlY3RvciB9IGZyb20gJ2F3cy1jZGstbGliL2F3cy1la3MnO1xuaW1wb3J0IHsgQmxvY2tQdWJsaWNBY2Nlc3MsIEJ1Y2tldCwgQnVja2V0RW5jcnlwdGlvbiB9IGZyb20gJ2F3cy1jZGstbGliL2F3cy1zMyc7XG5pbXBvcnQgeyBBd3NTZWNyZXRzQ1NJRHJpdmVyTmVzdGVkIH0gZnJvbSAnLi9jb250cm9sbGVycy9zZWNyZXRzLWNzaS1kcml2ZXInO1xuXG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcyc7XG5pbXBvcnQgKiBhcyB5YW1sIGZyb20gJ2pzLXlhbWwnO1xuaW1wb3J0IHsgZXhpdCB9IGZyb20gJ3Byb2Nlc3MnO1xuXG5cbmV4cG9ydCBjbGFzcyBFS1NDbHVzdGVyIGV4dGVuZHMgY2RrLlN0YWNrIHtcbiAgY29uZmlnOiBFS1NTdGFja0NvbmZpZztcbiAgZWtzQ2x1c3RlcjogQ2x1c3RlcjtcblxuICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nLCBjb25maWc6IEVLU1N0YWNrQ29uZmlnLCBwcm9wcz86IGNkay5TdGFja1Byb3BzKSB7XG4gICAgc3VwZXIoc2NvcGUsIGlkLCBwcm9wcyk7XG4gICAgdGhpcy5jb25maWcgPSBjb25maWc7XG5cbiAgICBjb25zdCB2cGMgPSB0aGlzLmdldFZQQygpO1xuXG4gICAgY29uc3QgY2x1c3RlckhhbmRsZXJSb2xlID0gdGhpcy5jcmVhdGVDbHVzdGVySGFuZGxlclJvbGUoKTtcblxuICAgIC8vIElBTSByb2xlIGZvciBvdXIgRUMyIHdvcmtlciBub2Rlc1xuICAgIGNvbnN0IHdvcmtlclJvbGUgPSBuZXcgaWFtLlJvbGUodGhpcywgJ0VLU1dvcmtlclJvbGUnLCB7XG4gICAgICBhc3N1bWVkQnk6IG5ldyBpYW0uU2VydmljZVByaW5jaXBhbCgnZWMyLmFtYXpvbmF3cy5jb20nKSxcbiAgICAgIG1hbmFnZWRQb2xpY2llczogW1xuICAgICAgICBpYW0uTWFuYWdlZFBvbGljeS5mcm9tQXdzTWFuYWdlZFBvbGljeU5hbWUoJ0FtYXpvbkVLU1dvcmtlck5vZGVQb2xpY3knKSxcbiAgICAgICAgaWFtLk1hbmFnZWRQb2xpY3kuZnJvbUF3c01hbmFnZWRQb2xpY3lOYW1lKCdBbWF6b25FQzJDb250YWluZXJSZWdpc3RyeVJlYWRPbmx5JyksXG4gICAgICAgIGlhbS5NYW5hZ2VkUG9saWN5LmZyb21Bd3NNYW5hZ2VkUG9saWN5TmFtZSgnQW1hem9uRUtTX0NOSV9Qb2xpY3knKSxcbiAgICAgICAgaWFtLk1hbmFnZWRQb2xpY3kuZnJvbUF3c01hbmFnZWRQb2xpY3lOYW1lKCdDbG91ZFdhdGNoQWdlbnRTZXJ2ZXJQb2xpY3knKSxcbiAgICAgIF0sXG4gICAgfSk7XG5cbiAgICB0aGlzLmVrc0NsdXN0ZXIgPSB0aGlzLmNyZWF0ZUVLU0NsdXN0ZXIodnBjLCBjb25maWcsIGNsdXN0ZXJIYW5kbGVyUm9sZSk7XG5cbiAgICBpZiAodGhpcy5jb25maWcuYWxsb3dBZG1pblJvbGUpIHtcbiAgICAgIGNvbnN0IHJvbGUgPSBSb2xlLmZyb21Sb2xlQXJuKFxuICAgICAgICB0aGlzLFxuICAgICAgICAnQWRtaW5Sb2xlQXV0aCcsXG4gICAgICAgIGBhcm46YXdzOmlhbTo6JHtBd3MuQUNDT1VOVF9JRH06cm9sZS8ke3RoaXMuY29uZmlnLmFsbG93QWRtaW5Sb2xlfWAsXG4gICAgICApO1xuXG4gICAgICB0aGlzLmVrc0NsdXN0ZXIuYXdzQXV0aC5hZGRSb2xlTWFwcGluZyhyb2xlLCB7XG4gICAgICAgIGdyb3VwczogWydzeXN0ZW06bWFzdGVycyddLFxuICAgICAgICB1c2VybmFtZTogJ2FkbWluJyxcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIC8vIFdlIHdhbnQgdG8gY3JlYXRlIG5hbWVzcGFjZXMgZmlyc3QsIHNvIHRoZSBkZXBlbmRlbmNpZXMgYXJlIHJlc29sdmVkIGJldHdlZW4gU0EgYW5kIGNoYXJ0IGluc3RhbGxhdGlvbi5cbiAgICAvLyBEbyBpdCBzb29uZXIgYXMgdGhlcmUgaXMgYSBzbWFsbCBkZWxheSBiZXR3ZWVuIGNyZWF0aW9uIG9mIG5hbWVzcGFjZSBhbmQgY3JlYXRpb24gb2Ygc2VydmljZSBhY2NvdW50XG4gICAgdmFyIG5zOiBla3MuS3ViZXJuZXRlc01hbmlmZXN0W10gPSBbXTtcbiAgICBpZiAodGhpcy5jb25maWcubmFtZXNwYWNlcykge1xuICAgICAgbnMgPSB0aGlzLmNyZWF0ZU5hbWVzcGFjZXModGhpcy5jb25maWcubmFtZXNwYWNlcywgdGhpcy5la3NDbHVzdGVyKTtcbiAgICB9XG4gICAgLy8gV2UgY3JlYXRlIHByb2ZpbGVzIG9uY2UgYWxsIG5hbWVzcGFjZXMgYXJlIGNyZWF0ZWQuXG4gICAgdmFyIHByb2ZpbGVzOiBla3MuRmFyZ2F0ZVByb2ZpbGVbXSA9IFtdO1xuXG4gICAgcHJvZmlsZXMgPSB0aGlzLmNyZWF0ZUZhcmdhdGVQcm9maWxlcyh0aGlzLmVrc0NsdXN0ZXIsIHZwYywgbnMpO1xuICAgIHRoaXMuY3JlYXRlV29ya2VyTm9kZUdyb3VwKHRoaXMuZWtzQ2x1c3Rlciwgd29ya2VyUm9sZSwgdnBjKTtcblxuXG4gICAgLy8gRW5hYmxlIGNsdXN0ZXIgbG9nZ2luZyBhbmQgTW9uaXRvcmluZ1xuICAgIG5ldyBDbG91ZHdhdGNoTG9nZ2luZ05lc3RlZCh0aGlzLCAnQ2xvdWRXYXRjaExvZ2dpbmdOZXN0ZWQnLCB0aGlzLmVrc0NsdXN0ZXIpO1xuXG4gICAgLy8gRXh0ZXJhbmwgRE5TIHJlbGF0ZWQgc3RhY2tcbiAgICAvLyBuZXcgUHJvbWV0aGV1c1N0YWNrKHRoaXMsICdQcm9tZXRoZXVzU3RhY2snLCBla3NDbHVzdGVyKVxuXG4gICAgbmV3IEF3c0xvYWRCYWxhbmNlckNvbnRyb2xsZXJOZXN0ZWQodGhpcywgJ0F3c0xvYWRCYWxhbmNlckNvbnRyb2xsZXInLCB0aGlzLmVrc0NsdXN0ZXIpO1xuICAgIG5ldyBBd3NFRlNDU0lEcml2ZXJOZXN0ZWQodGhpcywgJ0F3c0VGU0NTSURyaXZlck5lc3RlZCcsIHRoaXMuZWtzQ2x1c3Rlcik7XG4gICAgbmV3IEF3c1NlY3JldHNDU0lEcml2ZXJOZXN0ZWQodGhpcywgJ0F3c1NlY3JldHNDU0lEcml2ZXJOZXN0ZWQnLCB0aGlzLmVrc0NsdXN0ZXIpO1xuICAgIG5ldyBFeHRlcm5hbEROU05lc3RlZCh0aGlzLCAnRXh0ZXJuYWxETlMnLCB0aGlzLmVrc0NsdXN0ZXIsIHRoaXMuY29uZmlnLmV4dGVybmFsRE5TKTtcblxuICAgIC8vIENyZWF0ZSBFRlMgYXMgbmVzdGVkIHJlc291cmNlIC0tICoqKiBUaGlzIHdpbGwgYWxzbyBkZXBsb3kgU3RvcmFnZWNsYXNzIHRvIHRoZSBjbHVzdGVyXG4gICAgY29uc3QgcyA9IG5ldyBFRlNOZXN0ZWRTdGFjayhcbiAgICAgIHRoaXMsXG4gICAgICAnRUZTTmVzdGVkU3RhY2snLFxuICAgICAgdGhpcy5jb25maWcuY2x1c3Rlck5hbWUsXG4gICAgICB0aGlzLmNvbmZpZy5lZnMsXG4gICAgICB2cGMsXG4gICAgICB0aGlzLmVrc0NsdXN0ZXIuY2x1c3RlclNlY3VyaXR5R3JvdXBJZCxcbiAgICApO1xuICAgIC8vIFNvbWV0aW1lcyBla3MgY29tcGxldGlvbiBoYXBwZW5zIHNvb25lci4gVG8gZW5zdXJlIGV2ZXJ5dGhpbmcgaXMgZmluaXNoZWQgYmVmb3JlIG5leHQgaXRlbSBpcyBleGVjdXRlZFxuICAgIG5zLm1hcChuID0+IHMubm9kZS5hZGREZXBlbmRlbmN5KG4pKVxuXG4gICAgLy8gV2UgY3JlYXRlIHRoaXMgYXMgYSBzdG9yYWdlIGNsYXNzXG4gICAgY29uc3Qgc2MgPSB0aGlzLmNyZWF0ZVN0b3JhZ2VDbGFzcyhzLmVmcy5maWxlU3lzdGVtSWQpO1xuXG4gICAgLy8gSW5zdGFsbCBvdGhlciBiaXRzIGxpa2UgUzMgLCBwb3N0Z3JlcyBldGMgd2hpY2ggbmVlZHMgdG8gYmUgYmVmb3JlIHRoZSBjaGFydHMgYXJlIGluc3RhbGxlZFxuICAgIHRoaXMuY3JlYXRlUzNCdWNrZXRzKCk7XG5cbiAgfVxuXG4gIGNyZWF0ZVN0b3JhZ2VDbGFzcyhmc0lEOiBzdHJpbmcpOiBLdWJlcm5ldGVzTWFuaWZlc3Qge1xuICAgIGNvbnN0IHNjID0gdGhpcy5la3NDbHVzdGVyLmFkZE1hbmlmZXN0KCdFRlNTQycsIHtcbiAgICAgIGFwaVZlcnNpb246ICdzdG9yYWdlLms4cy5pby92MScsXG4gICAgICBraW5kOiAnU3RvcmFnZUNsYXNzJyxcbiAgICAgIG1ldGFkYXRhOiB7XG4gICAgICAgIG5hbWU6ICdlZnMtc2MnLFxuICAgICAgfSxcbiAgICAgIHByb3Zpc2lvbmVyOiAnZWZzLmNzaS5hd3MuY29tJyxcbiAgICAgIHBhcmFtZXRlcnM6IHtcbiAgICAgICAgcHJvdmlzaW9uaW5nTW9kZTogJ2Vmcy1hcCcsXG4gICAgICAgIGZpbGVTeXN0ZW1JZDogZnNJRCxcbiAgICAgICAgZGlyZWN0b3J5UGVybXM6ICcwNzAwJyxcbiAgICAgIH0sXG4gICAgfSk7XG5cbiAgICByZXR1cm4gc2NcbiAgfVxuXG4gIGdldFZQQygpOiBlYzIuSVZwYyB7XG4gICAgY29uc3QgdnBjSWQgPSBzc20uU3RyaW5nUGFyYW1ldGVyLnZhbHVlRnJvbUxvb2t1cCh0aGlzLCAnL2FjY291bnQvdnBjL2lkJyk7XG4gICAgY29uc3QgdnBjID0gZWMyLlZwYy5mcm9tTG9va3VwKHRoaXMsICdWUEMnLCB7IHZwY0lkOiB2cGNJZCB9KTtcblxuICAgIHJldHVybiB2cGM7XG4gIH1cblxuICBjcmVhdGVDbHVzdGVySGFuZGxlclJvbGUoKTogUm9sZSB7XG4gICAgLy8gV2hlbiB0aGlzIGlzIHBhc3NlZCBhcyByb2xlLCBFS1MgY2x1c3RlciBzdWNjZXNzZnVsbHkgY3JlYXRlZChJIHRoaW5rIHRoZXJlIGlzIGEgYnVnIGluIENESykuXG4gICAgY29uc3QgcG9saWN5U3RhdGVtZW50ID0gbmV3IFBvbGljeVN0YXRlbWVudCh7XG4gICAgICBzaWQ6ICdGYWtlUG9sY2lTdGF0ZW1lbnQnLFxuICAgICAgYWN0aW9uczogWydsb2dzOlB1dExvZ0V2ZW50cyddLFxuICAgICAgZWZmZWN0OiBFZmZlY3QuQUxMT1csXG4gICAgICByZXNvdXJjZXM6IFsnKiddLFxuICAgIH0pO1xuXG4gICAgY29uc3QgcG9saWN5RG9jdW1lbnQgPSBuZXcgUG9saWN5RG9jdW1lbnQoe1xuICAgICAgc3RhdGVtZW50czogW3BvbGljeVN0YXRlbWVudF0sXG4gICAgfSk7XG5cbiAgICBjb25zdCBjbHVzdGVySGFuZGxlclJvbGUgPSBuZXcgUm9sZSh0aGlzLCBgQ2x1c3RlckhhbmRsZXJSb2xlYCwge1xuICAgICAgcm9sZU5hbWU6IGAke0F3cy5TVEFDS19OQU1FfS1DbHVzdGVySGFuZGxlclJvbGVgLFxuICAgICAgZGVzY3JpcHRpb246IGBSb2xlIGZvciBsYW1iZGEgaGFuZGxlcmAsXG4gICAgICBhc3N1bWVkQnk6IG5ldyBDb21wb3NpdGVQcmluY2lwYWwobmV3IFNlcnZpY2VQcmluY2lwYWwoJ2xhbWJkYS5hbWF6b25hd3MuY29tJykpLFxuICAgICAgaW5saW5lUG9saWNpZXM6IHtcbiAgICAgICAgQWNjZXNzUG9saWN5OiBwb2xpY3lEb2N1bWVudCxcbiAgICAgIH0sXG4gICAgfSk7XG5cbiAgICByZXR1cm4gY2x1c3RlckhhbmRsZXJSb2xlO1xuICB9XG5cbiAgY3JlYXRlRUtTQ2x1c3Rlcih2cGM6IGVjMi5JVnBjLCBjb25maWc6IEVLU1N0YWNrQ29uZmlnLCBjbHVzdGVySGFuZGxlclJvbGU6IGlhbS5Sb2xlKTogZWtzLkNsdXN0ZXIge1xuICAgIGNvbnN0IHJvbGUgPSBSb2xlLmZyb21Sb2xlQXJuKFxuICAgICAgdGhpcyxcbiAgICAgICdBZG1pblJvbGUnLFxuICAgICAgYGFybjphd3M6aWFtOjoke0F3cy5BQ0NPVU5UX0lEfTpyb2xlLyR7QXdzLlJFR0lPTn0vJHt0aGlzLmNvbmZpZy5hbGxvd0FkbWluUm9sZX1gLFxuICAgICk7XG5cbiAgICBjb25zdCBjbHVzdGVyID0gbmV3IGVrcy5DbHVzdGVyKHRoaXMsICdDbHVzdGVyJywge1xuICAgICAgY2x1c3Rlck5hbWU6IGNvbmZpZy5jbHVzdGVyTmFtZSxcbiAgICAgIHZwYzogdnBjLFxuICAgICAgZGVmYXVsdENhcGFjaXR5OiAwLCAvLyB3ZSB3YW50IHRvIG1hbmFnZSBjYXBhY2l0eSBvdXIgc2VsdmVzXG4gICAgICB2ZXJzaW9uOiBla3MuS3ViZXJuZXRlc1ZlcnNpb24uVjFfMjEsXG4gICAgICBjbHVzdGVySGFuZGxlckVudmlyb25tZW50OiB7XG4gICAgICAgIHJvbGVBcm46IGNsdXN0ZXJIYW5kbGVyUm9sZS5yb2xlQXJuLFxuICAgICAgfSxcbiAgICAgIHZwY1N1Ym5ldHM6IFt7IHN1Ym5ldFR5cGU6IGVjMi5TdWJuZXRUeXBlLlBSSVZBVEVfV0lUSF9OQVQgfV0sXG4gICAgICBzZWN1cml0eUdyb3VwOiBuZXcgZWMyLlNlY3VyaXR5R3JvdXAodGhpcywgJ0NsdXN0ZXJDb250cm9sUGFuZVNlY3VyaXR5R3JvdXAnLCB7XG4gICAgICAgIHZwYzogdnBjLFxuICAgICAgICBkZXNjcmlwdGlvbjogJ1NlY3VyaXR5IGdyb3VwIGZvciBFS1MgY2x1c3RlciBjb250cm9sIHBsYW5lJyxcbiAgICAgIH0pLFxuICAgICAgLy8gbWFzdGVyc1JvbGU6IHJvbGUgLy8gT3IgZWxzZSB3ZSBhcmUgdW5hYmxlIHRvIGxvZ2luXG4gICAgfSk7XG5cbiAgICByZXR1cm4gY2x1c3RlcjtcbiAgfVxuXG4gIGNyZWF0ZVdvcmtlck5vZGVHcm91cChla3NDbHVzdGVyOiBla3MuQ2x1c3Rlciwgd29ya2VyTm9kZVJvbGU6IFJvbGUsIHZwYzogSVZwYykge1xuICAgIGVrc0NsdXN0ZXIuYWRkTm9kZWdyb3VwQ2FwYWNpdHkodGhpcy5jb25maWcud29ya2VyR3JvdXBOYW1lLCB7XG4gICAgICBpbnN0YW5jZVR5cGVzOiBjb252ZXJ0U3RyaW5nVG9BcnJheSh0aGlzLmNvbmZpZy53b3JrZXJJbnN0YW5jZVR5cGVzKS5tYXAoXG4gICAgICAgIChpbnN0YW5jZVR5cGUpID0+IG5ldyBlYzIuSW5zdGFuY2VUeXBlKGluc3RhbmNlVHlwZSksXG4gICAgICApLFxuICAgICAgbm9kZWdyb3VwTmFtZTogdGhpcy5jb25maWcud29ya2VyR3JvdXBOYW1lLFxuICAgICAgbm9kZVJvbGU6IHdvcmtlck5vZGVSb2xlLFxuICAgICAgY2FwYWNpdHlUeXBlOiB0aGlzLmNvbmZpZy53b3JrZXJDYXBhY2l0eVR5cGUgPT09ICdTUE9UJyA/IENhcGFjaXR5VHlwZS5TUE9UIDogQ2FwYWNpdHlUeXBlLk9OX0RFTUFORCxcbiAgICAgIHN1Ym5ldHM6IHZwYy5zZWxlY3RTdWJuZXRzKHsgc3VibmV0VHlwZTogZWMyLlN1Ym5ldFR5cGUuUFJJVkFURV9XSVRIX05BVCB9KSxcbiAgICAgIGRlc2lyZWRTaXplOiBOdW1iZXIodGhpcy5jb25maWcud29ya2VyRGVzaXJlZFNpemUpLFxuICAgICAgbWluU2l6ZTogTnVtYmVyKHRoaXMuY29uZmlnLndvcmtlck1pblNpemUpLFxuICAgICAgbWF4U2l6ZTogTnVtYmVyKHRoaXMuY29uZmlnLndvcmtlck1heFNpemUpLFxuICAgIH0pO1xuICB9XG5cbiAgLy8gV2hlbiB1c2luZyBmYXJnYXRlIGZvciBmaXJzdCB0aW1lIHlvdSBtYXkgaGF2ZSB0byBjcmVhdGUgdGhlIHNlcnZpY2UgbGlua2VkIHJvbGVcbiAgLy8gYXdzIGlhbSBjcmVhdGUtc2VydmljZS1saW5rZWQtcm9sZSBcXFxuICAvLyAtLWF3cy1zZXJ2aWNlLW5hbWUgZWtzLWZhcmdhdGUuYW1hem9uYXdzLmNvbSBcXFxuICAvLyAtLWRlc2NyaXB0aW9uIFwiU2VydmljZS1saW5rZWQgcm9sZSB0byBzdXBwb3J0IGZhcmdhdGVcIlxuXG4gIGNyZWF0ZUZhcmdhdGVQcm9maWxlcyhjbHVzdGVyOiBla3MuQ2x1c3RlciwgdnBjOiBJVnBjLCBuczogZWtzLkt1YmVybmV0ZXNNYW5pZmVzdFtdKTogZWtzLkZhcmdhdGVQcm9maWxlW10ge1xuXG4gICAgY29uc3QgcG9saWN5ID0gdGhpcy5jcmVhdGVFS1NGYXJnYXRlQ2xvdWR3YXRjaFBvbGljeSgpXG5cbiAgICB2YXIgcHJvZmlsZXM6IGVrcy5GYXJnYXRlUHJvZmlsZVtdID0gW107XG4gICAgdGhpcy5jb25maWcuZmFyZ2F0ZVByb2ZpbGVzPy5mb3JFYWNoKChwcm9maWxlKSA9PiB7XG5cbiAgICAgIGNvbnN0IHAgPSBuZXcgZWtzLkZhcmdhdGVQcm9maWxlKHRoaXMsIHByb2ZpbGUubmFtZSwge1xuICAgICAgICBjbHVzdGVyLFxuICAgICAgICBzZWxlY3RvcnM6IHByb2ZpbGUuc2VsZWN0b3JzLFxuICAgICAgICB2cGM6IHZwYyxcbiAgICAgICAgc3VibmV0U2VsZWN0aW9uOiB2cGMuc2VsZWN0U3VibmV0cyh7IHN1Ym5ldFR5cGU6IGVjMi5TdWJuZXRUeXBlLlBSSVZBVEVfV0lUSF9OQVQgfSksXG4gICAgICB9KTtcbiAgICAgIC8vIHRoaXMgaXMgcmVxdWlyZWQgZm9yIGxvZ2dpbmdcbiAgICAgIHAucG9kRXhlY3V0aW9uUm9sZS5hdHRhY2hJbmxpbmVQb2xpY3kocG9saWN5KVxuXG4gICAgICBwcm9maWxlcy5wdXNoKHApO1xuXG4gICAgfSk7XG5cbiAgICAvLyBFbmFibGUgYXV0b21hdGljIGNsb3Vkd3dhdGNoIGxvZ2dpbmcgZm9yIHRoZSBzYW1lLiBUaGlzIHJlcXVpcmVzIGEgbmFtZXNwYWNlIGFuZCBhIGNvbmZpZyBtYXBcblxuICAgIGNvbnN0IG5hbWVzcGFjZSA9IGNsdXN0ZXIuYWRkTWFuaWZlc3QoJ2F3cy1vYnNlcnZhYmlsaXR5Jywge1xuICAgICAgYXBpVmVyc2lvbjogJ3YxJyxcbiAgICAgIGtpbmQ6ICdOYW1lc3BhY2UnLFxuICAgICAgbWV0YWRhdGE6IHsgbmFtZTogJ2F3cy1vYnNlcnZhYmlsaXR5JywgbGFiZWxzOiB7ICdhd3Mtb2JzZXJ2YWJpbGl0eSc6ICdlbmFibGVkJyB9IH0sXG4gICAgfSk7XG5cbiAgICAvLyB5YW1sXG4gICAgbGV0IGRhdGFSZXN1bHQ6IFJlY29yZDxzdHJpbmcsIG9iamVjdD5bXSA9IFtdO1xuICAgIHRyeSB7XG5cbiAgICAgIGNvbnN0IHBhdGggPSByZXF1aXJlKCdwYXRoJyk7XG5cbiAgICAgIGxldCB2YWx1ZXNZYW1sID0gZnMucmVhZEZpbGVTeW5jKHBhdGguam9pbihfX2Rpcm5hbWUsIGAuL21hbmlmZXN0cy9mYXJnYXRlLWNsb3Vkd2F0Y2gtbG9nZ2luZy55YW1sYCkpO1xuICAgICAgLy8gUmVwbGFjZSBEb21haW4gYW5kIGxvYWQgWUFNTFxuICAgICAgbGV0IHZhbHVlc1BhcnNlZCA9IHlhbWwubG9hZEFsbCh2YWx1ZXNZYW1sLnRvU3RyaW5nKClcbiAgICAgICAgLnJlcGxhY2UobmV3IFJlZ0V4cCgne0FXU19SRUdJT059JywgJ2dpJyksIEF3cy5SRUdJT04pXG4gICAgICAgIC5yZXBsYWNlKG5ldyBSZWdFeHAoJ3tDTFVTVEVSX05BTUV9JywgJ2dpJyksIGNsdXN0ZXIuY2x1c3Rlck5hbWUpXG4gICAgICAgICk7XG4gICAgICBpZiAodHlwZW9mIHZhbHVlc1BhcnNlZCA9PT0gJ29iamVjdCcgJiYgdmFsdWVzUGFyc2VkICE9PSBudWxsKSB7XG4gICAgICAgIGRhdGFSZXN1bHQgPSB2YWx1ZXNQYXJzZWQgYXMgUmVjb3JkPHN0cmluZywgb2JqZWN0PltdO1xuICAgICAgfVxuICAgIH0gY2F0Y2ggKGV4Y2VwdGlvbikge1xuICAgICAgY29uc29sZS5lcnJvcihcIiA+IEZhaWxlZCB0byBsb2FkICdmYXJnYXRlLWNsb3Vkd2F0Y2gtbG9nZ2luZy55YW1sJyBmb3IgJ0VLUyBDbHVzdGVyJyBkZXBsb3kuLi5cIik7XG4gICAgICBjb25zb2xlLmVycm9yKGV4Y2VwdGlvbik7XG4gICAgICBleGl0XG4gICAgfVxuXG4gICAgZGF0YVJlc3VsdC5mb3JFYWNoKGZ1bmN0aW9uICh2YWwsIGlkeCkge1xuICAgICAgY29uc3QgYSAgPSBjbHVzdGVyLmFkZE1hbmlmZXN0KCdmYXJnYXRlLWNsb3Vkd2F0Y2gtbG9nZ2luZy0nICsgaWR4LCB2YWwpO1xuICAgICAgYS5ub2RlLmFkZERlcGVuZGVuY3kobmFtZXNwYWNlKVxuICAgIH0pO1xuXG4gICAgcmV0dXJuIHByb2ZpbGVzO1xuICB9XG5cbiAgY3JlYXRlRUtTRmFyZ2F0ZUNsb3Vkd2F0Y2hQb2xpY3koKTogUG9saWN5IHtcbiAgICAvLyBlYWNoIHBvZCBleGVjdXRpb24gcm9sZSBuZWVkcyB0byBoYXZlIHRoZSBwb2xpY3lcbiAgICBjb25zdCBpYW1Qb2xpY3lEb2N1bWVudCA9IEpTT04ucGFyc2UoYHtcbiAgICAgIFwiVmVyc2lvblwiOiBcIjIwMTItMTAtMTdcIixcbiAgICAgIFwiU3RhdGVtZW50XCI6IFt7XG4gICAgICAgIFwiRWZmZWN0XCI6IFwiQWxsb3dcIixcbiAgICAgICAgXCJBY3Rpb25cIjogW1xuICAgICAgICAgIFwibG9nczpDcmVhdGVMb2dTdHJlYW1cIixcbiAgICAgICAgICBcImxvZ3M6Q3JlYXRlTG9nR3JvdXBcIixcbiAgICAgICAgICBcImxvZ3M6RGVzY3JpYmVMb2dTdHJlYW1zXCIsXG4gICAgICAgICAgXCJsb2dzOlB1dExvZ0V2ZW50c1wiXG4gICAgICAgIF0sXG4gICAgICAgIFwiUmVzb3VyY2VcIjogXCIqXCJcbiAgICAgIH1dXG4gICAgfWApXG5cbiAgICAvLyBDcmVhdGUgSUFNIFBvbGljeVxuICAgIGNvbnN0IGlhbVBvbGljeSA9IG5ldyBQb2xpY3kodGhpcywgJ0VLU0ZhcmdhdGVMb2dnaW5nUG9saWN5Jywge1xuICAgICAgcG9saWN5TmFtZTogJ0VLU0ZhcmdhdGVMb2dnaW5nUG9saWN5JyxcbiAgICAgIGRvY3VtZW50OiBQb2xpY3lEb2N1bWVudC5mcm9tSnNvbihpYW1Qb2xpY3lEb2N1bWVudCksXG4gICAgfSk7XG5cbiAgICByZXR1cm4gaWFtUG9saWN5XG4gIH1cblxuICBjcmVhdGVOYW1lc3BhY2VzKHNlbGVjdG9yczogU2VsZWN0b3JbXSwgY2x1c3RlcjogZWtzLkNsdXN0ZXIpOiBla3MuS3ViZXJuZXRlc01hbmlmZXN0W10ge1xuICAgIC8vIENyZWF0ZXMgbmFtZXNwYWNlICBmb3IgZmFyZ2F0ZSBwcm9maWxlc1xuXG4gICAgdmFyIG5zOiBla3MuS3ViZXJuZXRlc01hbmlmZXN0W10gPSBbXTtcblxuICAgIHNlbGVjdG9ycy5mb3JFYWNoKChzZWxlY3RvcikgPT4ge1xuICAgICAgY29uc3QgbmFtZXNwYWNlID0ge1xuICAgICAgICBhcGlWZXJzaW9uOiAndjEnLFxuICAgICAgICBraW5kOiAnTmFtZXNwYWNlJyxcbiAgICAgICAgbWV0YWRhdGE6IHsgbmFtZTogc2VsZWN0b3IubmFtZXNwYWNlIH0sXG4gICAgICB9O1xuXG4gICAgICBucy5wdXNoKFxuICAgICAgICBuZXcgZWtzLkt1YmVybmV0ZXNNYW5pZmVzdCh0aGlzLCBgJHtzZWxlY3Rvci5uYW1lc3BhY2V9TlNgLCB7XG4gICAgICAgICAgY2x1c3RlcixcbiAgICAgICAgICBtYW5pZmVzdDogW25hbWVzcGFjZV0sXG4gICAgICAgIH0pLFxuICAgICAgKTtcbiAgICB9KTtcblxuICAgIHJldHVybiBucztcbiAgfVxuXG4gIGNyZWF0ZVMzQnVja2V0cygpOiB2b2lkIHtcbiAgICB0aGlzLmNvbmZpZy5zM0J1Y2tldHM/LmZvckVhY2goYnVja2V0ID0+IHtcbiAgICAgIGlmIChidWNrZXQuaXNQcml2YXRlV2l0aENvcnMpIHtcbiAgICAgICAgY29uc3QgYiA9IG5ldyBCdWNrZXQodGhpcywgYnVja2V0Lm5hbWUsIHtcbiAgICAgICAgICBidWNrZXROYW1lOiBidWNrZXQubmFtZSxcbiAgICAgICAgICBlbmNyeXB0aW9uOiBCdWNrZXRFbmNyeXB0aW9uLlMzX01BTkFHRUQsXG4gICAgICAgICAgZW5mb3JjZVNTTDogdHJ1ZSxcbiAgICAgICAgICBwdWJsaWNSZWFkQWNjZXNzOiBmYWxzZSxcbiAgICAgICAgICBibG9ja1B1YmxpY0FjY2VzczogQmxvY2tQdWJsaWNBY2Nlc3MuQkxPQ0tfQUxMLFxuICAgICAgICAgIGNvcnM6IGJ1Y2tldC5jb3JzLFxuICAgICAgICAgIHZlcnNpb25lZDogdHJ1ZSxcbiAgICAgICAgICByZW1vdmFsUG9saWN5OiBSZW1vdmFsUG9saWN5LkRFU1RST1ksXG4gICAgICAgIH0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29uc3QgYiA9IG5ldyBCdWNrZXQodGhpcywgYnVja2V0Lm5hbWUsIHtcbiAgICAgICAgICBidWNrZXROYW1lOiBidWNrZXQubmFtZSxcbiAgICAgICAgICBlbmNyeXB0aW9uOiBCdWNrZXRFbmNyeXB0aW9uLlMzX01BTkFHRUQsXG4gICAgICAgICAgZW5mb3JjZVNTTDogdHJ1ZSxcbiAgICAgICAgICBwdWJsaWNSZWFkQWNjZXNzOiBmYWxzZSxcbiAgICAgICAgICBibG9ja1B1YmxpY0FjY2VzczogQmxvY2tQdWJsaWNBY2Nlc3MuQkxPQ0tfQUxMLFxuICAgICAgICAgIHZlcnNpb25lZDogdHJ1ZSxcbiAgICAgICAgICByZW1vdmFsUG9saWN5OiBSZW1vdmFsUG9saWN5LkRFU1RST1ksXG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG59XG4iXX0=
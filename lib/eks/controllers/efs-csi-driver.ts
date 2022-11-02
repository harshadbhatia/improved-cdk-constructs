import { constructs, cdk, eks, iam } from '../../../deps.ts'

export interface AwsEFSCSIDriverProps extends cdk.NestedStackProps {
  enabled: boolean;
  installIAM: boolean;
  installHelm: boolean;
}

export class AwsEFSCSIDriver extends cdk.NestedStack {

  constructor(scope: constructs.Construct, id: string, cluster: eks.Cluster, props?: AwsEFSCSIDriverProps) {
    super(scope, id, props);

    if (props?.installIAM) {
      this.createPolicyAndSA(scope, cluster);
    }

    if (props?.installHelm) {
      this.installHelmChart(cluster);
    }

  }

  createPolicyAndSA(scope: constructs.Construct, cluster: eks.Cluster) {
    const iamPolicyDocument = JSON.parse(`{
        "Version": "2012-10-17",
        "Statement": [
          {
            "Effect": "Allow",
            "Action": [
              "elasticfilesystem:DescribeAccessPoints",
              "elasticfilesystem:DescribeFileSystems"
            ],
            "Resource": "*"
          },
          {
            "Effect": "Allow",
            "Action": [
              "elasticfilesystem:CreateAccessPoint"
            ],
            "Resource": "*",
            "Condition": {
              "StringLike": {
                "aws:RequestTag/efs.csi.aws.com/cluster": "true"
              }
            }
          },
          {
            "Effect": "Allow",
            "Action": "elasticfilesystem:DeleteAccessPoint",
            "Resource": "*",
            "Condition": {
              "StringEquals": {
                "aws:ResourceTag/efs.csi.aws.com/cluster": "true"
              }
            }
          }
        ]
      }`)

    // Create Kubernetes ServiceAccount
    let svcAccount = cluster.addServiceAccount('EFSCSISA', {
      name: 'efs-csi-controller-sa',
      namespace: 'kube-system',
    });

    // svcAccount.role.addManagedPolicy(
    //   iam.ManagedPolicy.fromManagedPolicyName(scope, 'EFSCSIPolicy', 'AmazonEKS_EFS_CSI_Driver_Policy'));

    const iamPolicy = new iam.Policy(scope, 'AWSEFSCSIDriverIAMPolicy', {
      policyName: 'AWSEFSCSIDriverIAMPolicy',
      document: iam.PolicyDocument.fromJson(iamPolicyDocument),
    });


    svcAccount.role.attachInlinePolicy(iamPolicy);
  }

  installHelmChart(cluster: eks.Cluster) {
    // Install EFS CSI Driver
    // https://docs.aws.amazon.com/eks/latest/userguide/add-ons-images.html
    cluster.addHelmChart('aws-efs-csi-driver', {
      release: 'aws-efs-csi-driver',
      repository: 'https://kubernetes-sigs.github.io/aws-efs-csi-driver/',
      chart: 'aws-efs-csi-driver',
      namespace: 'kube-system',
      version: '2.2.6',
      values: {
        'clusterName': cluster.clusterName,
        'image': {
          'repository': '602401143452.dkr.ecr.ap-southeast-2.amazonaws.com/eks/aws-efs-csi-driver',
        },
        'controller': {
          'serviceAccount': {
            'create': false,
            'name': 'efs-csi-controller-sa',
          }
        }

      },
    })
  }
}
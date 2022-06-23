import { NestedStack } from 'aws-cdk-lib';
import { Cluster } from 'aws-cdk-lib/aws-eks';
import { Construct } from "constructs";
import iam = require('aws-cdk-lib/aws-iam');

export class AwsEFSCSIDriver extends NestedStack {
  body: Construct;

  constructor(scope: Construct, id: string, cluster: Cluster) {
    super(scope, id);

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
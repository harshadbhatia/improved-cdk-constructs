import { Cluster } from 'aws-cdk-lib/aws-eks';
import { Construct } from "constructs";
import iam = require('aws-cdk-lib/aws-iam');
import { Stack, StackProps } from 'aws-cdk-lib';

import p from '../policies/aws-load-balancer-controller-2.4.2.json'

export interface AwsLoadBalancerControllerProps extends StackProps {
  enabled: boolean
  installIAM: boolean;
  installHelm: boolean;
}

export class AwsLoadBalancerController extends Stack {
  body: Construct;

  constructor(scope: Construct, id: string, cluster: Cluster, props?: AwsLoadBalancerControllerProps) {
    super(scope, id, props);

    if (props?.installIAM) {
      this.createPolicyAndSA(scope, cluster);
    }

    if (props?.installHelm) {
      this.installHelmChart(cluster);
    }

  }

  createPolicyAndSA(scope: Construct, cluster: Cluster) {
    let svcAccount = cluster.addServiceAccount('aws-load-balancer-controller', {
      name: 'aws-load-balancer-controller',
      namespace: 'kube-system',
    });


    const iamPolicy = new iam.Policy(scope, 'AWSLoadBalancerControllerIAMPolicy', {
      policyName: 'AwsLoadBalancerControllerIAMPolicy',
      document: iam.PolicyDocument.fromJson(p),
    });

    svcAccount.role.attachInlinePolicy(iamPolicy);
  }

  installHelmChart(cluster: Cluster) {
    // Install Load Balancer Controller
    cluster.addHelmChart('aws-load-balancer-controller', {
      release: 'aws-load-balancer-controller',
      repository: 'https://aws.github.io/eks-charts',
      chart: 'aws-load-balancer-controller',
      namespace: 'kube-system',
      version: '1.4.3',
      values: {
        'clusterName': cluster.clusterName,
        'serviceAccount': {
          'create': false,
          'name': 'aws-load-balancer-controller',
        }
      },
    })
  }

}
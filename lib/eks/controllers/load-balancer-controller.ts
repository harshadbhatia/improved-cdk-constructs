import { Cluster } from 'aws-cdk-lib/aws-eks';
import axios from 'axios';
import { Construct } from "constructs";
import iam = require('aws-cdk-lib/aws-iam');
import { NestedStack } from 'aws-cdk-lib';

export class AwsLoadBalancerControllerNested extends NestedStack {
  body: Construct;

  constructor(scope: Construct, id: string, cluster: Cluster) {
    super(scope, id);

    const url = "https://raw.githubusercontent.com/kubernetes-sigs/aws-load-balancer-controller/v2.3.0/docs/install/iam_policy.json"


    axios.get(url).then(response => {

      const iamPolicyDocument = response.data
      // Create Kubernetes ServiceAccount
      let svcAccount = cluster.addServiceAccount('aws-load-balancer-controller', {
        name: 'aws-load-balancer-controller',
        namespace: 'kube-system',
      });

      const iamPolicy = new iam.Policy(scope, 'AWSLoadBalancerControllerIAMPolicy', {
        policyName: 'AwsoadBalancerControllerIAMPolicy',
        document: iam.PolicyDocument.fromJson(iamPolicyDocument),

      });

      svcAccount.role.attachInlinePolicy(iamPolicy);

      // Install Load Balancer Controller
      this.body = cluster.addHelmChart('aws-load-balancer-controller', {
        release: 'aws-load-balancer-controller',
        repository: 'https://aws.github.io/eks-charts',
        chart: 'aws-load-balancer-controller',
        namespace: 'kube-system',
        values: {
          'clusterName': cluster.clusterName,
          'serviceAccount': {
            'create': false,
            'name': 'aws-load-balancer-controller',
          }
        },
      })
    })

  }

}
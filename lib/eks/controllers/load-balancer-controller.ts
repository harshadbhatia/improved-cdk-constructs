
import { constructs, cdk, eks, iam } from '../../../deps.ts'
import p from '../policies/aws-load-balancer-controller-2.4.2.json' assert { type: "json" }

export interface AwsLoadBalancerControllerProps extends cdk.StackProps {
  enabled: boolean
  installIAM: boolean;
  installHelm: boolean;
}

export class AwsLoadBalancerController extends cdk.Stack {

  constructor(scope: constructs.Construct, id: string, cluster: eks.Cluster, props?: AwsLoadBalancerControllerProps) {
    super(scope, id, props);

    if (props?.installIAM) {
      this.createPolicyAndSA(scope, cluster);
    }

    if (props?.installHelm) {
      this.installHelmChart(cluster);
    }

  }

  createPolicyAndSA(scope: constructs.Construct, cluster: eks.Cluster) {
    const svcAccount = cluster.addServiceAccount('aws-load-balancer-controller', {
      name: 'aws-load-balancer-controller',
      namespace: 'kube-system',
    });


    const iamPolicy = new iam.Policy(scope, 'AWSLoadBalancerControllerIAMPolicy', {
      policyName: 'AwsLoadBalancerControllerIAMPolicy',
      document: iam.PolicyDocument.fromJson(p),
    });

    svcAccount.role.attachInlinePolicy(iamPolicy);
  }

  installHelmChart(cluster: eks.Cluster) {
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
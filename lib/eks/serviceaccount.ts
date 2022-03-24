import cdk = require('aws-cdk-lib');
import eks = require('aws-cdk-lib/aws-eks');

import { StackProps } from 'aws-cdk-lib';
import { Policy, PolicyDocument } from 'aws-cdk-lib/aws-iam';
import { Construct } from "constructs";
import { EKSSAStackConfig } from '../../interfaces/lib/eks/interfaces';


export class ServiceAccountStack extends cdk.Stack {
  
  config: EKSSAStackConfig;

  constructor(scope: Construct, id: string, config: EKSSAStackConfig, props?: StackProps) {
    super(scope, id, props);

    this.config = config;
    this.createServiceAccount()

  }

  createServiceAccount() {

    const cluster = eks.Cluster.fromClusterAttributes(this, `${this.config.clusterName}Ref`, {
        clusterName: this.config.clusterName,
        kubectlRoleArn: this.config.kubectlRoleArn
      })
    
    this.config.serviceAccounts?.map(sa => {
       // Create Kubernetes ServiceAccount
    let svcAccount = cluster.addServiceAccount(sa.name.replace('-', ''), {
      name: sa.name,
      namespace: sa.namespace,
    });

    const iamPolicyDocument = sa.policy

    if (iamPolicyDocument && sa.policyName) {
      // Create IAM Policy
      const iamPolicy = new Policy(this, sa.policyName, {
        policyName: sa.policyName,
        document: PolicyDocument.fromJson(iamPolicyDocument),
      })

      // Attach IAM role
      svcAccount.role.attachInlinePolicy(iamPolicy);
    }


    // Check if we have any role and its bindings - create required manifests
    sa.k8RoleAndBinding?.forEach(roleAndBinding => {
      const role = {
        apiVersion: "rbac.authorization.k8s.io/v1",
        kind: "Role",
        metadata: { namespace: sa.namespace, name: roleAndBinding.name },
        rules: roleAndBinding.rules
      };

      // Some subjects may have cross namepsace requirements
      var rbSubjects = false
      if (roleAndBinding.subjects) rbSubjects = true
      else rbSubjects = false


      const roleBinding = {
        apiVersion: "rbac.authorization.k8s.io/v1",
        kind: "RoleBinding",
        metadata: { namespace: sa.namespace, name: `${roleAndBinding.name}-binding` },
        subjects: rbSubjects ? roleAndBinding.subjects : [{ kind: "ServiceAccount", name: sa.name, namespace: sa.namespace }],
        roleRef: {
          kind: "Role",
          name: roleAndBinding.name,
          apiGroup: "rbac.authorization.k8s.io"
        }
      };

      new eks.KubernetesManifest(this, `${sa.name}RoleAndBinding`, {
        cluster,
        manifest: [role, roleBinding],
      });

    })

    })

   
  }

}


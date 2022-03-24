import eks = require('aws-cdk-lib/aws-eks');

import { NestedStack, StackProps } from 'aws-cdk-lib';
import { Cluster } from 'aws-cdk-lib/aws-eks';
import { Policy, PolicyDocument } from 'aws-cdk-lib/aws-iam';
import { Construct } from "constructs";
import { ServiceAccountCfg } from '../../interfaces/lib/eks/interfaces';


export class ServiceAccountNestedStack extends NestedStack {
  body: Construct;
  bodies: Construct[];
  config: ServiceAccountCfg;

  constructor(scope: Construct, id: string, eksCluster: Cluster, svcAccountsCfg: ServiceAccountCfg, props?: StackProps) {
    super(scope, id);

    this.config = svcAccountsCfg;
    this.createServiceAccount(eksCluster)

  }

  createServiceAccount(cluster: Cluster) {

    // Create Kubernetes ServiceAccount
    let svcAccount = cluster.addServiceAccount(this.config.name.replace('-', ''), {
      name: this.config.name,
      namespace: this.config.namespace,
    });

    const iamPolicyDocument = this.config.policy

    if (iamPolicyDocument && this.config.policyName) {
      // Create IAM Policy
      const iamPolicy = new Policy(this, this.config.policyName, {
        policyName: this.config.policyName,
        document: PolicyDocument.fromJson(iamPolicyDocument),
      })

      // Attach IAM role
      svcAccount.role.attachInlinePolicy(iamPolicy);
    }


    // Check if we have any role and its bindings - create required manifests
    this.config.k8RoleAndBinding?.forEach(roleAndBinding => {
      const role = {
        apiVersion: "rbac.authorization.k8s.io/v1",
        kind: "Role",
        metadata: { namespace: this.config.namespace, name: roleAndBinding.name },
        rules: roleAndBinding.rules
      };

      // Some subjects may have cross namepsace requirements
      var rbSubjects = false
      if (roleAndBinding.subjects) rbSubjects = true
      else rbSubjects = false


      const roleBinding = {
        apiVersion: "rbac.authorization.k8s.io/v1",
        kind: "RoleBinding",
        metadata: { namespace: this.config.namespace, name: `${roleAndBinding.name}-binding` },
        subjects: rbSubjects ? roleAndBinding.subjects : [{ kind: "ServiceAccount", name: this.config.name, namespace: this.config.namespace }],
        roleRef: {
          kind: "Role",
          name: roleAndBinding.name,
          apiGroup: "rbac.authorization.k8s.io"
        }
      };

      new eks.KubernetesManifest(this, `${this.config.name}RoleAndBinding`, {
        cluster,
        manifest: [role, roleBinding],
      });

    })
  }

}


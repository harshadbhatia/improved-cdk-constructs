import { Aws, NestedStack, StackProps } from 'aws-cdk-lib';
import { Cluster } from 'aws-cdk-lib/aws-eks';
import { AccountRootPrincipal, Effect, Policy, PolicyDocument, PolicyStatement, Role } from 'aws-cdk-lib/aws-iam';
import { Construct } from "constructs";
import * as fs from 'fs';

import * as yaml from 'js-yaml';
import { ExternalDNSConfig } from '../../interfaces/lib/eks/interfaces';

export class ExternalDNS extends NestedStack {
  body: Construct;
  bodies: Construct[];
  config: ExternalDNSConfig;

  constructor(scope: Construct, id: string, eksCluster: Cluster, externalDNSConfig: ExternalDNSConfig, props?: StackProps) {
    super(scope, id);

    this.config = externalDNSConfig;

    // this.createDNSRole()
    this.deployManifest(eksCluster)

  }

  createDNSRole(): Role {
    // When this is passed as role, EKS cluster successfully created(I think there is a bug in CDK).
    const policyStatement = new PolicyStatement({
      sid: "AllowExternalDNSUpdates",
      actions: [
        "route53:ChangeResourceRecordSets",
      ],
      effect: Effect.ALLOW,
      resources: ["arn:aws:route53:::hostedzone/*"]
    })

    const policyStatement2 = new PolicyStatement({
      sid: "AllowExternalDNSUpdates2",
      actions: [
        "route53:ListHostedZones",
        "route53:ListResourceRecordSets"
      ],
      effect: Effect.ALLOW,
      resources: ["*"]
    })

    const policyDocument = new PolicyDocument({
      statements: [policyStatement, policyStatement2],
    });

    const externalDNSRole = new Role(this, `ExternalDNSRole`, {
      roleName: `${Aws.STACK_NAME}-ExternalDNSRole`,
      description: `Role for external dns to create entries`,
      assumedBy: new AccountRootPrincipal(),
      inlinePolicies: {
        'ExternalDNSPolicy': policyDocument
      }
    })

    return externalDNSRole
  }

  deployManifest(cluster: Cluster) {

    // get current time
    const timeNow = Date.now() / 1000;

    // yaml
    let dataResult: Record<string, object>[] = [];

    try {


      const path = require('path');

      let valuesYaml = fs.readFileSync(path.join(__dirname, `./manifests/external-dns.yaml`));
      // Replace Domain and load YAML
      let valuesParsed = yaml.loadAll(valuesYaml.toString()
        .replace(new RegExp('{DOMAIN_FILTER}', 'gi'), this.config.domainFilter)
        .replace(new RegExp('{OWNER_ID}', 'gi'), `cdk-${timeNow}`)
      );
      if (typeof valuesParsed === 'object' && valuesParsed !== null) {
        dataResult = valuesParsed as Record<string, object>[];
      }
    } catch (exception) {
      // pass
      console.error(" > Failed to load 'external-dns.yaml' for 'external-dns' deploy...");
      console.error(exception);
      return;
    }

    // Create Kubernetes ServiceAccount
    let svcAccount = cluster.addServiceAccount('external-dns', {
      name: 'external-dns',
      namespace: 'kube-system',
    });

    const iamPolicyDocument = JSON.parse(`{
      "Version": "2012-10-17",
      "Statement": [
        {
          "Effect": "Allow",
          "Action": [
            "route53:ChangeResourceRecordSets"
          ],
          "Resource": [
            "arn:aws:route53:::hostedzone/*"
          ]
        },
        {
          "Effect": "Allow",
          "Action": [
            "route53:ListHostedZones",
            "route53:ListResourceRecordSets"
          ],
          "Resource": [
            "*"
          ]
        }
      ]
    }`)

    // Create IAM Policy
    const iamPolicy = new Policy(this, 'AllowExternalDNSUpdatesIAMPolicy', {
      policyName: 'AllowExternalDNSUpdatesIAMPolicy',
      document: PolicyDocument.fromJson(iamPolicyDocument),
    })

    // Attach IAM role
    svcAccount.role.attachInlinePolicy(iamPolicy);

    let bodies: Construct[] = [];

    // Install External DNS
    dataResult.forEach(function (val, idx) {
      bodies.push(cluster.addManifest('external-dns-' + idx, val));
    });

    this.bodies = bodies;
  }

}
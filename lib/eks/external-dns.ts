import { NestedStack, NestedStackProps } from 'aws-cdk-lib';
import { Cluster } from 'aws-cdk-lib/aws-eks';
import { Policy, PolicyDocument } from 'aws-cdk-lib/aws-iam';
import { Construct } from "constructs";
import * as fs from 'fs';

import * as yaml from 'js-yaml';

export interface ExternalDNSProps extends NestedStackProps {
  eksCluster: Cluster
  domainFilter: string;
  clusterName: string
}

export class ExternalDNS extends NestedStack {
  body: Construct;
  bodies: Construct[];
  config: ExternalDNSProps;

  constructor(scope: Construct, id: string, props?: ExternalDNSProps) {
    super(scope, id, props);

    this.config = props!;

    this.deployManifest()

  }

  deployManifest() {
    /**
     * The OWNER_ID here is very important. The Controller uses that to update any records.
     * If ever you find records are not being update that is because owner has changed from previous to this run.
     */

    // yaml
    let dataResult: Record<string, object>[] = [];

    try {

      const path = require('path');

      let valuesYaml = fs.readFileSync(path.join(__dirname, `./manifests/external-dns.yaml`));
      // Replace Domain and load YAML
      let valuesParsed = yaml.loadAll(valuesYaml.toString()
        .replace(new RegExp('{DOMAIN_FILTER}', 'gi'), this.config.domainFilter)
        .replace(new RegExp('{OWNER_ID}', 'gi'), this.config.clusterName)
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
    let svcAccount = this.config.eksCluster.addServiceAccount('external-dns', {
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
    dataResult.forEach((val, idx) => {
      bodies.push(this.config.eksCluster.addManifest('external-dns-' + idx, val));
    })

    this.bodies = bodies;
  }

}
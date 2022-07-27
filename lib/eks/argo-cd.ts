import { NestedStack, NestedStackProps } from 'aws-cdk-lib';
import { Cluster } from 'aws-cdk-lib/aws-eks';
import { Policy, PolicyDocument } from 'aws-cdk-lib/aws-iam';
import { Construct } from "constructs";
import * as fs from 'fs';

import * as yaml from 'js-yaml';

export interface ArgoCDProps extends NestedStackProps {
  eksCluster: Cluster
  clusterName: string
}

export class ArgoCD extends NestedStack {
  body: Construct;
  bodies: Construct[];
  config: ArgoCDProps;

  constructor(scope: Construct, id: string, props?: ArgoCDProps) {
    super(scope, id, props);

    this.config = props!;

    this.deployManifest()

  }

  deployManifest() {
    // yaml
    let dataResult: Record<string, object>[] = [];

    try {

      const path = require('path');

      let valuesYaml = fs.readFileSync(path.join(__dirname, `./manifests/argocd-2-4-7.yaml`));
      // Replace Domain and load YAML
      let valuesParsed = yaml.loadAll(valuesYaml.toString()
      );
      if (typeof valuesParsed === 'object' && valuesParsed !== null) {
        dataResult = valuesParsed as Record<string, object>[];
      }
    } catch (exception) {
      // pass
      console.error(" > Failed to load 'argocd.yaml' for 'argo-cd' deploy...");
      console.error(exception);
      return;
    }

    let bodies: Construct[] = [];

    // Install ARGO CD
    dataResult.forEach((val, idx) => {
      bodies.push(this.config.eksCluster.addManifest('argo-cd' + idx, val));
    })

    this.bodies = bodies;
  }

}
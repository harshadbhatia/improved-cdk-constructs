import { Aws, NestedStack, StackProps } from 'aws-cdk-lib';
import { Cluster } from 'aws-cdk-lib/aws-eks';
import { Construct } from "constructs";
import * as fs from 'fs';
import * as yaml from 'js-yaml';


export class CloudwatchLogging extends NestedStack {
  body: Construct;
  bodies: Construct[];

  eksCluster: Cluster;

  constructor(scope: Construct, id: string, eksCluster: Cluster, props?: StackProps) {
    super(scope, id);

    this.eksCluster = eksCluster;
    this.deployLogging()
    this.deployMonitoring()

  }

  deployLogging() {

    // yaml
    let dataResult: Record<string, object>[] = [];
    // create namespace
    const namespace = this.eksCluster.addManifest('amazon-cloudwatch', {
      apiVersion: 'v1',
      kind: 'Namespace',
      metadata: {
        name: 'amazon-cloudwatch',
        labels: {
          'name': 'amazon-cloudwatch',
        }
      },
    });

    try {
      const path = require('path');

      let valuesYaml = fs.readFileSync(path.join(__dirname, `./manifests/cloudwatch-logging.yaml`));
      // Replace Domain and load YAML
      let valuesParsed = yaml.loadAll(
        valuesYaml.toString()
          .replace(new RegExp('{CLUSTER_NAME}', 'gi'), this.eksCluster.clusterName)
          .replace(new RegExp('{CLUSTER_REGION}', 'gi'), Aws.REGION),
      );
      if (typeof valuesParsed === 'object' && valuesParsed !== null) {
        dataResult = valuesParsed as Record<string, object>[];
      }
    } catch (exception) {
      // pass
      console.error(" > Failed to load 'cloudwatch-logging.yaml' for 'cloudwatch-logging' deploy...");
      console.error(exception);
    }

    // Install manifest by iterating over all charts
    dataResult.forEach((val, idx) => {
      this.eksCluster.addManifest('cloudwatch-logging-' + idx, val).node.addDependency(namespace);
    });


  }

  deployMonitoring() {

    // yaml
    let dataResult: Record<string, object>[] = [];
    // create namespace
    const namespace = this.eksCluster.addManifest('aws-otel-eks', {
      apiVersion: 'v1',
      kind: 'Namespace',
      metadata: {
        name: 'aws-otel-eks',
        labels: {
          'name': 'aws-otel-eks',
        }
      },
    });

    try {
      const path = require('path');

      let valuesYaml = fs.readFileSync(path.join(__dirname, `./manifests/cloudwatch-monitoring.yaml`));
      // Replace Domain and load YAML
      let valuesParsed = yaml.loadAll(
        valuesYaml.toString()
        // .replace(new RegExp('{CLUSTER_NAME}', 'gi'), this.eksCluster.clusterName)
        // .replace(new RegExp('{CLUSTER_REGION}', 'gi'), Aws.REGION),
      );
      if (typeof valuesParsed === 'object' && valuesParsed !== null) {
        dataResult = valuesParsed as Record<string, object>[];
      }
    } catch (exception) {
      // pass
      console.error(" > Failed to load 'cloudwatch-monitoring.yaml' for 'cloudwatch-monitoring' deploy...");
      console.error(exception);
    }

    // Install manifest by iterating over all charts
    dataResult.forEach((val, idx) => {
      this.eksCluster.addManifest('cloudwatch-monitoring-' + idx, val).node.addDependency(namespace);
    });


  }

}
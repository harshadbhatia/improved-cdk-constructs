import { NestedStack } from 'aws-cdk-lib';
import { Cluster } from 'aws-cdk-lib/aws-eks';
import { Construct } from "constructs";
import iam = require('aws-cdk-lib/aws-iam');
import * as fs from 'fs';
import * as yaml from 'js-yaml';

export class AwsSecretsCSIDriverNested extends NestedStack {
    body: Construct;

    constructor(scope: Construct, id: string, cluster: Cluster) {
        super(scope, id);

        // Install Secrets Store CSI Driver
        // https://docs.aws.amazon.com/eks/latest/userguide/add-ons-images.html
        cluster.addHelmChart('secrets-store-csi-driver', {
            release: 'secrets-store-csi-driver',
            repository: 'https://kubernetes-sigs.github.io/secrets-store-csi-driver/charts/',
            chart: 'secrets-store-csi-driver',
            namespace: 'kube-system',
            version: '1.0.1',
            values: {
                'syncSecret': {
                    'enabled': true,
                }
            }
        })

        // Once the chart is installed - We need to install the provider
        let dataResult: Record<string, object>[] = [];
        try {
            const path = require('path');

            let valuesYaml = fs.readFileSync(path.join(__dirname, `../manifests/secret-store-aws-provider.yaml`));

            // Replace Domain and load YAML
            let valuesParsed = yaml.loadAll(valuesYaml.toString());
            if (typeof valuesParsed === 'object' && valuesParsed !== null) {
                dataResult = valuesParsed as Record<string, object>[];
            }
        } catch (exception) {
            // pass
            console.error(" > Failed to load 'Secrets Store AWS Provider'  deploy...");
            console.error(exception);
        }

        // Install manifest by iterating over all charts
        dataResult.forEach((val, idx) => {
            cluster.addManifest('secret-store-aws-provider' + idx, val);
        });

    }
}
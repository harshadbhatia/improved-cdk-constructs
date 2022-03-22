import eks = require('aws-cdk-lib/aws-eks');
import cdk = require('aws-cdk-lib');
import { NestedStack } from 'aws-cdk-lib';
import { Cluster } from 'aws-cdk-lib/aws-eks';
import { PolicyDocument } from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
export declare class PrometheusStack extends NestedStack {
    constructor(scope: Construct, id: string, cluster: eks.Cluster, props?: cdk.StackProps);
    createMonitoringPromethus(eksCluster: eks.Cluster): void;
    prometheusIngestRole(eksCluster: Cluster): void;
    ingestPolicy(): PolicyDocument;
    prometheusQueryRole(eksCluster: Cluster): void;
    queryPolicy(): PolicyDocument;
}

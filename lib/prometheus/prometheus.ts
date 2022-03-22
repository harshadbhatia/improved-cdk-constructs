import eks = require('aws-cdk-lib/aws-eks');
import cdk = require('aws-cdk-lib');
import { CfnJson, NestedStack } from 'aws-cdk-lib';
import { Cluster } from 'aws-cdk-lib/aws-eks';
import { Effect, FederatedPrincipal, PolicyDocument, PolicyStatement, Role } from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

export class PrometheusStack extends NestedStack {

  // IAM - Helm - Workspace
  // Currently there is no higher level contruct for Promethus and Grafana. 
  // ..TODO pre prod activitiy 

  constructor(scope: Construct, id: string, cluster: eks.Cluster, props?: cdk.StackProps) {
    super(scope, id,);

    this.createMonitoringPromethus(cluster)

  }

  createMonitoringPromethus(eksCluster: eks.Cluster) {
    this.prometheusIngestRole(eksCluster)
    this.prometheusQueryRole(eksCluster)
  }

  prometheusIngestRole(eksCluster: Cluster): void {
    const saNamepsace = "prometheus"
    const saName = "amp-iamproxy-ingest-service-account"
    const oidc_provider = eksCluster.openIdConnectProvider.openIdConnectProviderIssuer

    const stringEqualsKey = `${oidc_provider}:sub`

    const seI = new CfnJson(this, 'seI', {
      value: {
        [stringEqualsKey]: `system:serviceaccount:${saNamepsace}:${saName}`
      }
    })

    const promRole = new Role(this, "AMPIamProxyIngestRole", {
      roleName: "AMPIamProxyIngestRole",
      description: "Allows Write to AMP (Ingest Role)",
      assumedBy: new FederatedPrincipal(
        eksCluster.openIdConnectProvider.openIdConnectProviderArn,
        {
          "StringEquals": seI
        },
        "sts:AssumeRoleWithWebIdentity"
      ),
      inlinePolicies: { ingestRolePolicy: this.ingestPolicy() }
    })

  };

  ingestPolicy(): PolicyDocument {

    const permissionPolicy = new PolicyStatement(
      {
        sid: "AMPIngestPolicy",
        effect: Effect.ALLOW,

        actions: [
          "aps:RemoteWrite",
          "aps:GetSeries",
          "aps:GetLabels",
          "aps:GetMetricMetadata"
        ],
        resources: ["*"]
      }
    )

    const document = new PolicyDocument();
    document.addStatements(permissionPolicy);

    return document;

  }

  prometheusQueryRole(eksCluster: Cluster): void {
    const saNamepsace = "prometheus"
    const saName = "amp-iamproxy-query-service-account"

    const oidc_provider = eksCluster.openIdConnectProvider.openIdConnectProviderIssuer
    const stringEqualsKey = `${oidc_provider}:sub`

    const seQ = new CfnJson(this, 'Seq', {
      value: {
        [stringEqualsKey]: `system:serviceaccount:${saNamepsace}:${saName}`
      }
    })

    const promRole = new Role(this, "AMPIamProxyQueryRole", {
      roleName: "AMPIamProxyQueryRole",
      description: "Allows Read from AMP (Query Role)",
      assumedBy: new FederatedPrincipal(
        eksCluster.openIdConnectProvider.openIdConnectProviderArn,
        {
          "StringEquals": seQ
        },
        "sts:AssumeRoleWithWebIdentity"
      ),
      inlinePolicies: { QueryRolePolicy: this.queryPolicy() }
    })
  };

  queryPolicy(): PolicyDocument {

    const permissionPolicy = new PolicyStatement(
      {
        sid: "AMPQueryPolicy",
        effect: Effect.ALLOW,
        actions: [
          "aps:QueryMetrics",
          "aps:GetSeries",
          "aps:GetLabels",
          "aps:GetMetricMetadata"
        ],
        resources: ["*"]
      }
    )

    const document = new PolicyDocument();
    document.addStatements(permissionPolicy);

    return document;
  }



}


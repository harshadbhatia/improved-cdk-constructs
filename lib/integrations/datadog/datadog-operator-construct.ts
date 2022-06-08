import { Cluster, ICluster, KubernetesManifest, ServiceAccount } from "aws-cdk-lib/aws-eks";
import { Effect, OpenIdConnectProvider, PolicyStatement } from "aws-cdk-lib/aws-iam";
import { Secret } from "aws-cdk-lib/aws-secretsmanager";
import { Construct } from "constructs";
import { EKSChart } from "../../../interfaces/lib/eks/interfaces";
import { DatadogAWSIntegrationStackProps } from "../../../interfaces/lib/integrations/datadog/intefaces";
import { HelmChartStack } from "../../eks/helm-chart";


export class DatadogOperator extends Construct {

  DATADOG_OPERATOR_VERSION = "0.8.0"

  constructor(scope: Construct, id: string, props: DatadogAWSIntegrationStackProps) {

    super(scope, id);
    this.installDatadogOperator(props)

  }

  installDatadogOperator(props: DatadogAWSIntegrationStackProps) {

    const chart: EKSChart = {
      name: "DatadogOperator",
      chart: "datadog-operator",
      namespace: "datadog",
      release: `v${this.DATADOG_OPERATOR_VERSION}`,
      version: `${this.DATADOG_OPERATOR_VERSION}`,
      enabled: true,
      repository: "https://helm.datadoghq.com",
      description: `Datadog operator installation v${this.DATADOG_OPERATOR_VERSION}`,
      createNamespace: true,
      values: {}
    }

    // Create secret
    const cluster = Cluster.fromClusterAttributes(this, `${props.clusterName}Ref`, {
      clusterName: props.clusterName!,
      kubectlRoleArn: props.kubectlRoleArn!,
      openIdConnectProvider: OpenIdConnectProvider.fromOpenIdConnectProviderArn(this, 'OpenIDConnectProvider', props.openIdConnectProviderArn!),
    });

    const h = new HelmChartStack(this, 'DatadogOperator', chart, props.clusterName!, props.kubectlRoleArn!, {
      stackName: 'DatadogOperatorHelm',
      env: props.env,
      synthesizer: props.operatorSynthesizer
    });
    // This is ideal way where secret is attached automatically
    if (props.useSecretFromCSI) {
      const spc = this.createSecretProviderClass(cluster);
      const sa = this.createServiceAccount(props, cluster);
      // Create dependency so when secret provider class is created it can be accessed by SA.
      sa.node.addDependency(spc);

      // Dependency on helm chart
      spc.node.addDependency(h)

      const a = this.installDatadogAgentWithVolumeMounts(cluster, props.apiKeySecret, props.appKeySecret!)
      a.node.addDependency(h)

    } else {
      // Until datadog operator is fixed we simply use this
      const a = this.installDatadogAgentWithExistingSecret(props, cluster)
      a.node.addDependency(h)
    }

  }
  createServiceAccount(props: DatadogAWSIntegrationStackProps, cluster: ICluster): ServiceAccount {

    const apiSecret = Secret.fromSecretNameV2(this, 'DatadogApiSecret', props.apiKeySecret);
    const appSecret = Secret.fromSecretNameV2(this, 'DatadogAppSecret', props.appKeySecret!);

    const s = cluster.addServiceAccount("DatadogServiceAccount", { name: "datadog-sa", namespace: "datadog" })
    s.addToPrincipalPolicy(new PolicyStatement({
      sid: "AllowGetSecretValueForEKSDatadog",
      actions: [
        "secretsmanager:GetSecretValue",
        "secretsmanager:DescribeSecret"
      ],
      resources: [`${apiSecret.secretArn}-*`, `${appSecret.secretArn}-*`],
      effect: Effect.ALLOW,
    }))

    return s;
  }

  createSecretProviderClass(props: DatadogAWSIntegrationStackProps, cluster: ICluster): KubernetesManifest {
    const s = cluster.addManifest('DatadogSecretProvider', {
      apiVersion: "secrets-store.csi.x-k8s.io/v1",
      kind: "SecretProviderClass",
      metadata: {
        name: "datadog-secret-provider",
        namespace: "datadog"
      },
      spec: {
        provider: "aws",
        parameters: {
          objects: JSON.stringify([
            {
              objectName: props.apiKeySecret,
              objectType: "secretsmanager",
            },
            {
              objectName: props.appKeySecret!,
              objectType: "secretsmanager",
            }
          ])
        }
      }
    });

    return s;
  }

  installDatadogAgentWithExistingSecret(props: DatadogAWSIntegrationStackProps, cluster: ICluster): KubernetesManifest {

    const s = cluster.addManifest('DatadogAgent', {
      apiVersion: "datadoghq.com/v1alpha1",
      kind: "DatadogAgent",
      metadata: {
        name: "datadog-agent",
        namespace: "datadog"
      },
      spec: {
        credentials: {
          apiSecret: {
            secretName: props.apiKeySecret,
            keyName: 'api-key'
          },
          appSecret: {
            secretName: props.appKeySecret!,
            keyName: 'app-key'
          },
        },
        agent: {
          image: {
            name: 'gcr.io/datadoghq/agent:latest'
          },
          log: {
            enabled: true,
            logsConfigContainerCollectAll: true
          },
          systemProbe: {
            bpfDebugEnabled: false // enabled when bug is fixed
          },
          security: {
            compliance: {
              enabled: false // enabled when bug is fixed
            },
            runtime: {
              enabled: false // enabled when bug is fixed
            }
          },
          apm: {
            enabled: false // enable when bug is fixed
          },
          process: {
            enabled: false, // enable when bug is fixed
            processCollectionEnabled: false
          },
        },
        clusterAgent: {
          image: {
            name: 'gcr.io/datadoghq/cluster-agent:latest'
          },
          config: {
            externalMetrics: {
              enabled: true
            },
            admissionController: {
              enabled: true
            },
          }
        }
      }
    });

    return s;

  }


  installDatadogAgentWithVolumeMounts(cluster: ICluster, apiKey: string, appKey: string): KubernetesManifest {

    const api = apiKey.replace("/", "_")
    const app = appKey.replace("/", "_")
    const serviceAccountName = 'datadog-sa'

    const DD_ENV = [
      {
        name: "DD_API_KEY",
        value: `ENC[file@/mnt/secrets/${api}]`,
      },
      {
        name: "DD_APP_KEY",
        value: `ENC[file@/mnt/secrets/${app}]`,
      },
      {
        name: "DD_SECRET_BACKEND_COMMAND",
        value: '/readsecret_multiple_providers.sh',
      },
      {
        name: "DD_SECRET_BACKEND_ARGUMENTS",
        value: '/mnt/secrets',
      },
    ]

    const DD_VOLUMES = [{
      name: "secrets-store-inline",
      csi: {
        driver: "secrets-store.csi.k8s.io",
        readOnly: true,
        volumeAttributes: {
          secretProviderClass: 'datadog-secret-provider'
        }
      }
    }]

    const DD_VOLUME_MOUNTS = [{
      name: "secrets-store-inline",
      mountPath: "/mnt/secrets/",
      readOnly: true
    }]

    const s = cluster.addManifest('DatadogAgent', {
      apiVersion: "datadoghq.com/v1alpha1",
      kind: "DatadogAgent",
      metadata: {
        name: "datadog-agent",
        namespace: "datadog"
      },
      spec: {
        credentials: {
          apiKey: `ENC[file@/mnt/secrets/${app}]`,
          appKey: `ENC[file@/mnt/secrets/${app}]`,
          useSecretBackend: true
        },
        agent: {
          env: DD_ENV,
          config: {
            volumes: DD_VOLUMES,
            volumeMounts: DD_VOLUME_MOUNTS
          },
          rbac: {
            create: true,
            serviceAccountName: serviceAccountName,
          },
          image: {
            name: 'gcr.io/datadoghq/agent:latest'
          },
          log: {
            enabled: true,
            logsConfigContainerCollectAll: true
          },
          systemProbe: {
            env: DD_ENV,
            bpfDebugEnabled: false // enabled when bug is fixed
          },
          security: {
            compliance: {
              enabled: false // enabled when bug is fixed
            },
            runtime: {
              enabled: false // enabled when bug is fixed
            }
          },
          apm: {
            env: DD_ENV,
            enabled: false // enable when bug is fixed
          },
          process: {
            enabled: false, // enable when bug is fixed
            processCollectionEnabled: false
          },
        },
        clusterAgent: {
          image: {
            name: 'gcr.io/datadoghq/cluster-agent:latest'
          },
          rbac: {
            create: true,
            serviceAccountName: serviceAccountName,
          },
          config: {
            env: DD_ENV,
            externalMetrics: {
              enabled: true
            },
            admissionController: {
              enabled: true
            },
            volumes: DD_VOLUMES,
            volumeMounts: DD_VOLUME_MOUNTS
          }
        }
      }
    });

    return s;
  }
}

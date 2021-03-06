import { Cluster, ICluster, KubernetesManifest, ServiceAccount } from "aws-cdk-lib/aws-eks";
import { Effect, OpenIdConnectProvider, PolicyStatement } from "aws-cdk-lib/aws-iam";
import { Secret } from "aws-cdk-lib/aws-secretsmanager";
import { Construct } from "constructs";
import { DatadogOperatorStackProps } from "../../../interfaces/lib/integrations/datadog/intefaces";


export class DatadogAgent extends Construct {

  constructor(scope: Construct, id: string, props: DatadogOperatorStackProps) {

    super(scope, id);
    this.installAgentManifest(props)

  }

  installAgentManifest(props: DatadogOperatorStackProps) {

    let a: KubernetesManifest

    const cluster = Cluster.fromClusterAttributes(this, `${props.clusterName}Ref`, {
      clusterName: props.clusterName!,
      kubectlRoleArn: props.kubectlRoleArn!,
      openIdConnectProvider: OpenIdConnectProvider.fromOpenIdConnectProviderArn(this, 'OpenIDConnectProvider', props.openIdConnectProviderArn!),
    });

    // This is ideal way where secret is attached automatically
    if (props.useSecretFromCSI) {
      const spc = this.createSecretProviderClass(props, cluster);
      const sa = this.createServiceAccount(props, cluster);
      // Create dependency so when secret provider class is created it can be accessed by SA.
      sa.node.addDependency(spc);

      // Dependency on helm chart
      // spc.node.addDependency(h)

      a = this.installDatadogAgentWithVolumeMounts(cluster, props.apiKeySecret, props.appKeySecret!)


    } else {
      // Until datadog operator is fixed we simply use this
      a = this.installDatadogAgentWithExistingSecret(props, cluster)

    }

    return a

  }
  createServiceAccount(props: DatadogOperatorStackProps, cluster: ICluster): ServiceAccount {

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

  createSecretProviderClass(props: DatadogOperatorStackProps, cluster: ICluster): KubernetesManifest {
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

  installDatadogAgentWithExistingSecret(props: DatadogOperatorStackProps, cluster: ICluster): KubernetesManifest {

    if (!props.datadogK8ExistingSecret) console.error("Required property datadogK8ExistingSecret is missing");

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
            secretName: props.datadogK8ExistingSecret,
            keyName: 'api-key'
          },
          appSecret: {
            secretName: props.datadogK8ExistingSecret,
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
            bpfDebugEnabled: true
          },
          security: {
            compliance: {
              enabled: true
            },
            runtime: {
              enabled: true
            }
          },
          apm: {
            enabled: true
          },
          process: {
            enabled: true,
            processCollectionEnabled: true
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

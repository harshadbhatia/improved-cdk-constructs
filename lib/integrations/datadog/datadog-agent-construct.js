"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatadogAgent = void 0;
const aws_eks_1 = require("aws-cdk-lib/aws-eks");
const aws_iam_1 = require("aws-cdk-lib/aws-iam");
const aws_secretsmanager_1 = require("aws-cdk-lib/aws-secretsmanager");
const constructs_1 = require("constructs");
class DatadogAgent extends constructs_1.Construct {
    constructor(scope, id, props) {
        super(scope, id);
        this.installAgentManifest(props);
    }
    installAgentManifest(props) {
        let a;
        const cluster = aws_eks_1.Cluster.fromClusterAttributes(this, `${props.clusterName}Ref`, {
            clusterName: props.clusterName,
            kubectlRoleArn: props.kubectlRoleArn,
            openIdConnectProvider: aws_iam_1.OpenIdConnectProvider.fromOpenIdConnectProviderArn(this, 'OpenIDConnectProvider', props.openIdConnectProviderArn),
        });
        // This is ideal way where secret is attached automatically
        if (props.useSecretFromCSI) {
            const spc = this.createSecretProviderClass(props, cluster);
            const sa = this.createServiceAccount(props, cluster);
            // Create dependency so when secret provider class is created it can be accessed by SA.
            sa.node.addDependency(spc);
            // Dependency on helm chart
            // spc.node.addDependency(h)
            a = this.installDatadogAgentWithVolumeMounts(cluster, props.apiKeySecret, props.appKeySecret);
        }
        else {
            // Until datadog operator is fixed we simply use this
            a = this.installDatadogAgentWithExistingSecret(props, cluster);
        }
        return a;
    }
    createServiceAccount(props, cluster) {
        const apiSecret = aws_secretsmanager_1.Secret.fromSecretNameV2(this, 'DatadogApiSecret', props.apiKeySecret);
        const appSecret = aws_secretsmanager_1.Secret.fromSecretNameV2(this, 'DatadogAppSecret', props.appKeySecret);
        const s = cluster.addServiceAccount("DatadogServiceAccount", { name: "datadog-sa", namespace: "datadog" });
        s.addToPrincipalPolicy(new aws_iam_1.PolicyStatement({
            sid: "AllowGetSecretValueForEKSDatadog",
            actions: [
                "secretsmanager:GetSecretValue",
                "secretsmanager:DescribeSecret"
            ],
            resources: [`${apiSecret.secretArn}-*`, `${appSecret.secretArn}-*`],
            effect: aws_iam_1.Effect.ALLOW,
        }));
        return s;
    }
    createSecretProviderClass(props, cluster) {
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
                            objectName: props.appKeySecret,
                            objectType: "secretsmanager",
                        }
                    ])
                }
            }
        });
        return s;
    }
    installDatadogAgentWithExistingSecret(props, cluster) {
        if (!props.datadogK8ExistingSecret)
            console.error("Required property datadogK8ExistingSecret is missing");
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
    installDatadogAgentWithVolumeMounts(cluster, apiKey, appKey) {
        const api = apiKey.replace("/", "_");
        const app = appKey.replace("/", "_");
        const serviceAccountName = 'datadog-sa';
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
        ];
        const DD_VOLUMES = [{
                name: "secrets-store-inline",
                csi: {
                    driver: "secrets-store.csi.k8s.io",
                    readOnly: true,
                    volumeAttributes: {
                        secretProviderClass: 'datadog-secret-provider'
                    }
                }
            }];
        const DD_VOLUME_MOUNTS = [{
                name: "secrets-store-inline",
                mountPath: "/mnt/secrets/",
                readOnly: true
            }];
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
                        enabled: false,
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
exports.DatadogAgent = DatadogAgent;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGF0YWRvZy1hZ2VudC1jb25zdHJ1Y3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJkYXRhZG9nLWFnZW50LWNvbnN0cnVjdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxpREFBNEY7QUFDNUYsaURBQXFGO0FBQ3JGLHVFQUF3RDtBQUN4RCwyQ0FBdUM7QUFJdkMsTUFBYSxZQUFhLFNBQVEsc0JBQVM7SUFFekMsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxLQUFnQztRQUV4RSxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQ2pCLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxLQUFLLENBQUMsQ0FBQTtJQUVsQyxDQUFDO0lBRUQsb0JBQW9CLENBQUMsS0FBZ0M7UUFFbkQsSUFBSSxDQUFxQixDQUFBO1FBRXpCLE1BQU0sT0FBTyxHQUFHLGlCQUFPLENBQUMscUJBQXFCLENBQUMsSUFBSSxFQUFFLEdBQUcsS0FBSyxDQUFDLFdBQVcsS0FBSyxFQUFFO1lBQzdFLFdBQVcsRUFBRSxLQUFLLENBQUMsV0FBWTtZQUMvQixjQUFjLEVBQUUsS0FBSyxDQUFDLGNBQWU7WUFDckMscUJBQXFCLEVBQUUsK0JBQXFCLENBQUMsNEJBQTRCLENBQUMsSUFBSSxFQUFFLHVCQUF1QixFQUFFLEtBQUssQ0FBQyx3QkFBeUIsQ0FBQztTQUMxSSxDQUFDLENBQUM7UUFFSCwyREFBMkQ7UUFDM0QsSUFBSSxLQUFLLENBQUMsZ0JBQWdCLEVBQUU7WUFDMUIsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLHlCQUF5QixDQUFDLEtBQUssRUFBRSxPQUFPLENBQUMsQ0FBQztZQUMzRCxNQUFNLEVBQUUsR0FBRyxJQUFJLENBQUMsb0JBQW9CLENBQUMsS0FBSyxFQUFFLE9BQU8sQ0FBQyxDQUFDO1lBQ3JELHVGQUF1RjtZQUN2RixFQUFFLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUUzQiwyQkFBMkI7WUFDM0Is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b1JDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQ2x1c3RlciwgSUNsdXN0ZXIsIEt1YmVybmV0ZXNNYW5pZmVzdCwgU2VydmljZUFjY291bnQgfSBmcm9tIFwiYXdzLWNkay1saWIvYXdzLWVrc1wiO1xuaW1wb3J0IHsgRWZmZWN0LCBPcGVuSWRDb25uZWN0UHJvdmlkZXIsIFBvbGljeVN0YXRlbWVudCB9IGZyb20gXCJhd3MtY2RrLWxpYi9hd3MtaWFtXCI7XG5pbXBvcnQgeyBTZWNyZXQgfSBmcm9tIFwiYXdzLWNkay1saWIvYXdzLXNlY3JldHNtYW5hZ2VyXCI7XG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tIFwiY29uc3RydWN0c1wiO1xuaW1wb3J0IHsgRGF0YWRvZ09wZXJhdG9yU3RhY2tQcm9wcyB9IGZyb20gXCIuLi8uLi8uLi9pbnRlcmZhY2VzL2xpYi9pbnRlZ3JhdGlvbnMvZGF0YWRvZy9pbnRlZmFjZXNcIjtcblxuXG5leHBvcnQgY2xhc3MgRGF0YWRvZ0FnZW50IGV4dGVuZHMgQ29uc3RydWN0IHtcblxuICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nLCBwcm9wczogRGF0YWRvZ09wZXJhdG9yU3RhY2tQcm9wcykge1xuXG4gICAgc3VwZXIoc2NvcGUsIGlkKTtcbiAgICB0aGlzLmluc3RhbGxBZ2VudE1hbmlmZXN0KHByb3BzKVxuXG4gIH1cblxuICBpbnN0YWxsQWdlbnRNYW5pZmVzdChwcm9wczogRGF0YWRvZ09wZXJhdG9yU3RhY2tQcm9wcykge1xuXG4gICAgbGV0IGE6IEt1YmVybmV0ZXNNYW5pZmVzdFxuXG4gICAgY29uc3QgY2x1c3RlciA9IENsdXN0ZXIuZnJvbUNsdXN0ZXJBdHRyaWJ1dGVzKHRoaXMsIGAke3Byb3BzLmNsdXN0ZXJOYW1lfVJlZmAsIHtcbiAgICAgIGNsdXN0ZXJOYW1lOiBwcm9wcy5jbHVzdGVyTmFtZSEsXG4gICAgICBrdWJlY3RsUm9sZUFybjogcHJvcHMua3ViZWN0bFJvbGVBcm4hLFxuICAgICAgb3BlbklkQ29ubmVjdFByb3ZpZGVyOiBPcGVuSWRDb25uZWN0UHJvdmlkZXIuZnJvbU9wZW5JZENvbm5lY3RQcm92aWRlckFybih0aGlzLCAnT3BlbklEQ29ubmVjdFByb3ZpZGVyJywgcHJvcHMub3BlbklkQ29ubmVjdFByb3ZpZGVyQXJuISksXG4gICAgfSk7XG5cbiAgICAvLyBUaGlzIGlzIGlkZWFsIHdheSB3aGVyZSBzZWNyZXQgaXMgYXR0YWNoZWQgYXV0b21hdGljYWxseVxuICAgIGlmIChwcm9wcy51c2VTZWNyZXRGcm9tQ1NJKSB7XG4gICAgICBjb25zdCBzcGMgPSB0aGlzLmNyZWF0ZVNlY3JldFByb3ZpZGVyQ2xhc3MocHJvcHMsIGNsdXN0ZXIpO1xuICAgICAgY29uc3Qgc2EgPSB0aGlzLmNyZWF0ZVNlcnZpY2VBY2NvdW50KHByb3BzLCBjbHVzdGVyKTtcbiAgICAgIC8vIENyZWF0ZSBkZXBlbmRlbmN5IHNvIHdoZW4gc2VjcmV0IHByb3ZpZGVyIGNsYXNzIGlzIGNyZWF0ZWQgaXQgY2FuIGJlIGFjY2Vzc2VkIGJ5IFNBLlxuICAgICAgc2Eubm9kZS5hZGREZXBlbmRlbmN5KHNwYyk7XG5cbiAgICAgIC8vIERlcGVuZGVuY3kgb24gaGVsbSBjaGFydFxuICAgICAgLy8gc3BjLm5vZGUuYWRkRGVwZW5kZW5jeShoKVxuXG4gICAgICBhID0gdGhpcy5pbnN0YWxsRGF0YWRvZ0FnZW50V2l0aFZvbHVtZU1vdW50cyhjbHVzdGVyLCBwcm9wcy5hcGlLZXlTZWNyZXQsIHByb3BzLmFwcEtleVNlY3JldCEpXG5cblxuICAgIH0gZWxzZSB7XG4gICAgICAvLyBVbnRpbCBkYXRhZG9nIG9wZXJhdG9yIGlzIGZpeGVkIHdlIHNpbXBseSB1c2UgdGhpc1xuICAgICAgYSA9IHRoaXMuaW5zdGFsbERhdGFkb2dBZ2VudFdpdGhFeGlzdGluZ1NlY3JldChwcm9wcywgY2x1c3RlcilcblxuICAgIH1cblxuICAgIHJldHVybiBhXG5cbiAgfVxuICBjcmVhdGVTZXJ2aWNlQWNjb3VudChwcm9wczogRGF0YWRvZ09wZXJhdG9yU3RhY2tQcm9wcywgY2x1c3RlcjogSUNsdXN0ZXIpOiBTZXJ2aWNlQWNjb3VudCB7XG5cbiAgICBjb25zdCBhcGlTZWNyZXQgPSBTZWNyZXQuZnJvbVNlY3JldE5hbWVWMih0aGlzLCAnRGF0YWRvZ0FwaVNlY3JldCcsIHByb3BzLmFwaUtleVNlY3JldCk7XG4gICAgY29uc3QgYXBwU2VjcmV0ID0gU2VjcmV0LmZyb21TZWNyZXROYW1lVjIodGhpcywgJ0RhdGFkb2dBcHBTZWNyZXQnLCBwcm9wcy5hcHBLZXlTZWNyZXQhKTtcblxuICAgIGNvbnN0IHMgPSBjbHVzdGVyLmFkZFNlcnZpY2VBY2NvdW50KFwiRGF0YWRvZ1NlcnZpY2VBY2NvdW50XCIsIHsgbmFtZTogXCJkYXRhZG9nLXNhXCIsIG5hbWVzcGFjZTogXCJkYXRhZG9nXCIgfSlcbiAgICBzLmFkZFRvUHJpbmNpcGFsUG9saWN5KG5ldyBQb2xpY3lTdGF0ZW1lbnQoe1xuICAgICAgc2lkOiBcIkFsbG93R2V0U2VjcmV0VmFsdWVGb3JFS1NEYXRhZG9nXCIsXG4gICAgICBhY3Rpb25zOiBbXG4gICAgICAgIFwic2VjcmV0c21hbmFnZXI6R2V0U2VjcmV0VmFsdWVcIixcbiAgICAgICAgXCJzZWNyZXRzbWFuYWdlcjpEZXNjcmliZVNlY3JldFwiXG4gICAgICBdLFxuICAgICAgcmVzb3VyY2VzOiBbYCR7YXBpU2VjcmV0LnNlY3JldEFybn0tKmAsIGAke2FwcFNlY3JldC5zZWNyZXRBcm59LSpgXSxcbiAgICAgIGVmZmVjdDogRWZmZWN0LkFMTE9XLFxuICAgIH0pKVxuXG4gICAgcmV0dXJuIHM7XG4gIH1cblxuICBjcmVhdGVTZWNyZXRQcm92aWRlckNsYXNzKHByb3BzOiBEYXRhZG9nT3BlcmF0b3JTdGFja1Byb3BzLCBjbHVzdGVyOiBJQ2x1c3Rlcik6IEt1YmVybmV0ZXNNYW5pZmVzdCB7XG4gICAgY29uc3QgcyA9IGNsdXN0ZXIuYWRkTWFuaWZlc3QoJ0RhdGFkb2dTZWNyZXRQcm92aWRlcicsIHtcbiAgICAgIGFwaVZlcnNpb246IFwic2VjcmV0cy1zdG9yZS5jc2kueC1rOHMuaW8vdjFcIixcbiAgICAgIGtpbmQ6IFwiU2VjcmV0UHJvdmlkZXJDbGFzc1wiLFxuICAgICAgbWV0YWRhdGE6IHtcbiAgICAgICAgbmFtZTogXCJkYXRhZG9nLXNlY3JldC1wcm92aWRlclwiLFxuICAgICAgICBuYW1lc3BhY2U6IFwiZGF0YWRvZ1wiXG4gICAgICB9LFxuICAgICAgc3BlYzoge1xuICAgICAgICBwcm92aWRlcjogXCJhd3NcIixcbiAgICAgICAgcGFyYW1ldGVyczoge1xuICAgICAgICAgIG9iamVjdHM6IEpTT04uc3RyaW5naWZ5KFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgb2JqZWN0TmFtZTogcHJvcHMuYXBpS2V5U2VjcmV0LFxuICAgICAgICAgICAgICBvYmplY3RUeXBlOiBcInNlY3JldHNtYW5hZ2VyXCIsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBvYmplY3ROYW1lOiBwcm9wcy5hcHBLZXlTZWNyZXQhLFxuICAgICAgICAgICAgICBvYmplY3RUeXBlOiBcInNlY3JldHNtYW5hZ2VyXCIsXG4gICAgICAgICAgICB9XG4gICAgICAgICAgXSlcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pO1xuXG4gICAgcmV0dXJuIHM7XG4gIH1cblxuICBpbnN0YWxsRGF0YWRvZ0FnZW50V2l0aEV4aXN0aW5nU2VjcmV0KHByb3BzOiBEYXRhZG9nT3BlcmF0b3JTdGFja1Byb3BzLCBjbHVzdGVyOiBJQ2x1c3Rlcik6IEt1YmVybmV0ZXNNYW5pZmVzdCB7XG5cbiAgICBpZiAoIXByb3BzLmRhdGFkb2dLOEV4aXN0aW5nU2VjcmV0KSBjb25zb2xlLmVycm9yKFwiUmVxdWlyZWQgcHJvcGVydHkgZGF0YWRvZ0s4RXhpc3RpbmdTZWNyZXQgaXMgbWlzc2luZ1wiKTtcblxuICAgIGNvbnN0IHMgPSBjbHVzdGVyLmFkZE1hbmlmZXN0KCdEYXRhZG9nQWdlbnQnLCB7XG4gICAgICBhcGlWZXJzaW9uOiBcImRhdGFkb2docS5jb20vdjFhbHBoYTFcIixcbiAgICAgIGtpbmQ6IFwiRGF0YWRvZ0FnZW50XCIsXG4gICAgICBtZXRhZGF0YToge1xuICAgICAgICBuYW1lOiBcImRhdGFkb2ctYWdlbnRcIixcbiAgICAgICAgbmFtZXNwYWNlOiBcImRhdGFkb2dcIlxuICAgICAgfSxcbiAgICAgIHNwZWM6IHtcbiAgICAgICAgY3JlZGVudGlhbHM6IHtcbiAgICAgICAgICBhcGlTZWNyZXQ6IHtcbiAgICAgICAgICAgIHNlY3JldE5hbWU6IHByb3BzLmRhdGFkb2dLOEV4aXN0aW5nU2VjcmV0LFxuICAgICAgICAgICAga2V5TmFtZTogJ2FwaS1rZXknXG4gICAgICAgICAgfSxcbiAgICAgICAgICBhcHBTZWNyZXQ6IHtcbiAgICAgICAgICAgIHNlY3JldE5hbWU6IHByb3BzLmRhdGFkb2dLOEV4aXN0aW5nU2VjcmV0LFxuICAgICAgICAgICAga2V5TmFtZTogJ2FwcC1rZXknXG4gICAgICAgICAgfSxcbiAgICAgICAgfSxcbiAgICAgICAgYWdlbnQ6IHtcbiAgICAgICAgICBpbWFnZToge1xuICAgICAgICAgICAgbmFtZTogJ2djci5pby9kYXRhZG9naHEvYWdlbnQ6bGF0ZXN0J1xuICAgICAgICAgIH0sXG4gICAgICAgICAgbG9nOiB7XG4gICAgICAgICAgICBlbmFibGVkOiB0cnVlLFxuICAgICAgICAgICAgbG9nc0NvbmZpZ0NvbnRhaW5lckNvbGxlY3RBbGw6IHRydWVcbiAgICAgICAgICB9LFxuICAgICAgICAgIHN5c3RlbVByb2JlOiB7XG4gICAgICAgICAgICBicGZEZWJ1Z0VuYWJsZWQ6IHRydWVcbiAgICAgICAgICB9LFxuICAgICAgICAgIHNlY3VyaXR5OiB7XG4gICAgICAgICAgICBjb21wbGlhbmNlOiB7XG4gICAgICAgICAgICAgIGVuYWJsZWQ6IHRydWVcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBydW50aW1lOiB7XG4gICAgICAgICAgICAgIGVuYWJsZWQ6IHRydWVcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9LFxuICAgICAgICAgIGFwbToge1xuICAgICAgICAgICAgZW5hYmxlZDogdHJ1ZVxuICAgICAgICAgIH0sXG4gICAgICAgICAgcHJvY2Vzczoge1xuICAgICAgICAgICAgZW5hYmxlZDogdHJ1ZSxcbiAgICAgICAgICAgIHByb2Nlc3NDb2xsZWN0aW9uRW5hYmxlZDogdHJ1ZVxuICAgICAgICAgIH0sXG4gICAgICAgIH0sXG4gICAgICAgIGNsdXN0ZXJBZ2VudDoge1xuICAgICAgICAgIGltYWdlOiB7XG4gICAgICAgICAgICBuYW1lOiAnZ2NyLmlvL2RhdGFkb2docS9jbHVzdGVyLWFnZW50OmxhdGVzdCdcbiAgICAgICAgICB9LFxuICAgICAgICAgIGNvbmZpZzoge1xuICAgICAgICAgICAgZXh0ZXJuYWxNZXRyaWNzOiB7XG4gICAgICAgICAgICAgIGVuYWJsZWQ6IHRydWVcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBhZG1pc3Npb25Db250cm9sbGVyOiB7XG4gICAgICAgICAgICAgIGVuYWJsZWQ6IHRydWVcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICByZXR1cm4gcztcblxuICB9XG5cblxuICBpbnN0YWxsRGF0YWRvZ0FnZW50V2l0aFZvbHVtZU1vdW50cyhjbHVzdGVyOiBJQ2x1c3RlciwgYXBpS2V5OiBzdHJpbmcsIGFwcEtleTogc3RyaW5nKTogS3ViZXJuZXRlc01hbmlmZXN0IHtcblxuICAgIGNvbnN0IGFwaSA9IGFwaUtleS5yZXBsYWNlKFwiL1wiLCBcIl9cIilcbiAgICBjb25zdCBhcHAgPSBhcHBLZXkucmVwbGFjZShcIi9cIiwgXCJfXCIpXG4gICAgY29uc3Qgc2VydmljZUFjY291bnROYW1lID0gJ2RhdGFkb2ctc2EnXG5cbiAgICBjb25zdCBERF9FTlYgPSBbXG4gICAgICB7XG4gICAgICAgIG5hbWU6IFwiRERfQVBJX0tFWVwiLFxuICAgICAgICB2YWx1ZTogYEVOQ1tmaWxlQC9tbnQvc2VjcmV0cy8ke2FwaX1dYCxcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIG5hbWU6IFwiRERfQVBQX0tFWVwiLFxuICAgICAgICB2YWx1ZTogYEVOQ1tmaWxlQC9tbnQvc2VjcmV0cy8ke2FwcH1dYCxcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIG5hbWU6IFwiRERfU0VDUkVUX0JBQ0tFTkRfQ09NTUFORFwiLFxuICAgICAgICB2YWx1ZTogJy9yZWFkc2VjcmV0X211bHRpcGxlX3Byb3ZpZGVycy5zaCcsXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICBuYW1lOiBcIkREX1NFQ1JFVF9CQUNLRU5EX0FSR1VNRU5UU1wiLFxuICAgICAgICB2YWx1ZTogJy9tbnQvc2VjcmV0cycsXG4gICAgICB9LFxuICAgIF1cblxuICAgIGNvbnN0IEREX1ZPTFVNRVMgPSBbe1xuICAgICAgbmFtZTogXCJzZWNyZXRzLXN0b3JlLWlubGluZVwiLFxuICAgICAgY3NpOiB7XG4gICAgICAgIGRyaXZlcjogXCJzZWNyZXRzLXN0b3JlLmNzaS5rOHMuaW9cIixcbiAgICAgICAgcmVhZE9ubHk6IHRydWUsXG4gICAgICAgIHZvbHVtZUF0dHJpYnV0ZXM6IHtcbiAgICAgICAgICBzZWNyZXRQcm92aWRlckNsYXNzOiAnZGF0YWRvZy1zZWNyZXQtcHJvdmlkZXInXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XVxuXG4gICAgY29uc3QgRERfVk9MVU1FX01PVU5UUyA9IFt7XG4gICAgICBuYW1lOiBcInNlY3JldHMtc3RvcmUtaW5saW5lXCIsXG4gICAgICBtb3VudFBhdGg6IFwiL21udC9zZWNyZXRzL1wiLFxuICAgICAgcmVhZE9ubHk6IHRydWVcbiAgICB9XVxuXG4gICAgY29uc3QgcyA9IGNsdXN0ZXIuYWRkTWFuaWZlc3QoJ0RhdGFkb2dBZ2VudCcsIHtcbiAgICAgIGFwaVZlcnNpb246IFwiZGF0YWRvZ2hxLmNvbS92MWFscGhhMVwiLFxuICAgICAga2luZDogXCJEYXRhZG9nQWdlbnRcIixcbiAgICAgIG1ldGFkYXRhOiB7XG4gICAgICAgIG5hbWU6IFwiZGF0YWRvZy1hZ2VudFwiLFxuICAgICAgICBuYW1lc3BhY2U6IFwiZGF0YWRvZ1wiXG4gICAgICB9LFxuICAgICAgc3BlYzoge1xuICAgICAgICBjcmVkZW50aWFsczoge1xuICAgICAgICAgIGFwaUtleTogYEVOQ1tmaWxlQC9tbnQvc2VjcmV0cy8ke2FwcH1dYCxcbiAgICAgICAgICBhcHBLZXk6IGBFTkNbZmlsZUAvbW50L3NlY3JldHMvJHthcHB9XWAsXG4gICAgICAgICAgdXNlU2VjcmV0QmFja2VuZDogdHJ1ZVxuICAgICAgICB9LFxuICAgICAgICBhZ2VudDoge1xuICAgICAgICAgIGVudjogRERfRU5WLFxuICAgICAgICAgIGNvbmZpZzoge1xuICAgICAgICAgICAgdm9sdW1lczogRERfVk9MVU1FUyxcbiAgICAgICAgICAgIHZvbHVtZU1vdW50czogRERfVk9MVU1FX01PVU5UU1xuICAgICAgICAgIH0sXG4gICAgICAgICAgcmJhYzoge1xuICAgICAgICAgICAgY3JlYXRlOiB0cnVlLFxuICAgICAgICAgICAgc2VydmljZUFjY291bnROYW1lOiBzZXJ2aWNlQWNjb3VudE5hbWUsXG4gICAgICAgICAgfSxcbiAgICAgICAgICBpbWFnZToge1xuICAgICAgICAgICAgbmFtZTogJ2djci5pby9kYXRhZG9naHEvYWdlbnQ6bGF0ZXN0J1xuICAgICAgICAgIH0sXG4gICAgICAgICAgbG9nOiB7XG4gICAgICAgICAgICBlbmFibGVkOiB0cnVlLFxuICAgICAgICAgICAgbG9nc0NvbmZpZ0NvbnRhaW5lckNvbGxlY3RBbGw6IHRydWVcbiAgICAgICAgICB9LFxuICAgICAgICAgIHN5c3RlbVByb2JlOiB7XG4gICAgICAgICAgICBlbnY6IEREX0VOVixcbiAgICAgICAgICAgIGJwZkRlYnVnRW5hYmxlZDogZmFsc2UgLy8gZW5hYmxlZCB3aGVuIGJ1ZyBpcyBmaXhlZFxuICAgICAgICAgIH0sXG4gICAgICAgICAgc2VjdXJpdHk6IHtcbiAgICAgICAgICAgIGNvbXBsaWFuY2U6IHtcbiAgICAgICAgICAgICAgZW5hYmxlZDogZmFsc2UgLy8gZW5hYmxlZCB3aGVuIGJ1ZyBpcyBmaXhlZFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHJ1bnRpbWU6IHtcbiAgICAgICAgICAgICAgZW5hYmxlZDogZmFsc2UgLy8gZW5hYmxlZCB3aGVuIGJ1ZyBpcyBmaXhlZFxuICAgICAgICAgICAgfVxuICAgICAgICAgIH0sXG4gICAgICAgICAgYXBtOiB7XG4gICAgICAgICAgICBlbnY6IEREX0VOVixcbiAgICAgICAgICAgIGVuYWJsZWQ6IGZhbHNlIC8vIGVuYWJsZSB3aGVuIGJ1ZyBpcyBmaXhlZFxuICAgICAgICAgIH0sXG4gICAgICAgICAgcHJvY2Vzczoge1xuICAgICAgICAgICAgZW5hYmxlZDogZmFsc2UsIC8vIGVuYWJsZSB3aGVuIGJ1ZyBpcyBmaXhlZFxuICAgICAgICAgICAgcHJvY2Vzc0NvbGxlY3Rpb25FbmFibGVkOiBmYWxzZVxuICAgICAgICAgIH0sXG4gICAgICAgIH0sXG4gICAgICAgIGNsdXN0ZXJBZ2VudDoge1xuICAgICAgICAgIGltYWdlOiB7XG4gICAgICAgICAgICBuYW1lOiAnZ2NyLmlvL2RhdGFkb2docS9jbHVzdGVyLWFnZW50OmxhdGVzdCdcbiAgICAgICAgICB9LFxuICAgICAgICAgIHJiYWM6IHtcbiAgICAgICAgICAgIGNyZWF0ZTogdHJ1ZSxcbiAgICAgICAgICAgIHNlcnZpY2VBY2NvdW50TmFtZTogc2VydmljZUFjY291bnROYW1lLFxuICAgICAgICAgIH0sXG4gICAgICAgICAgY29uZmlnOiB7XG4gICAgICAgICAgICBlbnY6IEREX0VOVixcbiAgICAgICAgICAgIGV4dGVybmFsTWV0cmljczoge1xuICAgICAgICAgICAgICBlbmFibGVkOiB0cnVlXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgYWRtaXNzaW9uQ29udHJvbGxlcjoge1xuICAgICAgICAgICAgICBlbmFibGVkOiB0cnVlXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgdm9sdW1lczogRERfVk9MVU1FUyxcbiAgICAgICAgICAgIHZvbHVtZU1vdW50czogRERfVk9MVU1FX01PVU5UU1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pO1xuXG4gICAgcmV0dXJuIHM7XG4gIH1cbn1cbiJdfQ==
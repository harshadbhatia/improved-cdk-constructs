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
                        enabled: false,
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGF0YWRvZy1vcGVyYXRvci1jb25zdHJ1Y3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJkYXRhZG9nLW9wZXJhdG9yLWNvbnN0cnVjdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFDQSxpREFBNEY7QUFDNUYsaURBQXFGO0FBQ3JGLHVFQUF3RDtBQUN4RCwyQ0FBdUM7QUFPdkMsTUFBYSxZQUFhLFNBQVEsc0JBQVM7SUFFekMsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxLQUFnQztRQUV4RSxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQ2pCLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxLQUFLLENBQUMsQ0FBQTtJQUVsQyxDQUFDO0lBRUQsb0JBQW9CLENBQUMsS0FBZ0M7UUFFbkQsSUFBSSxDQUFxQixDQUFBO1FBRXpCLE1BQU0sT0FBTyxHQUFHLGlCQUFPLENBQUMscUJBQXFCLENBQUMsSUFBSSxFQUFFLEdBQUcsS0FBSyxDQUFDLFdBQVcsS0FBSyxFQUFFO1lBQzdFLFdBQVcsRUFBRSxLQUFLLENBQUMsV0FBWTtZQUMvQixjQUFjLEVBQUUsS0FBSyxDQUFDLGNBQWU7WUFDckMscUJBQXFCLEVBQUUsK0JBQXFCLENBQUMsNEJBQTRCLENBQUMsSUFBSSxFQUFFLHVCQUF1QixFQUFFLEtBQUssQ0FBQyx3QkFBeUIsQ0FBQztTQUMxSSxDQUFDLENBQUM7UUFFSCwyREFBMkQ7UUFDM0QsSUFBSSxLQUFLLENBQUMsZ0JBQWdCLEVBQUU7WUFDMUIsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLHlCQUF5QixDQUFDLEtBQUssRUFBRSxPQUFPLENBQUMsQ0FBQztZQUMzRCxNQUFNLEVBQUUsR0FBRyxJQUFJLENBQUMsb0JBQW9CLENBQUMsS0FBSyxFQUFFLE9BQU8sQ0FBQyxDQUFDO1lBQ3JELHVGQUF1RjtZQUN2RixFQUFFLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUUzQiwyQkFBMkI7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Q0YsQ0FBQyxDQUFDO1FBRUgsT0FBTyxDQUFDLENBQUM7SUFDWCxDQUFDO0NBQ0Y7QUFwUkQsb0NBb1JDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQXNwZWN0cyB9IGZyb20gXCJhd3MtY2RrLWxpYlwiO1xuaW1wb3J0IHsgQ2x1c3RlciwgSUNsdXN0ZXIsIEt1YmVybmV0ZXNNYW5pZmVzdCwgU2VydmljZUFjY291bnQgfSBmcm9tIFwiYXdzLWNkay1saWIvYXdzLWVrc1wiO1xuaW1wb3J0IHsgRWZmZWN0LCBPcGVuSWRDb25uZWN0UHJvdmlkZXIsIFBvbGljeVN0YXRlbWVudCB9IGZyb20gXCJhd3MtY2RrLWxpYi9hd3MtaWFtXCI7XG5pbXBvcnQgeyBTZWNyZXQgfSBmcm9tIFwiYXdzLWNkay1saWIvYXdzLXNlY3JldHNtYW5hZ2VyXCI7XG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tIFwiY29uc3RydWN0c1wiO1xuaW1wb3J0IHsgRUtTQ2hhcnQgfSBmcm9tIFwiLi4vLi4vLi4vaW50ZXJmYWNlcy9saWIvZWtzL2ludGVyZmFjZXNcIjtcbmltcG9ydCB7IERhdGFkb2dPcGVyYXRvclN0YWNrUHJvcHMgfSBmcm9tIFwiLi4vLi4vLi4vaW50ZXJmYWNlcy9saWIvaW50ZWdyYXRpb25zL2RhdGFkb2cvaW50ZWZhY2VzXCI7XG5pbXBvcnQgeyBIZWxtQ2hhcnRTdGFjayB9IGZyb20gXCIuLi8uLi9la3MvaGVsbS1jaGFydFwiO1xuaW1wb3J0IHsgUGVybWlzc2lvbnNCb3VuZGFyeUFzcGVjdCB9IGZyb20gXCIuLi8uLi91dGlsc1wiO1xuXG5cbmV4cG9ydCBjbGFzcyBEYXRhZG9nQWdlbnQgZXh0ZW5kcyBDb25zdHJ1Y3Qge1xuXG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcsIHByb3BzOiBEYXRhZG9nT3BlcmF0b3JTdGFja1Byb3BzKSB7XG5cbiAgICBzdXBlcihzY29wZSwgaWQpO1xuICAgIHRoaXMuaW5zdGFsbEFnZW50TWFuaWZlc3QocHJvcHMpXG5cbiAgfVxuXG4gIGluc3RhbGxBZ2VudE1hbmlmZXN0KHByb3BzOiBEYXRhZG9nT3BlcmF0b3JTdGFja1Byb3BzKSB7XG5cbiAgICBsZXQgYTogS3ViZXJuZXRlc01hbmlmZXN0XG5cbiAgICBjb25zdCBjbHVzdGVyID0gQ2x1c3Rlci5mcm9tQ2x1c3RlckF0dHJpYnV0ZXModGhpcywgYCR7cHJvcHMuY2x1c3Rlck5hbWV9UmVmYCwge1xuICAgICAgY2x1c3Rlck5hbWU6IHByb3BzLmNsdXN0ZXJOYW1lISxcbiAgICAgIGt1YmVjdGxSb2xlQXJuOiBwcm9wcy5rdWJlY3RsUm9sZUFybiEsXG4gICAgICBvcGVuSWRDb25uZWN0UHJvdmlkZXI6IE9wZW5JZENvbm5lY3RQcm92aWRlci5mcm9tT3BlbklkQ29ubmVjdFByb3ZpZGVyQXJuKHRoaXMsICdPcGVuSURDb25uZWN0UHJvdmlkZXInLCBwcm9wcy5vcGVuSWRDb25uZWN0UHJvdmlkZXJBcm4hKSxcbiAgICB9KTtcblxuICAgIC8vIFRoaXMgaXMgaWRlYWwgd2F5IHdoZXJlIHNlY3JldCBpcyBhdHRhY2hlZCBhdXRvbWF0aWNhbGx5XG4gICAgaWYgKHByb3BzLnVzZVNlY3JldEZyb21DU0kpIHtcbiAgICAgIGNvbnN0IHNwYyA9IHRoaXMuY3JlYXRlU2VjcmV0UHJvdmlkZXJDbGFzcyhwcm9wcywgY2x1c3Rlcik7XG4gICAgICBjb25zdCBzYSA9IHRoaXMuY3JlYXRlU2VydmljZUFjY291bnQocHJvcHMsIGNsdXN0ZXIpO1xuICAgICAgLy8gQ3JlYXRlIGRlcGVuZGVuY3kgc28gd2hlbiBzZWNyZXQgcHJvdmlkZXIgY2xhc3MgaXMgY3JlYXRlZCBpdCBjYW4gYmUgYWNjZXNzZWQgYnkgU0EuXG4gICAgICBzYS5ub2RlLmFkZERlcGVuZGVuY3koc3BjKTtcblxuICAgICAgLy8gRGVwZW5kZW5jeSBvbiBoZWxtIGNoYXJ0XG4gICAgICAvLyBzcGMubm9kZS5hZGREZXBlbmRlbmN5KGgpXG5cbiAgICAgIGEgPSB0aGlzLmluc3RhbGxEYXRhZG9nQWdlbnRXaXRoVm9sdW1lTW91bnRzKGNsdXN0ZXIsIHByb3BzLmFwaUtleVNlY3JldCwgcHJvcHMuYXBwS2V5U2VjcmV0ISlcblxuXG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIFVudGlsIGRhdGFkb2cgb3BlcmF0b3IgaXMgZml4ZWQgd2Ugc2ltcGx5IHVzZSB0aGlzXG4gICAgICBhID0gdGhpcy5pbnN0YWxsRGF0YWRvZ0FnZW50V2l0aEV4aXN0aW5nU2VjcmV0KHByb3BzLCBjbHVzdGVyKVxuXG4gICAgfVxuXG4gICAgcmV0dXJuIGFcblxuICB9XG4gIGNyZWF0ZVNlcnZpY2VBY2NvdW50KHByb3BzOiBEYXRhZG9nT3BlcmF0b3JTdGFja1Byb3BzLCBjbHVzdGVyOiBJQ2x1c3Rlcik6IFNlcnZpY2VBY2NvdW50IHtcblxuICAgIGNvbnN0IGFwaVNlY3JldCA9IFNlY3JldC5mcm9tU2VjcmV0TmFtZVYyKHRoaXMsICdEYXRhZG9nQXBpU2VjcmV0JywgcHJvcHMuYXBpS2V5U2VjcmV0KTtcbiAgICBjb25zdCBhcHBTZWNyZXQgPSBTZWNyZXQuZnJvbVNlY3JldE5hbWVWMih0aGlzLCAnRGF0YWRvZ0FwcFNlY3JldCcsIHByb3BzLmFwcEtleVNlY3JldCEpO1xuXG4gICAgY29uc3QgcyA9IGNsdXN0ZXIuYWRkU2VydmljZUFjY291bnQoXCJEYXRhZG9nU2VydmljZUFjY291bnRcIiwgeyBuYW1lOiBcImRhdGFkb2ctc2FcIiwgbmFtZXNwYWNlOiBcImRhdGFkb2dcIiB9KVxuICAgIHMuYWRkVG9QcmluY2lwYWxQb2xpY3kobmV3IFBvbGljeVN0YXRlbWVudCh7XG4gICAgICBzaWQ6IFwiQWxsb3dHZXRTZWNyZXRWYWx1ZUZvckVLU0RhdGFkb2dcIixcbiAgICAgIGFjdGlvbnM6IFtcbiAgICAgICAgXCJzZWNyZXRzbWFuYWdlcjpHZXRTZWNyZXRWYWx1ZVwiLFxuICAgICAgICBcInNlY3JldHNtYW5hZ2VyOkRlc2NyaWJlU2VjcmV0XCJcbiAgICAgIF0sXG4gICAgICByZXNvdXJjZXM6IFtgJHthcGlTZWNyZXQuc2VjcmV0QXJufS0qYCwgYCR7YXBwU2VjcmV0LnNlY3JldEFybn0tKmBdLFxuICAgICAgZWZmZWN0OiBFZmZlY3QuQUxMT1csXG4gICAgfSkpXG5cbiAgICByZXR1cm4gcztcbiAgfVxuXG4gIGNyZWF0ZVNlY3JldFByb3ZpZGVyQ2xhc3MocHJvcHM6IERhdGFkb2dPcGVyYXRvclN0YWNrUHJvcHMsIGNsdXN0ZXI6IElDbHVzdGVyKTogS3ViZXJuZXRlc01hbmlmZXN0IHtcbiAgICBjb25zdCBzID0gY2x1c3Rlci5hZGRNYW5pZmVzdCgnRGF0YWRvZ1NlY3JldFByb3ZpZGVyJywge1xuICAgICAgYXBpVmVyc2lvbjogXCJzZWNyZXRzLXN0b3JlLmNzaS54LWs4cy5pby92MVwiLFxuICAgICAga2luZDogXCJTZWNyZXRQcm92aWRlckNsYXNzXCIsXG4gICAgICBtZXRhZGF0YToge1xuICAgICAgICBuYW1lOiBcImRhdGFkb2ctc2VjcmV0LXByb3ZpZGVyXCIsXG4gICAgICAgIG5hbWVzcGFjZTogXCJkYXRhZG9nXCJcbiAgICAgIH0sXG4gICAgICBzcGVjOiB7XG4gICAgICAgIHByb3ZpZGVyOiBcImF3c1wiLFxuICAgICAgICBwYXJhbWV0ZXJzOiB7XG4gICAgICAgICAgb2JqZWN0czogSlNPTi5zdHJpbmdpZnkoW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBvYmplY3ROYW1lOiBwcm9wcy5hcGlLZXlTZWNyZXQsXG4gICAgICAgICAgICAgIG9iamVjdFR5cGU6IFwic2VjcmV0c21hbmFnZXJcIixcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIG9iamVjdE5hbWU6IHByb3BzLmFwcEtleVNlY3JldCEsXG4gICAgICAgICAgICAgIG9iamVjdFR5cGU6IFwic2VjcmV0c21hbmFnZXJcIixcbiAgICAgICAgICAgIH1cbiAgICAgICAgICBdKVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICByZXR1cm4gcztcbiAgfVxuXG4gIGluc3RhbGxEYXRhZG9nQWdlbnRXaXRoRXhpc3RpbmdTZWNyZXQocHJvcHM6IERhdGFkb2dPcGVyYXRvclN0YWNrUHJvcHMsIGNsdXN0ZXI6IElDbHVzdGVyKTogS3ViZXJuZXRlc01hbmlmZXN0IHtcblxuICAgIGlmICghcHJvcHMuZGF0YWRvZ0s4RXhpc3RpbmdTZWNyZXQpIGNvbnNvbGUuZXJyb3IoXCJSZXF1aXJlZCBwcm9wZXJ0eSBkYXRhZG9nSzhFeGlzdGluZ1NlY3JldCBpcyBtaXNzaW5nXCIpO1xuXG4gICAgY29uc3QgcyA9IGNsdXN0ZXIuYWRkTWFuaWZlc3QoJ0RhdGFkb2dBZ2VudCcsIHtcbiAgICAgIGFwaVZlcnNpb246IFwiZGF0YWRvZ2hxLmNvbS92MWFscGhhMVwiLFxuICAgICAga2luZDogXCJEYXRhZG9nQWdlbnRcIixcbiAgICAgIG1ldGFkYXRhOiB7XG4gICAgICAgIG5hbWU6IFwiZGF0YWRvZy1hZ2VudFwiLFxuICAgICAgICBuYW1lc3BhY2U6IFwiZGF0YWRvZ1wiXG4gICAgICB9LFxuICAgICAgc3BlYzoge1xuICAgICAgICBjcmVkZW50aWFsczoge1xuICAgICAgICAgIGFwaVNlY3JldDoge1xuICAgICAgICAgICAgc2VjcmV0TmFtZTogcHJvcHMuZGF0YWRvZ0s4RXhpc3RpbmdTZWNyZXQsXG4gICAgICAgICAgICBrZXlOYW1lOiAnYXBpLWtleSdcbiAgICAgICAgICB9LFxuICAgICAgICAgIGFwcFNlY3JldDoge1xuICAgICAgICAgICAgc2VjcmV0TmFtZTogcHJvcHMuZGF0YWRvZ0s4RXhpc3RpbmdTZWNyZXQsXG4gICAgICAgICAgICBrZXlOYW1lOiAnYXBwLWtleSdcbiAgICAgICAgICB9LFxuICAgICAgICB9LFxuICAgICAgICBhZ2VudDoge1xuICAgICAgICAgIGltYWdlOiB7XG4gICAgICAgICAgICBuYW1lOiAnZ2NyLmlvL2RhdGFkb2docS9hZ2VudDpsYXRlc3QnXG4gICAgICAgICAgfSxcbiAgICAgICAgICBsb2c6IHtcbiAgICAgICAgICAgIGVuYWJsZWQ6IHRydWUsXG4gICAgICAgICAgICBsb2dzQ29uZmlnQ29udGFpbmVyQ29sbGVjdEFsbDogdHJ1ZVxuICAgICAgICAgIH0sXG4gICAgICAgICAgc3lzdGVtUHJvYmU6IHtcbiAgICAgICAgICAgIGJwZkRlYnVnRW5hYmxlZDogZmFsc2UgLy8gZW5hYmxlZCB3aGVuIGJ1ZyBpcyBmaXhlZFxuICAgICAgICAgIH0sXG4gICAgICAgICAgc2VjdXJpdHk6IHtcbiAgICAgICAgICAgIGNvbXBsaWFuY2U6IHtcbiAgICAgICAgICAgICAgZW5hYmxlZDogZmFsc2UgLy8gZW5hYmxlZCB3aGVuIGJ1ZyBpcyBmaXhlZFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHJ1bnRpbWU6IHtcbiAgICAgICAgICAgICAgZW5hYmxlZDogZmFsc2UgLy8gZW5hYmxlZCB3aGVuIGJ1ZyBpcyBmaXhlZFxuICAgICAgICAgICAgfVxuICAgICAgICAgIH0sXG4gICAgICAgICAgYXBtOiB7XG4gICAgICAgICAgICBlbmFibGVkOiBmYWxzZSAvLyBlbmFibGUgd2hlbiBidWcgaXMgZml4ZWRcbiAgICAgICAgICB9LFxuICAgICAgICAgIHByb2Nlc3M6IHtcbiAgICAgICAgICAgIGVuYWJsZWQ6IGZhbHNlLCAvLyBlbmFibGUgd2hlbiBidWcgaXMgZml4ZWRcbiAgICAgICAgICAgIHByb2Nlc3NDb2xsZWN0aW9uRW5hYmxlZDogZmFsc2VcbiAgICAgICAgICB9LFxuICAgICAgICB9LFxuICAgICAgICBjbHVzdGVyQWdlbnQ6IHtcbiAgICAgICAgICBpbWFnZToge1xuICAgICAgICAgICAgbmFtZTogJ2djci5pby9kYXRhZG9naHEvY2x1c3Rlci1hZ2VudDpsYXRlc3QnXG4gICAgICAgICAgfSxcbiAgICAgICAgICBjb25maWc6IHtcbiAgICAgICAgICAgIGV4dGVybmFsTWV0cmljczoge1xuICAgICAgICAgICAgICBlbmFibGVkOiB0cnVlXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgYWRtaXNzaW9uQ29udHJvbGxlcjoge1xuICAgICAgICAgICAgICBlbmFibGVkOiB0cnVlXG4gICAgICAgICAgICB9LFxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pO1xuXG4gICAgcmV0dXJuIHM7XG5cbiAgfVxuXG5cbiAgaW5zdGFsbERhdGFkb2dBZ2VudFdpdGhWb2x1bWVNb3VudHMoY2x1c3RlcjogSUNsdXN0ZXIsIGFwaUtleTogc3RyaW5nLCBhcHBLZXk6IHN0cmluZyk6IEt1YmVybmV0ZXNNYW5pZmVzdCB7XG5cbiAgICBjb25zdCBhcGkgPSBhcGlLZXkucmVwbGFjZShcIi9cIiwgXCJfXCIpXG4gICAgY29uc3QgYXBwID0gYXBwS2V5LnJlcGxhY2UoXCIvXCIsIFwiX1wiKVxuICAgIGNvbnN0IHNlcnZpY2VBY2NvdW50TmFtZSA9ICdkYXRhZG9nLXNhJ1xuXG4gICAgY29uc3QgRERfRU5WID0gW1xuICAgICAge1xuICAgICAgICBuYW1lOiBcIkREX0FQSV9LRVlcIixcbiAgICAgICAgdmFsdWU6IGBFTkNbZmlsZUAvbW50L3NlY3JldHMvJHthcGl9XWAsXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICBuYW1lOiBcIkREX0FQUF9LRVlcIixcbiAgICAgICAgdmFsdWU6IGBFTkNbZmlsZUAvbW50L3NlY3JldHMvJHthcHB9XWAsXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICBuYW1lOiBcIkREX1NFQ1JFVF9CQUNLRU5EX0NPTU1BTkRcIixcbiAgICAgICAgdmFsdWU6ICcvcmVhZHNlY3JldF9tdWx0aXBsZV9wcm92aWRlcnMuc2gnLFxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgbmFtZTogXCJERF9TRUNSRVRfQkFDS0VORF9BUkdVTUVOVFNcIixcbiAgICAgICAgdmFsdWU6ICcvbW50L3NlY3JldHMnLFxuICAgICAgfSxcbiAgICBdXG5cbiAgICBjb25zdCBERF9WT0xVTUVTID0gW3tcbiAgICAgIG5hbWU6IFwic2VjcmV0cy1zdG9yZS1pbmxpbmVcIixcbiAgICAgIGNzaToge1xuICAgICAgICBkcml2ZXI6IFwic2VjcmV0cy1zdG9yZS5jc2kuazhzLmlvXCIsXG4gICAgICAgIHJlYWRPbmx5OiB0cnVlLFxuICAgICAgICB2b2x1bWVBdHRyaWJ1dGVzOiB7XG4gICAgICAgICAgc2VjcmV0UHJvdmlkZXJDbGFzczogJ2RhdGFkb2ctc2VjcmV0LXByb3ZpZGVyJ1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfV1cblxuICAgIGNvbnN0IEREX1ZPTFVNRV9NT1VOVFMgPSBbe1xuICAgICAgbmFtZTogXCJzZWNyZXRzLXN0b3JlLWlubGluZVwiLFxuICAgICAgbW91bnRQYXRoOiBcIi9tbnQvc2VjcmV0cy9cIixcbiAgICAgIHJlYWRPbmx5OiB0cnVlXG4gICAgfV1cblxuICAgIGNvbnN0IHMgPSBjbHVzdGVyLmFkZE1hbmlmZXN0KCdEYXRhZG9nQWdlbnQnLCB7XG4gICAgICBhcGlWZXJzaW9uOiBcImRhdGFkb2docS5jb20vdjFhbHBoYTFcIixcbiAgICAgIGtpbmQ6IFwiRGF0YWRvZ0FnZW50XCIsXG4gICAgICBtZXRhZGF0YToge1xuICAgICAgICBuYW1lOiBcImRhdGFkb2ctYWdlbnRcIixcbiAgICAgICAgbmFtZXNwYWNlOiBcImRhdGFkb2dcIlxuICAgICAgfSxcbiAgICAgIHNwZWM6IHtcbiAgICAgICAgY3JlZGVudGlhbHM6IHtcbiAgICAgICAgICBhcGlLZXk6IGBFTkNbZmlsZUAvbW50L3NlY3JldHMvJHthcHB9XWAsXG4gICAgICAgICAgYXBwS2V5OiBgRU5DW2ZpbGVAL21udC9zZWNyZXRzLyR7YXBwfV1gLFxuICAgICAgICAgIHVzZVNlY3JldEJhY2tlbmQ6IHRydWVcbiAgICAgICAgfSxcbiAgICAgICAgYWdlbnQ6IHtcbiAgICAgICAgICBlbnY6IEREX0VOVixcbiAgICAgICAgICBjb25maWc6IHtcbiAgICAgICAgICAgIHZvbHVtZXM6IEREX1ZPTFVNRVMsXG4gICAgICAgICAgICB2b2x1bWVNb3VudHM6IEREX1ZPTFVNRV9NT1VOVFNcbiAgICAgICAgICB9LFxuICAgICAgICAgIHJiYWM6IHtcbiAgICAgICAgICAgIGNyZWF0ZTogdHJ1ZSxcbiAgICAgICAgICAgIHNlcnZpY2VBY2NvdW50TmFtZTogc2VydmljZUFjY291bnROYW1lLFxuICAgICAgICAgIH0sXG4gICAgICAgICAgaW1hZ2U6IHtcbiAgICAgICAgICAgIG5hbWU6ICdnY3IuaW8vZGF0YWRvZ2hxL2FnZW50OmxhdGVzdCdcbiAgICAgICAgICB9LFxuICAgICAgICAgIGxvZzoge1xuICAgICAgICAgICAgZW5hYmxlZDogdHJ1ZSxcbiAgICAgICAgICAgIGxvZ3NDb25maWdDb250YWluZXJDb2xsZWN0QWxsOiB0cnVlXG4gICAgICAgICAgfSxcbiAgICAgICAgICBzeXN0ZW1Qcm9iZToge1xuICAgICAgICAgICAgZW52OiBERF9FTlYsXG4gICAgICAgICAgICBicGZEZWJ1Z0VuYWJsZWQ6IGZhbHNlIC8vIGVuYWJsZWQgd2hlbiBidWcgaXMgZml4ZWRcbiAgICAgICAgICB9LFxuICAgICAgICAgIHNlY3VyaXR5OiB7XG4gICAgICAgICAgICBjb21wbGlhbmNlOiB7XG4gICAgICAgICAgICAgIGVuYWJsZWQ6IGZhbHNlIC8vIGVuYWJsZWQgd2hlbiBidWcgaXMgZml4ZWRcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBydW50aW1lOiB7XG4gICAgICAgICAgICAgIGVuYWJsZWQ6IGZhbHNlIC8vIGVuYWJsZWQgd2hlbiBidWcgaXMgZml4ZWRcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9LFxuICAgICAgICAgIGFwbToge1xuICAgICAgICAgICAgZW52OiBERF9FTlYsXG4gICAgICAgICAgICBlbmFibGVkOiBmYWxzZSAvLyBlbmFibGUgd2hlbiBidWcgaXMgZml4ZWRcbiAgICAgICAgICB9LFxuICAgICAgICAgIHByb2Nlc3M6IHtcbiAgICAgICAgICAgIGVuYWJsZWQ6IGZhbHNlLCAvLyBlbmFibGUgd2hlbiBidWcgaXMgZml4ZWRcbiAgICAgICAgICAgIHByb2Nlc3NDb2xsZWN0aW9uRW5hYmxlZDogZmFsc2VcbiAgICAgICAgICB9LFxuICAgICAgICB9LFxuICAgICAgICBjbHVzdGVyQWdlbnQ6IHtcbiAgICAgICAgICBpbWFnZToge1xuICAgICAgICAgICAgbmFtZTogJ2djci5pby9kYXRhZG9naHEvY2x1c3Rlci1hZ2VudDpsYXRlc3QnXG4gICAgICAgICAgfSxcbiAgICAgICAgICByYmFjOiB7XG4gICAgICAgICAgICBjcmVhdGU6IHRydWUsXG4gICAgICAgICAgICBzZXJ2aWNlQWNjb3VudE5hbWU6IHNlcnZpY2VBY2NvdW50TmFtZSxcbiAgICAgICAgICB9LFxuICAgICAgICAgIGNvbmZpZzoge1xuICAgICAgICAgICAgZW52OiBERF9FTlYsXG4gICAgICAgICAgICBleHRlcm5hbE1ldHJpY3M6IHtcbiAgICAgICAgICAgICAgZW5hYmxlZDogdHJ1ZVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGFkbWlzc2lvbkNvbnRyb2xsZXI6IHtcbiAgICAgICAgICAgICAgZW5hYmxlZDogdHJ1ZVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHZvbHVtZXM6IEREX1ZPTFVNRVMsXG4gICAgICAgICAgICB2b2x1bWVNb3VudHM6IEREX1ZPTFVNRV9NT1VOVFNcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcblxuICAgIHJldHVybiBzO1xuICB9XG59XG4iXX0=
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatadogOperator = void 0;
const aws_eks_1 = require("aws-cdk-lib/aws-eks");
const aws_iam_1 = require("aws-cdk-lib/aws-iam");
const aws_secretsmanager_1 = require("aws-cdk-lib/aws-secretsmanager");
const constructs_1 = require("constructs");
const helm_chart_1 = require("../../eks/helm-chart");
class DatadogOperator extends constructs_1.Construct {
    constructor(scope, id, props) {
        super(scope, id);
        this.DATADOG_OPERATOR_VERSION = "0.8.0";
        this.installDatadogOperator(props);
    }
    installDatadogOperator(props) {
        const chart = {
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
        };
        // Create secret
        const cluster = aws_eks_1.Cluster.fromClusterAttributes(this, `${props.clusterName}Ref`, {
            clusterName: props.clusterName,
            kubectlRoleArn: props.kubectlRoleArn,
            openIdConnectProvider: aws_iam_1.OpenIdConnectProvider.fromOpenIdConnectProviderArn(this, 'OpenIDConnectProvider', props.openIdConnectProviderArn),
        });
        const h = new helm_chart_1.HelmChartStack(this, 'DatadogOperator', chart, props.clusterName, props.kubectlRoleArn, {
            stackName: 'DatadogOperatorHelm',
            env: props.env,
            synthesizer: props.operatorSynthesizer
        });
        // This is ideal way where secret is attached automatically
        if (props.useSecretFromCSI) {
            const spc = this.createSecretProviderClass(props, cluster);
            const sa = this.createServiceAccount(props, cluster);
            // Create dependency so when secret provider class is created it can be accessed by SA.
            sa.node.addDependency(spc);
            // Dependency on helm chart
            spc.node.addDependency(h);
            const a = this.installDatadogAgentWithVolumeMounts(cluster, props.apiKeySecret, props.appKeySecret);
            a.node.addDependency(h);
        }
        else {
            // Until datadog operator is fixed we simply use this
            const a = this.installDatadogAgentWithExistingSecret(props, cluster);
            a.node.addDependency(h);
        }
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
exports.DatadogOperator = DatadogOperator;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGF0YWRvZy1vcGVyYXRvci1jb25zdHJ1Y3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJkYXRhZG9nLW9wZXJhdG9yLWNvbnN0cnVjdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxpREFBNEY7QUFDNUYsaURBQXFGO0FBQ3JGLHVFQUF3RDtBQUN4RCwyQ0FBdUM7QUFHdkMscURBQXNEO0FBR3RELE1BQWEsZUFBZ0IsU0FBUSxzQkFBUztJQUk1QyxZQUFZLEtBQWdCLEVBQUUsRUFBVSxFQUFFLEtBQWdDO1FBRXhFLEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFKbkIsNkJBQXdCLEdBQUcsT0FBTyxDQUFBO1FBS2hDLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxLQUFLLENBQUMsQ0FBQTtJQUVwQyxDQUFDO0lBRUQsc0JBQXNCLENBQUMsS0FBZ0M7UUFFckQsTUFBTSxLQUFLLEdBQWE7WUFDdEIsSUFBSSxFQUFFLGlCQUFpQjtZQUN2QixLQUFLLEVBQUUsa0JBQWtCO1lBQ3pCLFNBQVMsRUFBRSxTQUFTO1lBQ3BCLE9BQU8sRUFBRSxJQUFJLElBQUksQ0FBQyx3QkFBd0IsRUFBRTtZQUM1QyxPQUFPLEVBQUUsR0FBRyxJQUFJLENBQUMsd0JBQXdCLEVBQUU7WUFDM0MsT0FBTyxFQUFFLElBQUk7WUFDYixVQUFVLEVBQUUsNEJBQTRCO1lBQ3hDLFdBQVcsRUFBRSxrQ0FBa0MsSUFBSSxDQUFDLHdCQUF3QixFQUFFO1lBQzlFLGVBQWUsRUFBRSxJQUFJO1lBQ3JCLE1BQU0sRUFBRSxFQUFFO1NBQ1gsQ0FBQTtRQUVELGdCQUFnQjtRQUNoQixNQUFNLE9BQU8sR0FBRyxpQkFBTyxDQUFDLHFCQUFxQixDQUFDLElBQUksRUFBRSxHQUFHLEtBQUssQ0FBQyxXQUFXLEtBQUssRUFBRTtZQUM3RSxXQUFXLEVBQUUsS0FBSyxDQUFDLFdBQVk7WUFDL0IsY0FBYyxFQUFFLEtBQUssQ0FBQyxjQUFlO1lBQ3JDLHFCQUFxQixF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QUNwRDtvQkFDRCxRQUFRLEVBQUU7d0JBQ1IsVUFBVSxFQUFFOzRCQUNWLE9BQU8sRUFBRSxLQUFLLENBQUMsNEJBQTRCO3lCQUM1Qzt3QkFDRCxPQUFPLEVBQUU7NEJBQ1AsT0FBTyxFQUFFLEtBQUssQ0FBQyw0QkFBNEI7eUJBQzVDO3FCQUNGO29CQUNELEdBQUcsRUFBRTt3QkFDSCxHQUFHLEVBQUUsTUFBTTt3QkFDWCxPQUFPLEVBQUUsS0FBSyxDQUFDLDJCQUEyQjtxQkFDM0M7b0JBQ0QsT0FBTyxFQUFFO3dCQUNQLE9BQU8sRUFBRSxLQUFLO3dCQUNkLHdCQUF3QixFQUFFLEtBQUs7cUJBQ2hDO2lCQUNGO2dCQUNELFlBQVksRUFBRTtvQkFDWixLQUFLLEVBQUU7d0JBQ0wsSUFBSSxFQUFFLHVDQUF1QztxQkFDOUM7b0JBQ0QsSUFBSSxFQUFFO3dCQUNKLE1BQU0sRUFBRSxJQUFJO3dCQUNaLGtCQUFrQixFQUFFLGtCQUFrQjtxQkFDdkM7b0JBQ0QsTUFBTSxFQUFFO3dCQUNOLEdBQUcsRUFBRSxNQUFNO3dCQUNYLGVBQWUsRUFBRTs0QkFDZixPQUFPLEVBQUUsSUFBSTt5QkFDZDt3QkFDRCxtQkFBbUIsRUFBRTs0QkFDbkIsT0FBTyxFQUFFLElBQUk7eUJBQ2Q7d0JBQ0QsT0FBTyxFQUFFLFVBQVU7d0JBQ25CLFlBQVksRUFBRSxnQkFBZ0I7cUJBQy9CO2lCQUNGO2FBQ0Y7U0FDRixDQUFDLENBQUM7UUFFSCxPQUFPLENBQUMsQ0FBQztJQUNYLENBQUM7Q0FDRjtBQW5TRCwwQ0FtU0MiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBDbHVzdGVyLCBJQ2x1c3RlciwgS3ViZXJuZXRlc01hbmlmZXN0LCBTZXJ2aWNlQWNjb3VudCB9IGZyb20gXCJhd3MtY2RrLWxpYi9hd3MtZWtzXCI7XG5pbXBvcnQgeyBFZmZlY3QsIE9wZW5JZENvbm5lY3RQcm92aWRlciwgUG9saWN5U3RhdGVtZW50IH0gZnJvbSBcImF3cy1jZGstbGliL2F3cy1pYW1cIjtcbmltcG9ydCB7IFNlY3JldCB9IGZyb20gXCJhd3MtY2RrLWxpYi9hd3Mtc2VjcmV0c21hbmFnZXJcIjtcbmltcG9ydCB7IENvbnN0cnVjdCB9IGZyb20gXCJjb25zdHJ1Y3RzXCI7XG5pbXBvcnQgeyBFS1NDaGFydCB9IGZyb20gXCIuLi8uLi8uLi9pbnRlcmZhY2VzL2xpYi9la3MvaW50ZXJmYWNlc1wiO1xuaW1wb3J0IHsgRGF0YWRvZ09wZXJhdG9yU3RhY2tQcm9wcyB9IGZyb20gXCIuLi8uLi8uLi9pbnRlcmZhY2VzL2xpYi9pbnRlZ3JhdGlvbnMvZGF0YWRvZy9pbnRlZmFjZXNcIjtcbmltcG9ydCB7IEhlbG1DaGFydFN0YWNrIH0gZnJvbSBcIi4uLy4uL2Vrcy9oZWxtLWNoYXJ0XCI7XG5cblxuZXhwb3J0IGNsYXNzIERhdGFkb2dPcGVyYXRvciBleHRlbmRzIENvbnN0cnVjdCB7XG5cbiAgREFUQURPR19PUEVSQVRPUl9WRVJTSU9OID0gXCIwLjguMFwiXG5cbiAgY29uc3RydWN0b3Ioc2NvcGU6IENvbnN0cnVjdCwgaWQ6IHN0cmluZywgcHJvcHM6IERhdGFkb2dPcGVyYXRvclN0YWNrUHJvcHMpIHtcblxuICAgIHN1cGVyKHNjb3BlLCBpZCk7XG4gICAgdGhpcy5pbnN0YWxsRGF0YWRvZ09wZXJhdG9yKHByb3BzKVxuXG4gIH1cblxuICBpbnN0YWxsRGF0YWRvZ09wZXJhdG9yKHByb3BzOiBEYXRhZG9nT3BlcmF0b3JTdGFja1Byb3BzKSB7XG5cbiAgICBjb25zdCBjaGFydDogRUtTQ2hhcnQgPSB7XG4gICAgICBuYW1lOiBcIkRhdGFkb2dPcGVyYXRvclwiLFxuICAgICAgY2hhcnQ6IFwiZGF0YWRvZy1vcGVyYXRvclwiLFxuICAgICAgbmFtZXNwYWNlOiBcImRhdGFkb2dcIixcbiAgICAgIHJlbGVhc2U6IGB2JHt0aGlzLkRBVEFET0dfT1BFUkFUT1JfVkVSU0lPTn1gLFxuICAgICAgdmVyc2lvbjogYCR7dGhpcy5EQVRBRE9HX09QRVJBVE9SX1ZFUlNJT059YCxcbiAgICAgIGVuYWJsZWQ6IHRydWUsXG4gICAgICByZXBvc2l0b3J5OiBcImh0dHBzOi8vaGVsbS5kYXRhZG9naHEuY29tXCIsXG4gICAgICBkZXNjcmlwdGlvbjogYERhdGFkb2cgb3BlcmF0b3IgaW5zdGFsbGF0aW9uIHYke3RoaXMuREFUQURPR19PUEVSQVRPUl9WRVJTSU9OfWAsXG4gICAgICBjcmVhdGVOYW1lc3BhY2U6IHRydWUsXG4gICAgICB2YWx1ZXM6IHt9XG4gICAgfVxuXG4gICAgLy8gQ3JlYXRlIHNlY3JldFxuICAgIGNvbnN0IGNsdXN0ZXIgPSBDbHVzdGVyLmZyb21DbHVzdGVyQXR0cmlidXRlcyh0aGlzLCBgJHtwcm9wcy5jbHVzdGVyTmFtZX1SZWZgLCB7XG4gICAgICBjbHVzdGVyTmFtZTogcHJvcHMuY2x1c3Rlck5hbWUhLFxuICAgICAga3ViZWN0bFJvbGVBcm46IHByb3BzLmt1YmVjdGxSb2xlQXJuISxcbiAgICAgIG9wZW5JZENvbm5lY3RQcm92aWRlcjogT3BlbklkQ29ubmVjdFByb3ZpZGVyLmZyb21PcGVuSWRDb25uZWN0UHJvdmlkZXJBcm4odGhpcywgJ09wZW5JRENvbm5lY3RQcm92aWRlcicsIHByb3BzLm9wZW5JZENvbm5lY3RQcm92aWRlckFybiEpLFxuICAgIH0pO1xuXG4gICAgY29uc3QgaCA9IG5ldyBIZWxtQ2hhcnRTdGFjayh0aGlzLCAnRGF0YWRvZ09wZXJhdG9yJywgY2hhcnQsIHByb3BzLmNsdXN0ZXJOYW1lISwgcHJvcHMua3ViZWN0bFJvbGVBcm4hLCB7XG4gICAgICBzdGFja05hbWU6ICdEYXRhZG9nT3BlcmF0b3JIZWxtJyxcbiAgICAgIGVudjogcHJvcHMuZW52LFxuICAgICAgc3ludGhlc2l6ZXI6IHByb3BzLm9wZXJhdG9yU3ludGhlc2l6ZXJcbiAgICB9KTtcbiAgICAvLyBUaGlzIGlzIGlkZWFsIHdheSB3aGVyZSBzZWNyZXQgaXMgYXR0YWNoZWQgYXV0b21hdGljYWxseVxuICAgIGlmIChwcm9wcy51c2VTZWNyZXRGcm9tQ1NJKSB7XG4gICAgICBjb25zdCBzcGMgPSB0aGlzLmNyZWF0ZVNlY3JldFByb3ZpZGVyQ2xhc3MocHJvcHMsIGNsdXN0ZXIpO1xuICAgICAgY29uc3Qgc2EgPSB0aGlzLmNyZWF0ZVNlcnZpY2VBY2NvdW50KHByb3BzLCBjbHVzdGVyKTtcbiAgICAgIC8vIENyZWF0ZSBkZXBlbmRlbmN5IHNvIHdoZW4gc2VjcmV0IHByb3ZpZGVyIGNsYXNzIGlzIGNyZWF0ZWQgaXQgY2FuIGJlIGFjY2Vzc2VkIGJ5IFNBLlxuICAgICAgc2Eubm9kZS5hZGREZXBlbmRlbmN5KHNwYyk7XG5cbiAgICAgIC8vIERlcGVuZGVuY3kgb24gaGVsbSBjaGFydFxuICAgICAgc3BjLm5vZGUuYWRkRGVwZW5kZW5jeShoKVxuXG4gICAgICBjb25zdCBhID0gdGhpcy5pbnN0YWxsRGF0YWRvZ0FnZW50V2l0aFZvbHVtZU1vdW50cyhjbHVzdGVyLCBwcm9wcy5hcGlLZXlTZWNyZXQsIHByb3BzLmFwcEtleVNlY3JldCEpXG4gICAgICBhLm5vZGUuYWRkRGVwZW5kZW5jeShoKVxuXG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIFVudGlsIGRhdGFkb2cgb3BlcmF0b3IgaXMgZml4ZWQgd2Ugc2ltcGx5IHVzZSB0aGlzXG4gICAgICBjb25zdCBhID0gdGhpcy5pbnN0YWxsRGF0YWRvZ0FnZW50V2l0aEV4aXN0aW5nU2VjcmV0KHByb3BzLCBjbHVzdGVyKVxuICAgICAgYS5ub2RlLmFkZERlcGVuZGVuY3koaClcbiAgICB9XG5cbiAgfVxuICBjcmVhdGVTZXJ2aWNlQWNjb3VudChwcm9wczogRGF0YWRvZ09wZXJhdG9yU3RhY2tQcm9wcywgY2x1c3RlcjogSUNsdXN0ZXIpOiBTZXJ2aWNlQWNjb3VudCB7XG5cbiAgICBjb25zdCBhcGlTZWNyZXQgPSBTZWNyZXQuZnJvbVNlY3JldE5hbWVWMih0aGlzLCAnRGF0YWRvZ0FwaVNlY3JldCcsIHByb3BzLmFwaUtleVNlY3JldCk7XG4gICAgY29uc3QgYXBwU2VjcmV0ID0gU2VjcmV0LmZyb21TZWNyZXROYW1lVjIodGhpcywgJ0RhdGFkb2dBcHBTZWNyZXQnLCBwcm9wcy5hcHBLZXlTZWNyZXQhKTtcblxuICAgIGNvbnN0IHMgPSBjbHVzdGVyLmFkZFNlcnZpY2VBY2NvdW50KFwiRGF0YWRvZ1NlcnZpY2VBY2NvdW50XCIsIHsgbmFtZTogXCJkYXRhZG9nLXNhXCIsIG5hbWVzcGFjZTogXCJkYXRhZG9nXCIgfSlcbiAgICBzLmFkZFRvUHJpbmNpcGFsUG9saWN5KG5ldyBQb2xpY3lTdGF0ZW1lbnQoe1xuICAgICAgc2lkOiBcIkFsbG93R2V0U2VjcmV0VmFsdWVGb3JFS1NEYXRhZG9nXCIsXG4gICAgICBhY3Rpb25zOiBbXG4gICAgICAgIFwic2VjcmV0c21hbmFnZXI6R2V0U2VjcmV0VmFsdWVcIixcbiAgICAgICAgXCJzZWNyZXRzbWFuYWdlcjpEZXNjcmliZVNlY3JldFwiXG4gICAgICBdLFxuICAgICAgcmVzb3VyY2VzOiBbYCR7YXBpU2VjcmV0LnNlY3JldEFybn0tKmAsIGAke2FwcFNlY3JldC5zZWNyZXRBcm59LSpgXSxcbiAgICAgIGVmZmVjdDogRWZmZWN0LkFMTE9XLFxuICAgIH0pKVxuXG4gICAgcmV0dXJuIHM7XG4gIH1cblxuICBjcmVhdGVTZWNyZXRQcm92aWRlckNsYXNzKHByb3BzOiBEYXRhZG9nT3BlcmF0b3JTdGFja1Byb3BzLCBjbHVzdGVyOiBJQ2x1c3Rlcik6IEt1YmVybmV0ZXNNYW5pZmVzdCB7XG4gICAgY29uc3QgcyA9IGNsdXN0ZXIuYWRkTWFuaWZlc3QoJ0RhdGFkb2dTZWNyZXRQcm92aWRlcicsIHtcbiAgICAgIGFwaVZlcnNpb246IFwic2VjcmV0cy1zdG9yZS5jc2kueC1rOHMuaW8vdjFcIixcbiAgICAgIGtpbmQ6IFwiU2VjcmV0UHJvdmlkZXJDbGFzc1wiLFxuICAgICAgbWV0YWRhdGE6IHtcbiAgICAgICAgbmFtZTogXCJkYXRhZG9nLXNlY3JldC1wcm92aWRlclwiLFxuICAgICAgICBuYW1lc3BhY2U6IFwiZGF0YWRvZ1wiXG4gICAgICB9LFxuICAgICAgc3BlYzoge1xuICAgICAgICBwcm92aWRlcjogXCJhd3NcIixcbiAgICAgICAgcGFyYW1ldGVyczoge1xuICAgICAgICAgIG9iamVjdHM6IEpTT04uc3RyaW5naWZ5KFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgb2JqZWN0TmFtZTogcHJvcHMuYXBpS2V5U2VjcmV0LFxuICAgICAgICAgICAgICBvYmplY3RUeXBlOiBcInNlY3JldHNtYW5hZ2VyXCIsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBvYmplY3ROYW1lOiBwcm9wcy5hcHBLZXlTZWNyZXQhLFxuICAgICAgICAgICAgICBvYmplY3RUeXBlOiBcInNlY3JldHNtYW5hZ2VyXCIsXG4gICAgICAgICAgICB9XG4gICAgICAgICAgXSlcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pO1xuXG4gICAgcmV0dXJuIHM7XG4gIH1cblxuICBpbnN0YWxsRGF0YWRvZ0FnZW50V2l0aEV4aXN0aW5nU2VjcmV0KHByb3BzOiBEYXRhZG9nT3BlcmF0b3JTdGFja1Byb3BzLCBjbHVzdGVyOiBJQ2x1c3Rlcik6IEt1YmVybmV0ZXNNYW5pZmVzdCB7XG5cbiAgICBjb25zdCBzID0gY2x1c3Rlci5hZGRNYW5pZmVzdCgnRGF0YWRvZ0FnZW50Jywge1xuICAgICAgYXBpVmVyc2lvbjogXCJkYXRhZG9naHEuY29tL3YxYWxwaGExXCIsXG4gICAgICBraW5kOiBcIkRhdGFkb2dBZ2VudFwiLFxuICAgICAgbWV0YWRhdGE6IHtcbiAgICAgICAgbmFtZTogXCJkYXRhZG9nLWFnZW50XCIsXG4gICAgICAgIG5hbWVzcGFjZTogXCJkYXRhZG9nXCJcbiAgICAgIH0sXG4gICAgICBzcGVjOiB7XG4gICAgICAgIGNyZWRlbnRpYWxzOiB7XG4gICAgICAgICAgYXBpU2VjcmV0OiB7XG4gICAgICAgICAgICBzZWNyZXROYW1lOiBwcm9wcy5kYXRhZG9nSzhFeGlzdGluZ1NlY3JldCEsXG4gICAgICAgICAgICBrZXlOYW1lOiAnYXBpLWtleSdcbiAgICAgICAgICB9LFxuICAgICAgICAgIGFwcFNlY3JldDoge1xuICAgICAgICAgICAgc2VjcmV0TmFtZTogcHJvcHMuZGF0YWRvZ0s4RXhpc3RpbmdTZWNyZXQhLFxuICAgICAgICAgICAga2V5TmFtZTogJ2FwcC1rZXknXG4gICAgICAgICAgfSxcbiAgICAgICAgfSxcbiAgICAgICAgYWdlbnQ6IHtcbiAgICAgICAgICBpbWFnZToge1xuICAgICAgICAgICAgbmFtZTogJ2djci5pby9kYXRhZG9naHEvYWdlbnQ6bGF0ZXN0J1xuICAgICAgICAgIH0sXG4gICAgICAgICAgbG9nOiB7XG4gICAgICAgICAgICBlbmFibGVkOiB0cnVlLFxuICAgICAgICAgICAgbG9nc0NvbmZpZ0NvbnRhaW5lckNvbGxlY3RBbGw6IHRydWVcbiAgICAgICAgICB9LFxuICAgICAgICAgIHN5c3RlbVByb2JlOiB7XG4gICAgICAgICAgICBicGZEZWJ1Z0VuYWJsZWQ6IGZhbHNlIC8vIGVuYWJsZWQgd2hlbiBidWcgaXMgZml4ZWRcbiAgICAgICAgICB9LFxuICAgICAgICAgIHNlY3VyaXR5OiB7XG4gICAgICAgICAgICBjb21wbGlhbmNlOiB7XG4gICAgICAgICAgICAgIGVuYWJsZWQ6IGZhbHNlIC8vIGVuYWJsZWQgd2hlbiBidWcgaXMgZml4ZWRcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBydW50aW1lOiB7XG4gICAgICAgICAgICAgIGVuYWJsZWQ6IGZhbHNlIC8vIGVuYWJsZWQgd2hlbiBidWcgaXMgZml4ZWRcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9LFxuICAgICAgICAgIGFwbToge1xuICAgICAgICAgICAgZW5hYmxlZDogZmFsc2UgLy8gZW5hYmxlIHdoZW4gYnVnIGlzIGZpeGVkXG4gICAgICAgICAgfSxcbiAgICAgICAgICBwcm9jZXNzOiB7XG4gICAgICAgICAgICBlbmFibGVkOiBmYWxzZSwgLy8gZW5hYmxlIHdoZW4gYnVnIGlzIGZpeGVkXG4gICAgICAgICAgICBwcm9jZXNzQ29sbGVjdGlvbkVuYWJsZWQ6IGZhbHNlXG4gICAgICAgICAgfSxcbiAgICAgICAgfSxcbiAgICAgICAgY2x1c3RlckFnZW50OiB7XG4gICAgICAgICAgaW1hZ2U6IHtcbiAgICAgICAgICAgIG5hbWU6ICdnY3IuaW8vZGF0YWRvZ2hxL2NsdXN0ZXItYWdlbnQ6bGF0ZXN0J1xuICAgICAgICAgIH0sXG4gICAgICAgICAgY29uZmlnOiB7XG4gICAgICAgICAgICBleHRlcm5hbE1ldHJpY3M6IHtcbiAgICAgICAgICAgICAgZW5hYmxlZDogdHJ1ZVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGFkbWlzc2lvbkNvbnRyb2xsZXI6IHtcbiAgICAgICAgICAgICAgZW5hYmxlZDogdHJ1ZVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcblxuICAgIHJldHVybiBzO1xuXG4gIH1cblxuXG4gIGluc3RhbGxEYXRhZG9nQWdlbnRXaXRoVm9sdW1lTW91bnRzKGNsdXN0ZXI6IElDbHVzdGVyLCBhcGlLZXk6IHN0cmluZywgYXBwS2V5OiBzdHJpbmcpOiBLdWJlcm5ldGVzTWFuaWZlc3Qge1xuXG4gICAgY29uc3QgYXBpID0gYXBpS2V5LnJlcGxhY2UoXCIvXCIsIFwiX1wiKVxuICAgIGNvbnN0IGFwcCA9IGFwcEtleS5yZXBsYWNlKFwiL1wiLCBcIl9cIilcbiAgICBjb25zdCBzZXJ2aWNlQWNjb3VudE5hbWUgPSAnZGF0YWRvZy1zYSdcblxuICAgIGNvbnN0IEREX0VOViA9IFtcbiAgICAgIHtcbiAgICAgICAgbmFtZTogXCJERF9BUElfS0VZXCIsXG4gICAgICAgIHZhbHVlOiBgRU5DW2ZpbGVAL21udC9zZWNyZXRzLyR7YXBpfV1gLFxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgbmFtZTogXCJERF9BUFBfS0VZXCIsXG4gICAgICAgIHZhbHVlOiBgRU5DW2ZpbGVAL21udC9zZWNyZXRzLyR7YXBwfV1gLFxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgbmFtZTogXCJERF9TRUNSRVRfQkFDS0VORF9DT01NQU5EXCIsXG4gICAgICAgIHZhbHVlOiAnL3JlYWRzZWNyZXRfbXVsdGlwbGVfcHJvdmlkZXJzLnNoJyxcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIG5hbWU6IFwiRERfU0VDUkVUX0JBQ0tFTkRfQVJHVU1FTlRTXCIsXG4gICAgICAgIHZhbHVlOiAnL21udC9zZWNyZXRzJyxcbiAgICAgIH0sXG4gICAgXVxuXG4gICAgY29uc3QgRERfVk9MVU1FUyA9IFt7XG4gICAgICBuYW1lOiBcInNlY3JldHMtc3RvcmUtaW5saW5lXCIsXG4gICAgICBjc2k6IHtcbiAgICAgICAgZHJpdmVyOiBcInNlY3JldHMtc3RvcmUuY3NpLms4cy5pb1wiLFxuICAgICAgICByZWFkT25seTogdHJ1ZSxcbiAgICAgICAgdm9sdW1lQXR0cmlidXRlczoge1xuICAgICAgICAgIHNlY3JldFByb3ZpZGVyQ2xhc3M6ICdkYXRhZG9nLXNlY3JldC1wcm92aWRlcidcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1dXG5cbiAgICBjb25zdCBERF9WT0xVTUVfTU9VTlRTID0gW3tcbiAgICAgIG5hbWU6IFwic2VjcmV0cy1zdG9yZS1pbmxpbmVcIixcbiAgICAgIG1vdW50UGF0aDogXCIvbW50L3NlY3JldHMvXCIsXG4gICAgICByZWFkT25seTogdHJ1ZVxuICAgIH1dXG5cbiAgICBjb25zdCBzID0gY2x1c3Rlci5hZGRNYW5pZmVzdCgnRGF0YWRvZ0FnZW50Jywge1xuICAgICAgYXBpVmVyc2lvbjogXCJkYXRhZG9naHEuY29tL3YxYWxwaGExXCIsXG4gICAgICBraW5kOiBcIkRhdGFkb2dBZ2VudFwiLFxuICAgICAgbWV0YWRhdGE6IHtcbiAgICAgICAgbmFtZTogXCJkYXRhZG9nLWFnZW50XCIsXG4gICAgICAgIG5hbWVzcGFjZTogXCJkYXRhZG9nXCJcbiAgICAgIH0sXG4gICAgICBzcGVjOiB7XG4gICAgICAgIGNyZWRlbnRpYWxzOiB7XG4gICAgICAgICAgYXBpS2V5OiBgRU5DW2ZpbGVAL21udC9zZWNyZXRzLyR7YXBwfV1gLFxuICAgICAgICAgIGFwcEtleTogYEVOQ1tmaWxlQC9tbnQvc2VjcmV0cy8ke2FwcH1dYCxcbiAgICAgICAgICB1c2VTZWNyZXRCYWNrZW5kOiB0cnVlXG4gICAgICAgIH0sXG4gICAgICAgIGFnZW50OiB7XG4gICAgICAgICAgZW52OiBERF9FTlYsXG4gICAgICAgICAgY29uZmlnOiB7XG4gICAgICAgICAgICB2b2x1bWVzOiBERF9WT0xVTUVTLFxuICAgICAgICAgICAgdm9sdW1lTW91bnRzOiBERF9WT0xVTUVfTU9VTlRTXG4gICAgICAgICAgfSxcbiAgICAgICAgICByYmFjOiB7XG4gICAgICAgICAgICBjcmVhdGU6IHRydWUsXG4gICAgICAgICAgICBzZXJ2aWNlQWNjb3VudE5hbWU6IHNlcnZpY2VBY2NvdW50TmFtZSxcbiAgICAgICAgICB9LFxuICAgICAgICAgIGltYWdlOiB7XG4gICAgICAgICAgICBuYW1lOiAnZ2NyLmlvL2RhdGFkb2docS9hZ2VudDpsYXRlc3QnXG4gICAgICAgICAgfSxcbiAgICAgICAgICBsb2c6IHtcbiAgICAgICAgICAgIGVuYWJsZWQ6IHRydWUsXG4gICAgICAgICAgICBsb2dzQ29uZmlnQ29udGFpbmVyQ29sbGVjdEFsbDogdHJ1ZVxuICAgICAgICAgIH0sXG4gICAgICAgICAgc3lzdGVtUHJvYmU6IHtcbiAgICAgICAgICAgIGVudjogRERfRU5WLFxuICAgICAgICAgICAgYnBmRGVidWdFbmFibGVkOiBmYWxzZSAvLyBlbmFibGVkIHdoZW4gYnVnIGlzIGZpeGVkXG4gICAgICAgICAgfSxcbiAgICAgICAgICBzZWN1cml0eToge1xuICAgICAgICAgICAgY29tcGxpYW5jZToge1xuICAgICAgICAgICAgICBlbmFibGVkOiBmYWxzZSAvLyBlbmFibGVkIHdoZW4gYnVnIGlzIGZpeGVkXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgcnVudGltZToge1xuICAgICAgICAgICAgICBlbmFibGVkOiBmYWxzZSAvLyBlbmFibGVkIHdoZW4gYnVnIGlzIGZpeGVkXG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSxcbiAgICAgICAgICBhcG06IHtcbiAgICAgICAgICAgIGVudjogRERfRU5WLFxuICAgICAgICAgICAgZW5hYmxlZDogZmFsc2UgLy8gZW5hYmxlIHdoZW4gYnVnIGlzIGZpeGVkXG4gICAgICAgICAgfSxcbiAgICAgICAgICBwcm9jZXNzOiB7XG4gICAgICAgICAgICBlbmFibGVkOiBmYWxzZSwgLy8gZW5hYmxlIHdoZW4gYnVnIGlzIGZpeGVkXG4gICAgICAgICAgICBwcm9jZXNzQ29sbGVjdGlvbkVuYWJsZWQ6IGZhbHNlXG4gICAgICAgICAgfSxcbiAgICAgICAgfSxcbiAgICAgICAgY2x1c3RlckFnZW50OiB7XG4gICAgICAgICAgaW1hZ2U6IHtcbiAgICAgICAgICAgIG5hbWU6ICdnY3IuaW8vZGF0YWRvZ2hxL2NsdXN0ZXItYWdlbnQ6bGF0ZXN0J1xuICAgICAgICAgIH0sXG4gICAgICAgICAgcmJhYzoge1xuICAgICAgICAgICAgY3JlYXRlOiB0cnVlLFxuICAgICAgICAgICAgc2VydmljZUFjY291bnROYW1lOiBzZXJ2aWNlQWNjb3VudE5hbWUsXG4gICAgICAgICAgfSxcbiAgICAgICAgICBjb25maWc6IHtcbiAgICAgICAgICAgIGVudjogRERfRU5WLFxuICAgICAgICAgICAgZXh0ZXJuYWxNZXRyaWNzOiB7XG4gICAgICAgICAgICAgIGVuYWJsZWQ6IHRydWVcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBhZG1pc3Npb25Db250cm9sbGVyOiB7XG4gICAgICAgICAgICAgIGVuYWJsZWQ6IHRydWVcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB2b2x1bWVzOiBERF9WT0xVTUVTLFxuICAgICAgICAgICAgdm9sdW1lTW91bnRzOiBERF9WT0xVTUVfTU9VTlRTXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICByZXR1cm4gcztcbiAgfVxufVxuIl19
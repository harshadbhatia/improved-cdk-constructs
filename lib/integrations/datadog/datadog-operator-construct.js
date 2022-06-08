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
                        secretName: props.apiKeySecret,
                        keyName: 'api-key'
                    },
                    appSecret: {
                        secretName: props.appKeySecret,
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGF0YWRvZy1vcGVyYXRvci1jb25zdHJ1Y3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJkYXRhZG9nLW9wZXJhdG9yLWNvbnN0cnVjdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxpREFBNEY7QUFDNUYsaURBQXFGO0FBQ3JGLHVFQUF3RDtBQUN4RCwyQ0FBdUM7QUFHdkMscURBQXNEO0FBR3RELE1BQWEsZUFBZ0IsU0FBUSxzQkFBUztJQUk1QyxZQUFZLEtBQWdCLEVBQUUsRUFBVSxFQUFFLEtBQXNDO1FBRTlFLEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFKbkIsNkJBQXdCLEdBQUcsT0FBTyxDQUFBO1FBS2hDLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxLQUFLLENBQUMsQ0FBQTtJQUVwQyxDQUFDO0lBRUQsc0JBQXNCLENBQUMsS0FBc0M7UUFFM0QsTUFBTSxLQUFLLEdBQWE7WUFDdEIsSUFBSSxFQUFFLGlCQUFpQjtZQUN2QixLQUFLLEVBQUUsa0JBQWtCO1lBQ3pCLFNBQVMsRUFBRSxTQUFTO1lBQ3BCLE9BQU8sRUFBRSxJQUFJLElBQUksQ0FBQyx3QkFBd0IsRUFBRTtZQUM1QyxPQUFPLEVBQUUsR0FBRyxJQUFJLENBQUMsd0JBQXdCLEVBQUU7WUFDM0MsT0FBTyxFQUFFLElBQUk7WUFDYixVQUFVLEVBQUUsNEJBQTRCO1lBQ3hDLFdBQVcsRUFBRSxrQ0FBa0MsSUFBSSxDQUFDLHdCQUF3QixFQUFFO1lBQzlFLGVBQWUsRUFBRSxJQUFJO1lBQ3JCLE1BQU0sRUFBRSxFQUFFO1NBQ1gsQ0FBQTtRQUVELGdCQUFnQjtRQUNoQixNQUFNLE9BQU8sR0FBRyxpQkFBTyxDQUFDLHFCQUFxQixDQUFDLElBQUksRUFBRSxHQUFHLEtBQUssQ0FBQyxXQUFXLEtBQUssRUFBRTtZQUM3RSxXQUFXLEVBQUUsS0FBSyxDQUFDLFdBQVk7WUFDL0IsY0FBYyxFQUFFLEtBQUssQ0FBQyxjQUFlO1lBQ3JDLHFCQUFxQixF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O29CQUNELFFBQVEsRUFBRTt3QkFDUixVQUFVLEVBQUU7NEJBQ1YsT0FBTyxFQUFFLEtBQUssQ0FBQyw0QkFBNEI7eUJBQzVDO3dCQUNELE9BQU8sRUFBRTs0QkFDUCxPQUFPLEVBQUUsS0FBSyxDQUFDLDRCQUE0Qjt5QkFDNUM7cUJBQ0Y7b0JBQ0QsR0FBRyxFQUFFO3dCQUNILEdBQUcsRUFBRSxNQUFNO3dCQUNYLE9BQU8sRUFBRSxLQUFLLENBQUMsMkJBQTJCO3FCQUMzQztvQkFDRCxPQUFPLEVBQUU7d0JBQ1AsT0FBTyxFQUFFLEtBQUs7d0JBQ2Qsd0JBQXdCLEVBQUUsS0FBSztxQkFDaEM7aUJBQ0Y7Z0JBQ0QsWUFBWSxFQUFFO29CQUNaLEtBQUssRUFBRTt3QkFDTCxJQUFJLEVBQUUsdUNBQXVDO3FCQUM5QztvQkFDRCxJQUFJLEVBQUU7d0JBQ0osTUFBTSxFQUFFLElBQUk7d0JBQ1osa0JBQWtCLEVBQUUsa0JBQWtCO3FCQUN2QztvQkFDRCxNQUFNLEVBQUU7d0JBQ04sR0FBRyxFQUFFLE1BQU07d0JBQ1gsZUFBZSxFQUFFOzRCQUNmLE9BQU8sRUFBRSxJQUFJO3lCQUNkO3dCQUNELG1CQUFtQixFQUFFOzRCQUNuQixPQUFPLEVBQUUsSUFBSTt5QkFDZDt3QkFDRCxPQUFPLEVBQUUsVUFBVTt3QkFDbkIsWUFBWSxFQUFFLGdCQUFnQjtxQkFDL0I7aUJBQ0Y7YUFDRjtTQUNGLENBQUMsQ0FBQztRQUVILE9BQU8sQ0FBQyxDQUFDO0lBQ1gsQ0FBQztDQUNGO0FBblNELDBDQW1TQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IENsdXN0ZXIsIElDbHVzdGVyLCBLdWJlcm5ldGVzTWFuaWZlc3QsIFNlcnZpY2VBY2NvdW50IH0gZnJvbSBcImF3cy1jZGstbGliL2F3cy1la3NcIjtcbmltcG9ydCB7IEVmZmVjdCwgT3BlbklkQ29ubmVjdFByb3ZpZGVyLCBQb2xpY3lTdGF0ZW1lbnQgfSBmcm9tIFwiYXdzLWNkay1saWIvYXdzLWlhbVwiO1xuaW1wb3J0IHsgU2VjcmV0IH0gZnJvbSBcImF3cy1jZGstbGliL2F3cy1zZWNyZXRzbWFuYWdlclwiO1xuaW1wb3J0IHsgQ29uc3RydWN0IH0gZnJvbSBcImNvbnN0cnVjdHNcIjtcbmltcG9ydCB7IEVLU0NoYXJ0IH0gZnJvbSBcIi4uLy4uLy4uL2ludGVyZmFjZXMvbGliL2Vrcy9pbnRlcmZhY2VzXCI7XG5pbXBvcnQgeyBEYXRhZG9nQVdTSW50ZWdyYXRpb25TdGFja1Byb3BzIH0gZnJvbSBcIi4uLy4uLy4uL2ludGVyZmFjZXMvbGliL2ludGVncmF0aW9ucy9kYXRhZG9nL2ludGVmYWNlc1wiO1xuaW1wb3J0IHsgSGVsbUNoYXJ0U3RhY2sgfSBmcm9tIFwiLi4vLi4vZWtzL2hlbG0tY2hhcnRcIjtcblxuXG5leHBvcnQgY2xhc3MgRGF0YWRvZ09wZXJhdG9yIGV4dGVuZHMgQ29uc3RydWN0IHtcblxuICBEQVRBRE9HX09QRVJBVE9SX1ZFUlNJT04gPSBcIjAuOC4wXCJcblxuICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nLCBwcm9wczogRGF0YWRvZ0FXU0ludGVncmF0aW9uU3RhY2tQcm9wcykge1xuXG4gICAgc3VwZXIoc2NvcGUsIGlkKTtcbiAgICB0aGlzLmluc3RhbGxEYXRhZG9nT3BlcmF0b3IocHJvcHMpXG5cbiAgfVxuXG4gIGluc3RhbGxEYXRhZG9nT3BlcmF0b3IocHJvcHM6IERhdGFkb2dBV1NJbnRlZ3JhdGlvblN0YWNrUHJvcHMpIHtcblxuICAgIGNvbnN0IGNoYXJ0OiBFS1NDaGFydCA9IHtcbiAgICAgIG5hbWU6IFwiRGF0YWRvZ09wZXJhdG9yXCIsXG4gICAgICBjaGFydDogXCJkYXRhZG9nLW9wZXJhdG9yXCIsXG4gICAgICBuYW1lc3BhY2U6IFwiZGF0YWRvZ1wiLFxuICAgICAgcmVsZWFzZTogYHYke3RoaXMuREFUQURPR19PUEVSQVRPUl9WRVJTSU9OfWAsXG4gICAgICB2ZXJzaW9uOiBgJHt0aGlzLkRBVEFET0dfT1BFUkFUT1JfVkVSU0lPTn1gLFxuICAgICAgZW5hYmxlZDogdHJ1ZSxcbiAgICAgIHJlcG9zaXRvcnk6IFwiaHR0cHM6Ly9oZWxtLmRhdGFkb2docS5jb21cIixcbiAgICAgIGRlc2NyaXB0aW9uOiBgRGF0YWRvZyBvcGVyYXRvciBpbnN0YWxsYXRpb24gdiR7dGhpcy5EQVRBRE9HX09QRVJBVE9SX1ZFUlNJT059YCxcbiAgICAgIGNyZWF0ZU5hbWVzcGFjZTogdHJ1ZSxcbiAgICAgIHZhbHVlczoge31cbiAgICB9XG5cbiAgICAvLyBDcmVhdGUgc2VjcmV0XG4gICAgY29uc3QgY2x1c3RlciA9IENsdXN0ZXIuZnJvbUNsdXN0ZXJBdHRyaWJ1dGVzKHRoaXMsIGAke3Byb3BzLmNsdXN0ZXJOYW1lfVJlZmAsIHtcbiAgICAgIGNsdXN0ZXJOYW1lOiBwcm9wcy5jbHVzdGVyTmFtZSEsXG4gICAgICBrdWJlY3RsUm9sZUFybjogcHJvcHMua3ViZWN0bFJvbGVBcm4hLFxuICAgICAgb3BlbklkQ29ubmVjdFByb3ZpZGVyOiBPcGVuSWRDb25uZWN0UHJvdmlkZXIuZnJvbU9wZW5JZENvbm5lY3RQcm92aWRlckFybih0aGlzLCAnT3BlbklEQ29ubmVjdFByb3ZpZGVyJywgcHJvcHMub3BlbklkQ29ubmVjdFByb3ZpZGVyQXJuISksXG4gICAgfSk7XG5cbiAgICBjb25zdCBoID0gbmV3IEhlbG1DaGFydFN0YWNrKHRoaXMsICdEYXRhZG9nT3BlcmF0b3InLCBjaGFydCwgcHJvcHMuY2x1c3Rlck5hbWUhLCBwcm9wcy5rdWJlY3RsUm9sZUFybiEsIHtcbiAgICAgIHN0YWNrTmFtZTogJ0RhdGFkb2dPcGVyYXRvckhlbG0nLFxuICAgICAgZW52OiBwcm9wcy5lbnYsXG4gICAgICBzeW50aGVzaXplcjogcHJvcHMub3BlcmF0b3JTeW50aGVzaXplclxuICAgIH0pO1xuICAgIC8vIFRoaXMgaXMgaWRlYWwgd2F5IHdoZXJlIHNlY3JldCBpcyBhdHRhY2hlZCBhdXRvbWF0aWNhbGx5XG4gICAgaWYgKHByb3BzLnVzZVNlY3JldEZyb21DU0kpIHtcbiAgICAgIGNvbnN0IHNwYyA9IHRoaXMuY3JlYXRlU2VjcmV0UHJvdmlkZXJDbGFzcyhwcm9wcywgY2x1c3Rlcik7XG4gICAgICBjb25zdCBzYSA9IHRoaXMuY3JlYXRlU2VydmljZUFjY291bnQocHJvcHMsIGNsdXN0ZXIpO1xuICAgICAgLy8gQ3JlYXRlIGRlcGVuZGVuY3kgc28gd2hlbiBzZWNyZXQgcHJvdmlkZXIgY2xhc3MgaXMgY3JlYXRlZCBpdCBjYW4gYmUgYWNjZXNzZWQgYnkgU0EuXG4gICAgICBzYS5ub2RlLmFkZERlcGVuZGVuY3koc3BjKTtcblxuICAgICAgLy8gRGVwZW5kZW5jeSBvbiBoZWxtIGNoYXJ0XG4gICAgICBzcGMubm9kZS5hZGREZXBlbmRlbmN5KGgpXG5cbiAgICAgIGNvbnN0IGEgPSB0aGlzLmluc3RhbGxEYXRhZG9nQWdlbnRXaXRoVm9sdW1lTW91bnRzKGNsdXN0ZXIsIHByb3BzLmFwaUtleVNlY3JldCwgcHJvcHMuYXBwS2V5U2VjcmV0ISlcbiAgICAgIGEubm9kZS5hZGREZXBlbmRlbmN5KGgpXG5cbiAgICB9IGVsc2Uge1xuICAgICAgLy8gVW50aWwgZGF0YWRvZyBvcGVyYXRvciBpcyBmaXhlZCB3ZSBzaW1wbHkgdXNlIHRoaXNcbiAgICAgIGNvbnN0IGEgPSB0aGlzLmluc3RhbGxEYXRhZG9nQWdlbnRXaXRoRXhpc3RpbmdTZWNyZXQocHJvcHMsIGNsdXN0ZXIpXG4gICAgICBhLm5vZGUuYWRkRGVwZW5kZW5jeShoKVxuICAgIH1cblxuICB9XG4gIGNyZWF0ZVNlcnZpY2VBY2NvdW50KHByb3BzOiBEYXRhZG9nQVdTSW50ZWdyYXRpb25TdGFja1Byb3BzLCBjbHVzdGVyOiBJQ2x1c3Rlcik6IFNlcnZpY2VBY2NvdW50IHtcblxuICAgIGNvbnN0IGFwaVNlY3JldCA9IFNlY3JldC5mcm9tU2VjcmV0TmFtZVYyKHRoaXMsICdEYXRhZG9nQXBpU2VjcmV0JywgcHJvcHMuYXBpS2V5U2VjcmV0KTtcbiAgICBjb25zdCBhcHBTZWNyZXQgPSBTZWNyZXQuZnJvbVNlY3JldE5hbWVWMih0aGlzLCAnRGF0YWRvZ0FwcFNlY3JldCcsIHByb3BzLmFwcEtleVNlY3JldCEpO1xuXG4gICAgY29uc3QgcyA9IGNsdXN0ZXIuYWRkU2VydmljZUFjY291bnQoXCJEYXRhZG9nU2VydmljZUFjY291bnRcIiwgeyBuYW1lOiBcImRhdGFkb2ctc2FcIiwgbmFtZXNwYWNlOiBcImRhdGFkb2dcIiB9KVxuICAgIHMuYWRkVG9QcmluY2lwYWxQb2xpY3kobmV3IFBvbGljeVN0YXRlbWVudCh7XG4gICAgICBzaWQ6IFwiQWxsb3dHZXRTZWNyZXRWYWx1ZUZvckVLU0RhdGFkb2dcIixcbiAgICAgIGFjdGlvbnM6IFtcbiAgICAgICAgXCJzZWNyZXRzbWFuYWdlcjpHZXRTZWNyZXRWYWx1ZVwiLFxuICAgICAgICBcInNlY3JldHNtYW5hZ2VyOkRlc2NyaWJlU2VjcmV0XCJcbiAgICAgIF0sXG4gICAgICByZXNvdXJjZXM6IFtgJHthcGlTZWNyZXQuc2VjcmV0QXJufS0qYCwgYCR7YXBwU2VjcmV0LnNlY3JldEFybn0tKmBdLFxuICAgICAgZWZmZWN0OiBFZmZlY3QuQUxMT1csXG4gICAgfSkpXG5cbiAgICByZXR1cm4gcztcbiAgfVxuXG4gIGNyZWF0ZVNlY3JldFByb3ZpZGVyQ2xhc3MocHJvcHM6IERhdGFkb2dBV1NJbnRlZ3JhdGlvblN0YWNrUHJvcHMsIGNsdXN0ZXI6IElDbHVzdGVyKTogS3ViZXJuZXRlc01hbmlmZXN0IHtcbiAgICBjb25zdCBzID0gY2x1c3Rlci5hZGRNYW5pZmVzdCgnRGF0YWRvZ1NlY3JldFByb3ZpZGVyJywge1xuICAgICAgYXBpVmVyc2lvbjogXCJzZWNyZXRzLXN0b3JlLmNzaS54LWs4cy5pby92MVwiLFxuICAgICAga2luZDogXCJTZWNyZXRQcm92aWRlckNsYXNzXCIsXG4gICAgICBtZXRhZGF0YToge1xuICAgICAgICBuYW1lOiBcImRhdGFkb2ctc2VjcmV0LXByb3ZpZGVyXCIsXG4gICAgICAgIG5hbWVzcGFjZTogXCJkYXRhZG9nXCJcbiAgICAgIH0sXG4gICAgICBzcGVjOiB7XG4gICAgICAgIHByb3ZpZGVyOiBcImF3c1wiLFxuICAgICAgICBwYXJhbWV0ZXJzOiB7XG4gICAgICAgICAgb2JqZWN0czogSlNPTi5zdHJpbmdpZnkoW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBvYmplY3ROYW1lOiBwcm9wcy5hcGlLZXlTZWNyZXQsXG4gICAgICAgICAgICAgIG9iamVjdFR5cGU6IFwic2VjcmV0c21hbmFnZXJcIixcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIG9iamVjdE5hbWU6IHByb3BzLmFwcEtleVNlY3JldCEsXG4gICAgICAgICAgICAgIG9iamVjdFR5cGU6IFwic2VjcmV0c21hbmFnZXJcIixcbiAgICAgICAgICAgIH1cbiAgICAgICAgICBdKVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICByZXR1cm4gcztcbiAgfVxuXG4gIGluc3RhbGxEYXRhZG9nQWdlbnRXaXRoRXhpc3RpbmdTZWNyZXQocHJvcHM6IERhdGFkb2dBV1NJbnRlZ3JhdGlvblN0YWNrUHJvcHMsIGNsdXN0ZXI6IElDbHVzdGVyKTogS3ViZXJuZXRlc01hbmlmZXN0IHtcblxuICAgIGNvbnN0IHMgPSBjbHVzdGVyLmFkZE1hbmlmZXN0KCdEYXRhZG9nQWdlbnQnLCB7XG4gICAgICBhcGlWZXJzaW9uOiBcImRhdGFkb2docS5jb20vdjFhbHBoYTFcIixcbiAgICAgIGtpbmQ6IFwiRGF0YWRvZ0FnZW50XCIsXG4gICAgICBtZXRhZGF0YToge1xuICAgICAgICBuYW1lOiBcImRhdGFkb2ctYWdlbnRcIixcbiAgICAgICAgbmFtZXNwYWNlOiBcImRhdGFkb2dcIlxuICAgICAgfSxcbiAgICAgIHNwZWM6IHtcbiAgICAgICAgY3JlZGVudGlhbHM6IHtcbiAgICAgICAgICBhcGlTZWNyZXQ6IHtcbiAgICAgICAgICAgIHNlY3JldE5hbWU6IHByb3BzLmFwaUtleVNlY3JldCxcbiAgICAgICAgICAgIGtleU5hbWU6ICdhcGkta2V5J1xuICAgICAgICAgIH0sXG4gICAgICAgICAgYXBwU2VjcmV0OiB7XG4gICAgICAgICAgICBzZWNyZXROYW1lOiBwcm9wcy5hcHBLZXlTZWNyZXQhLFxuICAgICAgICAgICAga2V5TmFtZTogJ2FwcC1rZXknXG4gICAgICAgICAgfSxcbiAgICAgICAgfSxcbiAgICAgICAgYWdlbnQ6IHtcbiAgICAgICAgICBpbWFnZToge1xuICAgICAgICAgICAgbmFtZTogJ2djci5pby9kYXRhZG9naHEvYWdlbnQ6bGF0ZXN0J1xuICAgICAgICAgIH0sXG4gICAgICAgICAgbG9nOiB7XG4gICAgICAgICAgICBlbmFibGVkOiB0cnVlLFxuICAgICAgICAgICAgbG9nc0NvbmZpZ0NvbnRhaW5lckNvbGxlY3RBbGw6IHRydWVcbiAgICAgICAgICB9LFxuICAgICAgICAgIHN5c3RlbVByb2JlOiB7XG4gICAgICAgICAgICBicGZEZWJ1Z0VuYWJsZWQ6IGZhbHNlIC8vIGVuYWJsZWQgd2hlbiBidWcgaXMgZml4ZWRcbiAgICAgICAgICB9LFxuICAgICAgICAgIHNlY3VyaXR5OiB7XG4gICAgICAgICAgICBjb21wbGlhbmNlOiB7XG4gICAgICAgICAgICAgIGVuYWJsZWQ6IGZhbHNlIC8vIGVuYWJsZWQgd2hlbiBidWcgaXMgZml4ZWRcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBydW50aW1lOiB7XG4gICAgICAgICAgICAgIGVuYWJsZWQ6IGZhbHNlIC8vIGVuYWJsZWQgd2hlbiBidWcgaXMgZml4ZWRcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9LFxuICAgICAgICAgIGFwbToge1xuICAgICAgICAgICAgZW5hYmxlZDogZmFsc2UgLy8gZW5hYmxlIHdoZW4gYnVnIGlzIGZpeGVkXG4gICAgICAgICAgfSxcbiAgICAgICAgICBwcm9jZXNzOiB7XG4gICAgICAgICAgICBlbmFibGVkOiBmYWxzZSwgLy8gZW5hYmxlIHdoZW4gYnVnIGlzIGZpeGVkXG4gICAgICAgICAgICBwcm9jZXNzQ29sbGVjdGlvbkVuYWJsZWQ6IGZhbHNlXG4gICAgICAgICAgfSxcbiAgICAgICAgfSxcbiAgICAgICAgY2x1c3RlckFnZW50OiB7XG4gICAgICAgICAgaW1hZ2U6IHtcbiAgICAgICAgICAgIG5hbWU6ICdnY3IuaW8vZGF0YWRvZ2hxL2NsdXN0ZXItYWdlbnQ6bGF0ZXN0J1xuICAgICAgICAgIH0sXG4gICAgICAgICAgY29uZmlnOiB7XG4gICAgICAgICAgICBleHRlcm5hbE1ldHJpY3M6IHtcbiAgICAgICAgICAgICAgZW5hYmxlZDogdHJ1ZVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGFkbWlzc2lvbkNvbnRyb2xsZXI6IHtcbiAgICAgICAgICAgICAgZW5hYmxlZDogdHJ1ZVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcblxuICAgIHJldHVybiBzO1xuXG4gIH1cblxuXG4gIGluc3RhbGxEYXRhZG9nQWdlbnRXaXRoVm9sdW1lTW91bnRzKGNsdXN0ZXI6IElDbHVzdGVyLCBhcGlLZXk6IHN0cmluZywgYXBwS2V5OiBzdHJpbmcpOiBLdWJlcm5ldGVzTWFuaWZlc3Qge1xuXG4gICAgY29uc3QgYXBpID0gYXBpS2V5LnJlcGxhY2UoXCIvXCIsIFwiX1wiKVxuICAgIGNvbnN0IGFwcCA9IGFwcEtleS5yZXBsYWNlKFwiL1wiLCBcIl9cIilcbiAgICBjb25zdCBzZXJ2aWNlQWNjb3VudE5hbWUgPSAnZGF0YWRvZy1zYSdcblxuICAgIGNvbnN0IEREX0VOViA9IFtcbiAgICAgIHtcbiAgICAgICAgbmFtZTogXCJERF9BUElfS0VZXCIsXG4gICAgICAgIHZhbHVlOiBgRU5DW2ZpbGVAL21udC9zZWNyZXRzLyR7YXBpfV1gLFxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgbmFtZTogXCJERF9BUFBfS0VZXCIsXG4gICAgICAgIHZhbHVlOiBgRU5DW2ZpbGVAL21udC9zZWNyZXRzLyR7YXBwfV1gLFxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgbmFtZTogXCJERF9TRUNSRVRfQkFDS0VORF9DT01NQU5EXCIsXG4gICAgICAgIHZhbHVlOiAnL3JlYWRzZWNyZXRfbXVsdGlwbGVfcHJvdmlkZXJzLnNoJyxcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIG5hbWU6IFwiRERfU0VDUkVUX0JBQ0tFTkRfQVJHVU1FTlRTXCIsXG4gICAgICAgIHZhbHVlOiAnL21udC9zZWNyZXRzJyxcbiAgICAgIH0sXG4gICAgXVxuXG4gICAgY29uc3QgRERfVk9MVU1FUyA9IFt7XG4gICAgICBuYW1lOiBcInNlY3JldHMtc3RvcmUtaW5saW5lXCIsXG4gICAgICBjc2k6IHtcbiAgICAgICAgZHJpdmVyOiBcInNlY3JldHMtc3RvcmUuY3NpLms4cy5pb1wiLFxuICAgICAgICByZWFkT25seTogdHJ1ZSxcbiAgICAgICAgdm9sdW1lQXR0cmlidXRlczoge1xuICAgICAgICAgIHNlY3JldFByb3ZpZGVyQ2xhc3M6ICdkYXRhZG9nLXNlY3JldC1wcm92aWRlcidcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1dXG5cbiAgICBjb25zdCBERF9WT0xVTUVfTU9VTlRTID0gW3tcbiAgICAgIG5hbWU6IFwic2VjcmV0cy1zdG9yZS1pbmxpbmVcIixcbiAgICAgIG1vdW50UGF0aDogXCIvbW50L3NlY3JldHMvXCIsXG4gICAgICByZWFkT25seTogdHJ1ZVxuICAgIH1dXG5cbiAgICBjb25zdCBzID0gY2x1c3Rlci5hZGRNYW5pZmVzdCgnRGF0YWRvZ0FnZW50Jywge1xuICAgICAgYXBpVmVyc2lvbjogXCJkYXRhZG9naHEuY29tL3YxYWxwaGExXCIsXG4gICAgICBraW5kOiBcIkRhdGFkb2dBZ2VudFwiLFxuICAgICAgbWV0YWRhdGE6IHtcbiAgICAgICAgbmFtZTogXCJkYXRhZG9nLWFnZW50XCIsXG4gICAgICAgIG5hbWVzcGFjZTogXCJkYXRhZG9nXCJcbiAgICAgIH0sXG4gICAgICBzcGVjOiB7XG4gICAgICAgIGNyZWRlbnRpYWxzOiB7XG4gICAgICAgICAgYXBpS2V5OiBgRU5DW2ZpbGVAL21udC9zZWNyZXRzLyR7YXBwfV1gLFxuICAgICAgICAgIGFwcEtleTogYEVOQ1tmaWxlQC9tbnQvc2VjcmV0cy8ke2FwcH1dYCxcbiAgICAgICAgICB1c2VTZWNyZXRCYWNrZW5kOiB0cnVlXG4gICAgICAgIH0sXG4gICAgICAgIGFnZW50OiB7XG4gICAgICAgICAgZW52OiBERF9FTlYsXG4gICAgICAgICAgY29uZmlnOiB7XG4gICAgICAgICAgICB2b2x1bWVzOiBERF9WT0xVTUVTLFxuICAgICAgICAgICAgdm9sdW1lTW91bnRzOiBERF9WT0xVTUVfTU9VTlRTXG4gICAgICAgICAgfSxcbiAgICAgICAgICByYmFjOiB7XG4gICAgICAgICAgICBjcmVhdGU6IHRydWUsXG4gICAgICAgICAgICBzZXJ2aWNlQWNjb3VudE5hbWU6IHNlcnZpY2VBY2NvdW50TmFtZSxcbiAgICAgICAgICB9LFxuICAgICAgICAgIGltYWdlOiB7XG4gICAgICAgICAgICBuYW1lOiAnZ2NyLmlvL2RhdGFkb2docS9hZ2VudDpsYXRlc3QnXG4gICAgICAgICAgfSxcbiAgICAgICAgICBsb2c6IHtcbiAgICAgICAgICAgIGVuYWJsZWQ6IHRydWUsXG4gICAgICAgICAgICBsb2dzQ29uZmlnQ29udGFpbmVyQ29sbGVjdEFsbDogdHJ1ZVxuICAgICAgICAgIH0sXG4gICAgICAgICAgc3lzdGVtUHJvYmU6IHtcbiAgICAgICAgICAgIGVudjogRERfRU5WLFxuICAgICAgICAgICAgYnBmRGVidWdFbmFibGVkOiBmYWxzZSAvLyBlbmFibGVkIHdoZW4gYnVnIGlzIGZpeGVkXG4gICAgICAgICAgfSxcbiAgICAgICAgICBzZWN1cml0eToge1xuICAgICAgICAgICAgY29tcGxpYW5jZToge1xuICAgICAgICAgICAgICBlbmFibGVkOiBmYWxzZSAvLyBlbmFibGVkIHdoZW4gYnVnIGlzIGZpeGVkXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgcnVudGltZToge1xuICAgICAgICAgICAgICBlbmFibGVkOiBmYWxzZSAvLyBlbmFibGVkIHdoZW4gYnVnIGlzIGZpeGVkXG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSxcbiAgICAgICAgICBhcG06IHtcbiAgICAgICAgICAgIGVudjogRERfRU5WLFxuICAgICAgICAgICAgZW5hYmxlZDogZmFsc2UgLy8gZW5hYmxlIHdoZW4gYnVnIGlzIGZpeGVkXG4gICAgICAgICAgfSxcbiAgICAgICAgICBwcm9jZXNzOiB7XG4gICAgICAgICAgICBlbmFibGVkOiBmYWxzZSwgLy8gZW5hYmxlIHdoZW4gYnVnIGlzIGZpeGVkXG4gICAgICAgICAgICBwcm9jZXNzQ29sbGVjdGlvbkVuYWJsZWQ6IGZhbHNlXG4gICAgICAgICAgfSxcbiAgICAgICAgfSxcbiAgICAgICAgY2x1c3RlckFnZW50OiB7XG4gICAgICAgICAgaW1hZ2U6IHtcbiAgICAgICAgICAgIG5hbWU6ICdnY3IuaW8vZGF0YWRvZ2hxL2NsdXN0ZXItYWdlbnQ6bGF0ZXN0J1xuICAgICAgICAgIH0sXG4gICAgICAgICAgcmJhYzoge1xuICAgICAgICAgICAgY3JlYXRlOiB0cnVlLFxuICAgICAgICAgICAgc2VydmljZUFjY291bnROYW1lOiBzZXJ2aWNlQWNjb3VudE5hbWUsXG4gICAgICAgICAgfSxcbiAgICAgICAgICBjb25maWc6IHtcbiAgICAgICAgICAgIGVudjogRERfRU5WLFxuICAgICAgICAgICAgZXh0ZXJuYWxNZXRyaWNzOiB7XG4gICAgICAgICAgICAgIGVuYWJsZWQ6IHRydWVcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBhZG1pc3Npb25Db250cm9sbGVyOiB7XG4gICAgICAgICAgICAgIGVuYWJsZWQ6IHRydWVcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB2b2x1bWVzOiBERF9WT0xVTUVTLFxuICAgICAgICAgICAgdm9sdW1lTW91bnRzOiBERF9WT0xVTUVfTU9VTlRTXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICByZXR1cm4gcztcbiAgfVxufVxuIl19
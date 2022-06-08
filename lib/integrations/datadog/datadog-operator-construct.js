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
            const spc = this.createSecretProviderClass(cluster);
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
    createSecretProviderClass(cluster) {
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
                            objectName: "/account/datadog/api-key",
                            objectType: "secretsmanager",
                        },
                        {
                            objectName: "/account/datadog/app-key",
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGF0YWRvZy1vcGVyYXRvci1jb25zdHJ1Y3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJkYXRhZG9nLW9wZXJhdG9yLWNvbnN0cnVjdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxpREFBNEY7QUFDNUYsaURBQXFGO0FBQ3JGLHVFQUF3RDtBQUN4RCwyQ0FBdUM7QUFHdkMscURBQXNEO0FBR3RELE1BQWEsZUFBZ0IsU0FBUSxzQkFBUztJQUk1QyxZQUFZLEtBQWdCLEVBQUUsRUFBVSxFQUFFLEtBQXNDO1FBRTlFLEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFKbkIsNkJBQXdCLEdBQUcsT0FBTyxDQUFBO1FBS2hDLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxLQUFLLENBQUMsQ0FBQTtJQUVwQyxDQUFDO0lBRUQsc0JBQXNCLENBQUMsS0FBc0M7UUFFM0QsTUFBTSxLQUFLLEdBQWE7WUFDdEIsSUFBSSxFQUFFLGlCQUFpQjtZQUN2QixLQUFLLEVBQUUsa0JBQWtCO1lBQ3pCLFNBQVMsRUFBRSxTQUFTO1lBQ3BCLE9BQU8sRUFBRSxJQUFJLElBQUksQ0FBQyx3QkFBd0IsRUFBRTtZQUM1QyxPQUFPLEVBQUUsR0FBRyxJQUFJLENBQUMsd0JBQXdCLEVBQUU7WUFDM0MsT0FBTyxFQUFFLElBQUk7WUFDYixVQUFVLEVBQUUsNEJBQTRCO1lBQ3hDLFdBQVcsRUFBRSxrQ0FBa0MsSUFBSSxDQUFDLHdCQUF3QixFQUFFO1lBQzlFLGVBQWUsRUFBRSxJQUFJO1lBQ3JCLE1BQU0sRUFBRSxFQUFFO1NBQ1gsQ0FBQTtRQUVELGdCQUFnQjtRQUNoQixNQUFNLE9BQU8sR0FBRyxpQkFBTyxDQUFDLHFCQUFxQixDQUFDLElBQUksRUFBRSxHQUFHLEtBQUssQ0FBQyxXQUFXLEtBQUssRUFBRTtZQUM3RSxXQUFXLEVBQUUsS0FBSyxDQUFDLFdBQVk7WUFDL0IsY0FBYyxFQUFFLEtBQUssQ0FBQyxjQUFlO1lBQ3JDLHFCQUFxQixF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VixPQUFPLEVBQUUsS0FBSyxDQUFDLDRCQUE0Qjt5QkFDNUM7d0JBQ0QsT0FBTyxFQUFFOzRCQUNQLE9BQU8sRUFBRSxLQUFLLENBQUMsNEJBQTRCO3lCQUM1QztxQkFDRjtvQkFDRCxHQUFHLEVBQUU7d0JBQ0gsR0FBRyxFQUFFLE1BQU07d0JBQ1gsT0FBTyxFQUFFLEtBQUssQ0FBQywyQkFBMkI7cUJBQzNDO29CQUNELE9BQU8sRUFBRTt3QkFDUCxPQUFPLEVBQUUsS0FBSzt3QkFDZCx3QkFBd0IsRUFBRSxLQUFLO3FCQUNoQztpQkFDRjtnQkFDRCxZQUFZLEVBQUU7b0JBQ1osS0FBSyxFQUFFO3dCQUNMLElBQUksRUFBRSx1Q0FBdUM7cUJBQzlDO29CQUNELElBQUksRUFBRTt3QkFDSixNQUFNLEVBQUUsSUFBSTt3QkFDWixrQkFBa0IsRUFBRSxrQkFBa0I7cUJBQ3ZDO29CQUNELE1BQU0sRUFBRTt3QkFDTixHQUFHLEVBQUUsTUFBTTt3QkFDWCxlQUFlLEVBQUU7NEJBQ2YsT0FBTyxFQUFFLElBQUk7eUJBQ2Q7d0JBQ0QsbUJBQW1CLEVBQUU7NEJBQ25CLE9BQU8sRUFBRSxJQUFJO3lCQUNkO3dCQUNELE9BQU8sRUFBRSxVQUFVO3dCQUNuQixZQUFZLEVBQUUsZ0JBQWdCO3FCQUMvQjtpQkFDRjthQUNGO1NBQ0YsQ0FBQyxDQUFDO1FBRUgsT0FBTyxDQUFDLENBQUM7SUFDWCxDQUFDO0NBQ0Y7QUFuU0QsMENBbVNDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQ2x1c3RlciwgSUNsdXN0ZXIsIEt1YmVybmV0ZXNNYW5pZmVzdCwgU2VydmljZUFjY291bnQgfSBmcm9tIFwiYXdzLWNkay1saWIvYXdzLWVrc1wiO1xuaW1wb3J0IHsgRWZmZWN0LCBPcGVuSWRDb25uZWN0UHJvdmlkZXIsIFBvbGljeVN0YXRlbWVudCB9IGZyb20gXCJhd3MtY2RrLWxpYi9hd3MtaWFtXCI7XG5pbXBvcnQgeyBTZWNyZXQgfSBmcm9tIFwiYXdzLWNkay1saWIvYXdzLXNlY3JldHNtYW5hZ2VyXCI7XG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tIFwiY29uc3RydWN0c1wiO1xuaW1wb3J0IHsgRUtTQ2hhcnQgfSBmcm9tIFwiLi4vLi4vLi4vaW50ZXJmYWNlcy9saWIvZWtzL2ludGVyZmFjZXNcIjtcbmltcG9ydCB7IERhdGFkb2dBV1NJbnRlZ3JhdGlvblN0YWNrUHJvcHMgfSBmcm9tIFwiLi4vLi4vLi4vaW50ZXJmYWNlcy9saWIvaW50ZWdyYXRpb25zL2RhdGFkb2cvaW50ZWZhY2VzXCI7XG5pbXBvcnQgeyBIZWxtQ2hhcnRTdGFjayB9IGZyb20gXCIuLi8uLi9la3MvaGVsbS1jaGFydFwiO1xuXG5cbmV4cG9ydCBjbGFzcyBEYXRhZG9nT3BlcmF0b3IgZXh0ZW5kcyBDb25zdHJ1Y3Qge1xuXG4gIERBVEFET0dfT1BFUkFUT1JfVkVSU0lPTiA9IFwiMC44LjBcIlxuXG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcsIHByb3BzOiBEYXRhZG9nQVdTSW50ZWdyYXRpb25TdGFja1Byb3BzKSB7XG5cbiAgICBzdXBlcihzY29wZSwgaWQpO1xuICAgIHRoaXMuaW5zdGFsbERhdGFkb2dPcGVyYXRvcihwcm9wcylcblxuICB9XG5cbiAgaW5zdGFsbERhdGFkb2dPcGVyYXRvcihwcm9wczogRGF0YWRvZ0FXU0ludGVncmF0aW9uU3RhY2tQcm9wcykge1xuXG4gICAgY29uc3QgY2hhcnQ6IEVLU0NoYXJ0ID0ge1xuICAgICAgbmFtZTogXCJEYXRhZG9nT3BlcmF0b3JcIixcbiAgICAgIGNoYXJ0OiBcImRhdGFkb2ctb3BlcmF0b3JcIixcbiAgICAgIG5hbWVzcGFjZTogXCJkYXRhZG9nXCIsXG4gICAgICByZWxlYXNlOiBgdiR7dGhpcy5EQVRBRE9HX09QRVJBVE9SX1ZFUlNJT059YCxcbiAgICAgIHZlcnNpb246IGAke3RoaXMuREFUQURPR19PUEVSQVRPUl9WRVJTSU9OfWAsXG4gICAgICBlbmFibGVkOiB0cnVlLFxuICAgICAgcmVwb3NpdG9yeTogXCJodHRwczovL2hlbG0uZGF0YWRvZ2hxLmNvbVwiLFxuICAgICAgZGVzY3JpcHRpb246IGBEYXRhZG9nIG9wZXJhdG9yIGluc3RhbGxhdGlvbiB2JHt0aGlzLkRBVEFET0dfT1BFUkFUT1JfVkVSU0lPTn1gLFxuICAgICAgY3JlYXRlTmFtZXNwYWNlOiB0cnVlLFxuICAgICAgdmFsdWVzOiB7fVxuICAgIH1cblxuICAgIC8vIENyZWF0ZSBzZWNyZXRcbiAgICBjb25zdCBjbHVzdGVyID0gQ2x1c3Rlci5mcm9tQ2x1c3RlckF0dHJpYnV0ZXModGhpcywgYCR7cHJvcHMuY2x1c3Rlck5hbWV9UmVmYCwge1xuICAgICAgY2x1c3Rlck5hbWU6IHByb3BzLmNsdXN0ZXJOYW1lISxcbiAgICAgIGt1YmVjdGxSb2xlQXJuOiBwcm9wcy5rdWJlY3RsUm9sZUFybiEsXG4gICAgICBvcGVuSWRDb25uZWN0UHJvdmlkZXI6IE9wZW5JZENvbm5lY3RQcm92aWRlci5mcm9tT3BlbklkQ29ubmVjdFByb3ZpZGVyQXJuKHRoaXMsICdPcGVuSURDb25uZWN0UHJvdmlkZXInLCBwcm9wcy5vcGVuSWRDb25uZWN0UHJvdmlkZXJBcm4hKSxcbiAgICB9KTtcblxuICAgIGNvbnN0IGggPSBuZXcgSGVsbUNoYXJ0U3RhY2sodGhpcywgJ0RhdGFkb2dPcGVyYXRvcicsIGNoYXJ0LCBwcm9wcy5jbHVzdGVyTmFtZSEsIHByb3BzLmt1YmVjdGxSb2xlQXJuISwge1xuICAgICAgc3RhY2tOYW1lOiAnRGF0YWRvZ09wZXJhdG9ySGVsbScsXG4gICAgICBlbnY6IHByb3BzLmVudixcbiAgICAgIHN5bnRoZXNpemVyOiBwcm9wcy5vcGVyYXRvclN5bnRoZXNpemVyXG4gICAgfSk7XG4gICAgLy8gVGhpcyBpcyBpZGVhbCB3YXkgd2hlcmUgc2VjcmV0IGlzIGF0dGFjaGVkIGF1dG9tYXRpY2FsbHlcbiAgICBpZiAocHJvcHMudXNlU2VjcmV0RnJvbUNTSSkge1xuICAgICAgY29uc3Qgc3BjID0gdGhpcy5jcmVhdGVTZWNyZXRQcm92aWRlckNsYXNzKGNsdXN0ZXIpO1xuICAgICAgY29uc3Qgc2EgPSB0aGlzLmNyZWF0ZVNlcnZpY2VBY2NvdW50KHByb3BzLCBjbHVzdGVyKTtcbiAgICAgIC8vIENyZWF0ZSBkZXBlbmRlbmN5IHNvIHdoZW4gc2VjcmV0IHByb3ZpZGVyIGNsYXNzIGlzIGNyZWF0ZWQgaXQgY2FuIGJlIGFjY2Vzc2VkIGJ5IFNBLlxuICAgICAgc2Eubm9kZS5hZGREZXBlbmRlbmN5KHNwYyk7XG5cbiAgICAgIC8vIERlcGVuZGVuY3kgb24gaGVsbSBjaGFydFxuICAgICAgc3BjLm5vZGUuYWRkRGVwZW5kZW5jeShoKVxuXG4gICAgICBjb25zdCBhID0gdGhpcy5pbnN0YWxsRGF0YWRvZ0FnZW50V2l0aFZvbHVtZU1vdW50cyhjbHVzdGVyLCBwcm9wcy5hcGlLZXlTZWNyZXQsIHByb3BzLmFwcEtleVNlY3JldCEpXG4gICAgICBhLm5vZGUuYWRkRGVwZW5kZW5jeShoKVxuXG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIFVudGlsIGRhdGFkb2cgb3BlcmF0b3IgaXMgZml4ZWQgd2Ugc2ltcGx5IHVzZSB0aGlzXG4gICAgICBjb25zdCBhID0gdGhpcy5pbnN0YWxsRGF0YWRvZ0FnZW50V2l0aEV4aXN0aW5nU2VjcmV0KHByb3BzLCBjbHVzdGVyKVxuICAgICAgYS5ub2RlLmFkZERlcGVuZGVuY3koaClcbiAgICB9XG5cbiAgfVxuICBjcmVhdGVTZXJ2aWNlQWNjb3VudChwcm9wczogRGF0YWRvZ0FXU0ludGVncmF0aW9uU3RhY2tQcm9wcywgY2x1c3RlcjogSUNsdXN0ZXIpOiBTZXJ2aWNlQWNjb3VudCB7XG5cbiAgICBjb25zdCBhcGlTZWNyZXQgPSBTZWNyZXQuZnJvbVNlY3JldE5hbWVWMih0aGlzLCAnRGF0YWRvZ0FwaVNlY3JldCcsIHByb3BzLmFwaUtleVNlY3JldCk7XG4gICAgY29uc3QgYXBwU2VjcmV0ID0gU2VjcmV0LmZyb21TZWNyZXROYW1lVjIodGhpcywgJ0RhdGFkb2dBcHBTZWNyZXQnLCBwcm9wcy5hcHBLZXlTZWNyZXQhKTtcblxuICAgIGNvbnN0IHMgPSBjbHVzdGVyLmFkZFNlcnZpY2VBY2NvdW50KFwiRGF0YWRvZ1NlcnZpY2VBY2NvdW50XCIsIHsgbmFtZTogXCJkYXRhZG9nLXNhXCIsIG5hbWVzcGFjZTogXCJkYXRhZG9nXCIgfSlcbiAgICBzLmFkZFRvUHJpbmNpcGFsUG9saWN5KG5ldyBQb2xpY3lTdGF0ZW1lbnQoe1xuICAgICAgc2lkOiBcIkFsbG93R2V0U2VjcmV0VmFsdWVGb3JFS1NEYXRhZG9nXCIsXG4gICAgICBhY3Rpb25zOiBbXG4gICAgICAgIFwic2VjcmV0c21hbmFnZXI6R2V0U2VjcmV0VmFsdWVcIixcbiAgICAgICAgXCJzZWNyZXRzbWFuYWdlcjpEZXNjcmliZVNlY3JldFwiXG4gICAgICBdLFxuICAgICAgcmVzb3VyY2VzOiBbYCR7YXBpU2VjcmV0LnNlY3JldEFybn0tKmAsIGAke2FwcFNlY3JldC5zZWNyZXRBcm59LSpgXSxcbiAgICAgIGVmZmVjdDogRWZmZWN0LkFMTE9XLFxuICAgIH0pKVxuXG4gICAgcmV0dXJuIHM7XG4gIH1cblxuICBjcmVhdGVTZWNyZXRQcm92aWRlckNsYXNzKGNsdXN0ZXI6IElDbHVzdGVyKTogS3ViZXJuZXRlc01hbmlmZXN0IHtcbiAgICBjb25zdCBzID0gY2x1c3Rlci5hZGRNYW5pZmVzdCgnRGF0YWRvZ1NlY3JldFByb3ZpZGVyJywge1xuICAgICAgYXBpVmVyc2lvbjogXCJzZWNyZXRzLXN0b3JlLmNzaS54LWs4cy5pby92MVwiLFxuICAgICAga2luZDogXCJTZWNyZXRQcm92aWRlckNsYXNzXCIsXG4gICAgICBtZXRhZGF0YToge1xuICAgICAgICBuYW1lOiBcImRhdGFkb2ctc2VjcmV0LXByb3ZpZGVyXCIsXG4gICAgICAgIG5hbWVzcGFjZTogXCJkYXRhZG9nXCJcbiAgICAgIH0sXG4gICAgICBzcGVjOiB7XG4gICAgICAgIHByb3ZpZGVyOiBcImF3c1wiLFxuICAgICAgICBwYXJhbWV0ZXJzOiB7XG4gICAgICAgICAgb2JqZWN0czogSlNPTi5zdHJpbmdpZnkoW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBvYmplY3ROYW1lOiBcIi9hY2NvdW50L2RhdGFkb2cvYXBpLWtleVwiLFxuICAgICAgICAgICAgICBvYmplY3RUeXBlOiBcInNlY3JldHNtYW5hZ2VyXCIsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBvYmplY3ROYW1lOiBcIi9hY2NvdW50L2RhdGFkb2cvYXBwLWtleVwiLFxuICAgICAgICAgICAgICBvYmplY3RUeXBlOiBcInNlY3JldHNtYW5hZ2VyXCIsXG4gICAgICAgICAgICB9XG4gICAgICAgICAgXSlcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pO1xuXG4gICAgcmV0dXJuIHM7XG4gIH1cblxuICBpbnN0YWxsRGF0YWRvZ0FnZW50V2l0aEV4aXN0aW5nU2VjcmV0KHByb3BzOiBEYXRhZG9nQVdTSW50ZWdyYXRpb25TdGFja1Byb3BzLCBjbHVzdGVyOiBJQ2x1c3Rlcik6IEt1YmVybmV0ZXNNYW5pZmVzdCB7XG5cbiAgICBjb25zdCBzID0gY2x1c3Rlci5hZGRNYW5pZmVzdCgnRGF0YWRvZ0FnZW50Jywge1xuICAgICAgYXBpVmVyc2lvbjogXCJkYXRhZG9naHEuY29tL3YxYWxwaGExXCIsXG4gICAgICBraW5kOiBcIkRhdGFkb2dBZ2VudFwiLFxuICAgICAgbWV0YWRhdGE6IHtcbiAgICAgICAgbmFtZTogXCJkYXRhZG9nLWFnZW50XCIsXG4gICAgICAgIG5hbWVzcGFjZTogXCJkYXRhZG9nXCJcbiAgICAgIH0sXG4gICAgICBzcGVjOiB7XG4gICAgICAgIGNyZWRlbnRpYWxzOiB7XG4gICAgICAgICAgYXBpU2VjcmV0OiB7XG4gICAgICAgICAgICBzZWNyZXROYW1lOiBwcm9wcy5hcGlLZXlTZWNyZXQsXG4gICAgICAgICAgICBrZXlOYW1lOiAnYXBpLWtleSdcbiAgICAgICAgICB9LFxuICAgICAgICAgIGFwcFNlY3JldDoge1xuICAgICAgICAgICAgc2VjcmV0TmFtZTogcHJvcHMuYXBwS2V5U2VjcmV0LFxuICAgICAgICAgICAga2V5TmFtZTogJ2FwcC1rZXknXG4gICAgICAgICAgfSxcbiAgICAgICAgfSxcbiAgICAgICAgYWdlbnQ6IHtcbiAgICAgICAgICBpbWFnZToge1xuICAgICAgICAgICAgbmFtZTogJ2djci5pby9kYXRhZG9naHEvYWdlbnQ6bGF0ZXN0J1xuICAgICAgICAgIH0sXG4gICAgICAgICAgbG9nOiB7XG4gICAgICAgICAgICBlbmFibGVkOiB0cnVlLFxuICAgICAgICAgICAgbG9nc0NvbmZpZ0NvbnRhaW5lckNvbGxlY3RBbGw6IHRydWVcbiAgICAgICAgICB9LFxuICAgICAgICAgIHN5c3RlbVByb2JlOiB7XG4gICAgICAgICAgICBicGZEZWJ1Z0VuYWJsZWQ6IGZhbHNlIC8vIGVuYWJsZWQgd2hlbiBidWcgaXMgZml4ZWRcbiAgICAgICAgICB9LFxuICAgICAgICAgIHNlY3VyaXR5OiB7XG4gICAgICAgICAgICBjb21wbGlhbmNlOiB7XG4gICAgICAgICAgICAgIGVuYWJsZWQ6IGZhbHNlIC8vIGVuYWJsZWQgd2hlbiBidWcgaXMgZml4ZWRcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBydW50aW1lOiB7XG4gICAgICAgICAgICAgIGVuYWJsZWQ6IGZhbHNlIC8vIGVuYWJsZWQgd2hlbiBidWcgaXMgZml4ZWRcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9LFxuICAgICAgICAgIGFwbToge1xuICAgICAgICAgICAgZW5hYmxlZDogZmFsc2UgLy8gZW5hYmxlIHdoZW4gYnVnIGlzIGZpeGVkXG4gICAgICAgICAgfSxcbiAgICAgICAgICBwcm9jZXNzOiB7XG4gICAgICAgICAgICBlbmFibGVkOiBmYWxzZSwgLy8gZW5hYmxlIHdoZW4gYnVnIGlzIGZpeGVkXG4gICAgICAgICAgICBwcm9jZXNzQ29sbGVjdGlvbkVuYWJsZWQ6IGZhbHNlXG4gICAgICAgICAgfSxcbiAgICAgICAgfSxcbiAgICAgICAgY2x1c3RlckFnZW50OiB7XG4gICAgICAgICAgaW1hZ2U6IHtcbiAgICAgICAgICAgIG5hbWU6ICdnY3IuaW8vZGF0YWRvZ2hxL2NsdXN0ZXItYWdlbnQ6bGF0ZXN0J1xuICAgICAgICAgIH0sXG4gICAgICAgICAgY29uZmlnOiB7XG4gICAgICAgICAgICBleHRlcm5hbE1ldHJpY3M6IHtcbiAgICAgICAgICAgICAgZW5hYmxlZDogdHJ1ZVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGFkbWlzc2lvbkNvbnRyb2xsZXI6IHtcbiAgICAgICAgICAgICAgZW5hYmxlZDogdHJ1ZVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcblxuICAgIHJldHVybiBzO1xuXG4gIH1cblxuXG4gIGluc3RhbGxEYXRhZG9nQWdlbnRXaXRoVm9sdW1lTW91bnRzKGNsdXN0ZXI6IElDbHVzdGVyLCBhcGlLZXk6IHN0cmluZywgYXBwS2V5OiBzdHJpbmcpOiBLdWJlcm5ldGVzTWFuaWZlc3Qge1xuXG4gICAgY29uc3QgYXBpID0gYXBpS2V5LnJlcGxhY2UoXCIvXCIsIFwiX1wiKVxuICAgIGNvbnN0IGFwcCA9IGFwcEtleS5yZXBsYWNlKFwiL1wiLCBcIl9cIilcbiAgICBjb25zdCBzZXJ2aWNlQWNjb3VudE5hbWUgPSAnZGF0YWRvZy1zYSdcblxuICAgIGNvbnN0IEREX0VOViA9IFtcbiAgICAgIHtcbiAgICAgICAgbmFtZTogXCJERF9BUElfS0VZXCIsXG4gICAgICAgIHZhbHVlOiBgRU5DW2ZpbGVAL21udC9zZWNyZXRzLyR7YXBpfV1gLFxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgbmFtZTogXCJERF9BUFBfS0VZXCIsXG4gICAgICAgIHZhbHVlOiBgRU5DW2ZpbGVAL21udC9zZWNyZXRzLyR7YXBwfV1gLFxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgbmFtZTogXCJERF9TRUNSRVRfQkFDS0VORF9DT01NQU5EXCIsXG4gICAgICAgIHZhbHVlOiAnL3JlYWRzZWNyZXRfbXVsdGlwbGVfcHJvdmlkZXJzLnNoJyxcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIG5hbWU6IFwiRERfU0VDUkVUX0JBQ0tFTkRfQVJHVU1FTlRTXCIsXG4gICAgICAgIHZhbHVlOiAnL21udC9zZWNyZXRzJyxcbiAgICAgIH0sXG4gICAgXVxuXG4gICAgY29uc3QgRERfVk9MVU1FUyA9IFt7XG4gICAgICBuYW1lOiBcInNlY3JldHMtc3RvcmUtaW5saW5lXCIsXG4gICAgICBjc2k6IHtcbiAgICAgICAgZHJpdmVyOiBcInNlY3JldHMtc3RvcmUuY3NpLms4cy5pb1wiLFxuICAgICAgICByZWFkT25seTogdHJ1ZSxcbiAgICAgICAgdm9sdW1lQXR0cmlidXRlczoge1xuICAgICAgICAgIHNlY3JldFByb3ZpZGVyQ2xhc3M6ICdkYXRhZG9nLXNlY3JldC1wcm92aWRlcidcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1dXG5cbiAgICBjb25zdCBERF9WT0xVTUVfTU9VTlRTID0gW3tcbiAgICAgIG5hbWU6IFwic2VjcmV0cy1zdG9yZS1pbmxpbmVcIixcbiAgICAgIG1vdW50UGF0aDogXCIvbW50L3NlY3JldHMvXCIsXG4gICAgICByZWFkT25seTogdHJ1ZVxuICAgIH1dXG5cbiAgICBjb25zdCBzID0gY2x1c3Rlci5hZGRNYW5pZmVzdCgnRGF0YWRvZ0FnZW50Jywge1xuICAgICAgYXBpVmVyc2lvbjogXCJkYXRhZG9naHEuY29tL3YxYWxwaGExXCIsXG4gICAgICBraW5kOiBcIkRhdGFkb2dBZ2VudFwiLFxuICAgICAgbWV0YWRhdGE6IHtcbiAgICAgICAgbmFtZTogXCJkYXRhZG9nLWFnZW50XCIsXG4gICAgICAgIG5hbWVzcGFjZTogXCJkYXRhZG9nXCJcbiAgICAgIH0sXG4gICAgICBzcGVjOiB7XG4gICAgICAgIGNyZWRlbnRpYWxzOiB7XG4gICAgICAgICAgYXBpS2V5OiBgRU5DW2ZpbGVAL21udC9zZWNyZXRzLyR7YXBwfV1gLFxuICAgICAgICAgIGFwcEtleTogYEVOQ1tmaWxlQC9tbnQvc2VjcmV0cy8ke2FwcH1dYCxcbiAgICAgICAgICB1c2VTZWNyZXRCYWNrZW5kOiB0cnVlXG4gICAgICAgIH0sXG4gICAgICAgIGFnZW50OiB7XG4gICAgICAgICAgZW52OiBERF9FTlYsXG4gICAgICAgICAgY29uZmlnOiB7XG4gICAgICAgICAgICB2b2x1bWVzOiBERF9WT0xVTUVTLFxuICAgICAgICAgICAgdm9sdW1lTW91bnRzOiBERF9WT0xVTUVfTU9VTlRTXG4gICAgICAgICAgfSxcbiAgICAgICAgICByYmFjOiB7XG4gICAgICAgICAgICBjcmVhdGU6IHRydWUsXG4gICAgICAgICAgICBzZXJ2aWNlQWNjb3VudE5hbWU6IHNlcnZpY2VBY2NvdW50TmFtZSxcbiAgICAgICAgICB9LFxuICAgICAgICAgIGltYWdlOiB7XG4gICAgICAgICAgICBuYW1lOiAnZ2NyLmlvL2RhdGFkb2docS9hZ2VudDpsYXRlc3QnXG4gICAgICAgICAgfSxcbiAgICAgICAgICBsb2c6IHtcbiAgICAgICAgICAgIGVuYWJsZWQ6IHRydWUsXG4gICAgICAgICAgICBsb2dzQ29uZmlnQ29udGFpbmVyQ29sbGVjdEFsbDogdHJ1ZVxuICAgICAgICAgIH0sXG4gICAgICAgICAgc3lzdGVtUHJvYmU6IHtcbiAgICAgICAgICAgIGVudjogRERfRU5WLFxuICAgICAgICAgICAgYnBmRGVidWdFbmFibGVkOiBmYWxzZSAvLyBlbmFibGVkIHdoZW4gYnVnIGlzIGZpeGVkXG4gICAgICAgICAgfSxcbiAgICAgICAgICBzZWN1cml0eToge1xuICAgICAgICAgICAgY29tcGxpYW5jZToge1xuICAgICAgICAgICAgICBlbmFibGVkOiBmYWxzZSAvLyBlbmFibGVkIHdoZW4gYnVnIGlzIGZpeGVkXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgcnVudGltZToge1xuICAgICAgICAgICAgICBlbmFibGVkOiBmYWxzZSAvLyBlbmFibGVkIHdoZW4gYnVnIGlzIGZpeGVkXG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSxcbiAgICAgICAgICBhcG06IHtcbiAgICAgICAgICAgIGVudjogRERfRU5WLFxuICAgICAgICAgICAgZW5hYmxlZDogZmFsc2UgLy8gZW5hYmxlIHdoZW4gYnVnIGlzIGZpeGVkXG4gICAgICAgICAgfSxcbiAgICAgICAgICBwcm9jZXNzOiB7XG4gICAgICAgICAgICBlbmFibGVkOiBmYWxzZSwgLy8gZW5hYmxlIHdoZW4gYnVnIGlzIGZpeGVkXG4gICAgICAgICAgICBwcm9jZXNzQ29sbGVjdGlvbkVuYWJsZWQ6IGZhbHNlXG4gICAgICAgICAgfSxcbiAgICAgICAgfSxcbiAgICAgICAgY2x1c3RlckFnZW50OiB7XG4gICAgICAgICAgaW1hZ2U6IHtcbiAgICAgICAgICAgIG5hbWU6ICdnY3IuaW8vZGF0YWRvZ2hxL2NsdXN0ZXItYWdlbnQ6bGF0ZXN0J1xuICAgICAgICAgIH0sXG4gICAgICAgICAgcmJhYzoge1xuICAgICAgICAgICAgY3JlYXRlOiB0cnVlLFxuICAgICAgICAgICAgc2VydmljZUFjY291bnROYW1lOiBzZXJ2aWNlQWNjb3VudE5hbWUsXG4gICAgICAgICAgfSxcbiAgICAgICAgICBjb25maWc6IHtcbiAgICAgICAgICAgIGVudjogRERfRU5WLFxuICAgICAgICAgICAgZXh0ZXJuYWxNZXRyaWNzOiB7XG4gICAgICAgICAgICAgIGVuYWJsZWQ6IHRydWVcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBhZG1pc3Npb25Db250cm9sbGVyOiB7XG4gICAgICAgICAgICAgIGVuYWJsZWQ6IHRydWVcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB2b2x1bWVzOiBERF9WT0xVTUVTLFxuICAgICAgICAgICAgdm9sdW1lTW91bnRzOiBERF9WT0xVTUVfTU9VTlRTXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICByZXR1cm4gcztcbiAgfVxufVxuIl19
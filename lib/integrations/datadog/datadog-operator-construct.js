"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatadogOperator = void 0;
const aws_cdk_lib_1 = require("aws-cdk-lib");
const aws_eks_1 = require("aws-cdk-lib/aws-eks");
const aws_iam_1 = require("aws-cdk-lib/aws-iam");
const aws_secretsmanager_1 = require("aws-cdk-lib/aws-secretsmanager");
const constructs_1 = require("constructs");
const helm_chart_1 = require("../../eks/helm-chart");
const utils_1 = require("../../utils");
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
        // ..TODO.. harshad - This solves the stack name problem - Long term fix required
        const h = new helm_chart_1.HelmChartStack(this.node.root, 'DatadogOperator', chart, props.clusterName, props.kubectlRoleArn, {
            stackName: 'DatadogOperatorHelm',
            env: props.env,
            synthesizer: props.operatorSynthesizer,
        });
        // Role nested perm issue
        aws_cdk_lib_1.Aspects.of(h).add(new utils_1.PermissionsBoundaryAspect(props.permissionBoundaryRole));
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGF0YWRvZy1vcGVyYXRvci1jb25zdHJ1Y3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJkYXRhZG9nLW9wZXJhdG9yLWNvbnN0cnVjdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSw2Q0FBc0M7QUFDdEMsaURBQTRGO0FBQzVGLGlEQUFxRjtBQUNyRix1RUFBd0Q7QUFDeEQsMkNBQXVDO0FBR3ZDLHFEQUFzRDtBQUN0RCx1Q0FBd0Q7QUFHeEQsTUFBYSxlQUFnQixTQUFRLHNCQUFTO0lBSTVDLFlBQVksS0FBZ0IsRUFBRSxFQUFVLEVBQUUsS0FBZ0M7UUFFeEUsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsQ0FBQztRQUpuQiw2QkFBd0IsR0FBRyxPQUFPLENBQUE7UUFLaEMsSUFBSSxDQUFDLHNCQUFzQixDQUFDLEtBQUssQ0FBQyxDQUFBO0lBRXBDLENBQUM7SUFFRCxzQkFBc0IsQ0FBQyxLQUFnQztRQUVyRCxNQUFNLEtBQUssR0FBYTtZQUN0QixJQUFJLEVBQUUsaUJBQWlCO1lBQ3ZCLEtBQUssRUFBRSxrQkFBa0I7WUFDekIsU0FBUyxFQUFFLFNBQVM7WUFDcEIsT0FBTyxFQUFFLElBQUksSUFBSSxDQUFDLHdCQUF3QixFQUFFO1lBQzVDLE9BQU8sRUFBRSxHQUFHLElBQUksQ0FBQyx3QkFBd0IsRUFBRTtZQUMzQyxPQUFPLEVBQUUsSUFBSTtZQUNiLFVBQVUsRUFBRSw0QkFBNEI7WUFDeEMsV0FBVyxFQUFFLGtDQUFrQyxJQUFJLENBQUMsd0JBQXdCLEVBQUU7WUFDOUUsZUFBZSxFQUFFLElBQUk7WUFDckIsTUFBTSxFQUFFLEVBQUU7U0FDWCxDQUFBO1FBRUQsZ0JBQWdCO1FBQ2hCLE1BQU0sT0FBTyxHQUFHLGlCQUFPLENBQUMscUJBQXFCLENBQUMsSUFBSSxFQUFFLEdBQUcsS0FBSyxDQUFDLFdBQVcsS0FBSyxFQUFFO1lBQzdFLFdBQVcsRUFBRSxLQUFLLENBQUMsV0FBWTtZQUMvQixjQUFjLEVBQUUsS0FB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aWJcIjtcbmltcG9ydCB7IENsdXN0ZXIsIElDbHVzdGVyLCBLdWJlcm5ldGVzTWFuaWZlc3QsIFNlcnZpY2VBY2NvdW50IH0gZnJvbSBcImF3cy1jZGstbGliL2F3cy1la3NcIjtcbmltcG9ydCB7IEVmZmVjdCwgT3BlbklkQ29ubmVjdFByb3ZpZGVyLCBQb2xpY3lTdGF0ZW1lbnQgfSBmcm9tIFwiYXdzLWNkay1saWIvYXdzLWlhbVwiO1xuaW1wb3J0IHsgU2VjcmV0IH0gZnJvbSBcImF3cy1jZGstbGliL2F3cy1zZWNyZXRzbWFuYWdlclwiO1xuaW1wb3J0IHsgQ29uc3RydWN0IH0gZnJvbSBcImNvbnN0cnVjdHNcIjtcbmltcG9ydCB7IEVLU0NoYXJ0IH0gZnJvbSBcIi4uLy4uLy4uL2ludGVyZmFjZXMvbGliL2Vrcy9pbnRlcmZhY2VzXCI7XG5pbXBvcnQgeyBEYXRhZG9nT3BlcmF0b3JTdGFja1Byb3BzIH0gZnJvbSBcIi4uLy4uLy4uL2ludGVyZmFjZXMvbGliL2ludGVncmF0aW9ucy9kYXRhZG9nL2ludGVmYWNlc1wiO1xuaW1wb3J0IHsgSGVsbUNoYXJ0U3RhY2sgfSBmcm9tIFwiLi4vLi4vZWtzL2hlbG0tY2hhcnRcIjtcbmltcG9ydCB7IFBlcm1pc3Npb25zQm91bmRhcnlBc3BlY3QgfSBmcm9tIFwiLi4vLi4vdXRpbHNcIjtcblxuXG5leHBvcnQgY2xhc3MgRGF0YWRvZ09wZXJhdG9yIGV4dGVuZHMgQ29uc3RydWN0IHtcblxuICBEQVRBRE9HX09QRVJBVE9SX1ZFUlNJT04gPSBcIjAuOC4wXCJcblxuICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nLCBwcm9wczogRGF0YWRvZ09wZXJhdG9yU3RhY2tQcm9wcykge1xuXG4gICAgc3VwZXIoc2NvcGUsIGlkKTtcbiAgICB0aGlzLmluc3RhbGxEYXRhZG9nT3BlcmF0b3IocHJvcHMpXG5cbiAgfVxuXG4gIGluc3RhbGxEYXRhZG9nT3BlcmF0b3IocHJvcHM6IERhdGFkb2dPcGVyYXRvclN0YWNrUHJvcHMpIHtcblxuICAgIGNvbnN0IGNoYXJ0OiBFS1NDaGFydCA9IHtcbiAgICAgIG5hbWU6IFwiRGF0YWRvZ09wZXJhdG9yXCIsXG4gICAgICBjaGFydDogXCJkYXRhZG9nLW9wZXJhdG9yXCIsXG4gICAgICBuYW1lc3BhY2U6IFwiZGF0YWRvZ1wiLFxuICAgICAgcmVsZWFzZTogYHYke3RoaXMuREFUQURPR19PUEVSQVRPUl9WRVJTSU9OfWAsXG4gICAgICB2ZXJzaW9uOiBgJHt0aGlzLkRBVEFET0dfT1BFUkFUT1JfVkVSU0lPTn1gLFxuICAgICAgZW5hYmxlZDogdHJ1ZSxcbiAgICAgIHJlcG9zaXRvcnk6IFwiaHR0cHM6Ly9oZWxtLmRhdGFkb2docS5jb21cIixcbiAgICAgIGRlc2NyaXB0aW9uOiBgRGF0YWRvZyBvcGVyYXRvciBpbnN0YWxsYXRpb24gdiR7dGhpcy5EQVRBRE9HX09QRVJBVE9SX1ZFUlNJT059YCxcbiAgICAgIGNyZWF0ZU5hbWVzcGFjZTogdHJ1ZSxcbiAgICAgIHZhbHVlczoge31cbiAgICB9XG5cbiAgICAvLyBDcmVhdGUgc2VjcmV0XG4gICAgY29uc3QgY2x1c3RlciA9IENsdXN0ZXIuZnJvbUNsdXN0ZXJBdHRyaWJ1dGVzKHRoaXMsIGAke3Byb3BzLmNsdXN0ZXJOYW1lfVJlZmAsIHtcbiAgICAgIGNsdXN0ZXJOYW1lOiBwcm9wcy5jbHVzdGVyTmFtZSEsXG4gICAgICBrdWJlY3RsUm9sZUFybjogcHJvcHMua3ViZWN0bFJvbGVBcm4hLFxuICAgICAgb3BlbklkQ29ubmVjdFByb3ZpZGVyOiBPcGVuSWRDb25uZWN0UHJvdmlkZXIuZnJvbU9wZW5JZENvbm5lY3RQcm92aWRlckFybih0aGlzLCAnT3BlbklEQ29ubmVjdFByb3ZpZGVyJywgcHJvcHMub3BlbklkQ29ubmVjdFByb3ZpZGVyQXJuISksXG4gICAgfSk7XG4gICAgLy8gLi5UT0RPLi4gaGFyc2hhZCAtIFRoaXMgc29sdmVzIHRoZSBzdGFjayBuYW1lIHByb2JsZW0gLSBMb25nIHRlcm0gZml4IHJlcXVpcmVkXG4gICAgY29uc3QgaCA9IG5ldyBIZWxtQ2hhcnRTdGFjayh0aGlzLm5vZGUucm9vdCwgJ0RhdGFkb2dPcGVyYXRvcicsIGNoYXJ0LCBwcm9wcy5jbHVzdGVyTmFtZSEsIHByb3BzLmt1YmVjdGxSb2xlQXJuISwge1xuICAgICAgc3RhY2tOYW1lOiAnRGF0YWRvZ09wZXJhdG9ySGVsbScsXG4gICAgICBlbnY6IHByb3BzLmVudixcbiAgICAgIHN5bnRoZXNpemVyOiBwcm9wcy5vcGVyYXRvclN5bnRoZXNpemVyLFxuICAgIH0pO1xuICAgIC8vIFJvbGUgbmVzdGVkIHBlcm0gaXNzdWVcbiAgICBBc3BlY3RzLm9mKGgpLmFkZChuZXcgUGVybWlzc2lvbnNCb3VuZGFyeUFzcGVjdChwcm9wcy5wZXJtaXNzaW9uQm91bmRhcnlSb2xlKSlcblxuICAgIC8vIFRoaXMgaXMgaWRlYWwgd2F5IHdoZXJlIHNlY3JldCBpcyBhdHRhY2hlZCBhdXRvbWF0aWNhbGx5XG4gICAgaWYgKHByb3BzLnVzZVNlY3JldEZyb21DU0kpIHtcbiAgICAgIGNvbnN0IHNwYyA9IHRoaXMuY3JlYXRlU2VjcmV0UHJvdmlkZXJDbGFzcyhwcm9wcywgY2x1c3Rlcik7XG4gICAgICBjb25zdCBzYSA9IHRoaXMuY3JlYXRlU2VydmljZUFjY291bnQocHJvcHMsIGNsdXN0ZXIpO1xuICAgICAgLy8gQ3JlYXRlIGRlcGVuZGVuY3kgc28gd2hlbiBzZWNyZXQgcHJvdmlkZXIgY2xhc3MgaXMgY3JlYXRlZCBpdCBjYW4gYmUgYWNjZXNzZWQgYnkgU0EuXG4gICAgICBzYS5ub2RlLmFkZERlcGVuZGVuY3koc3BjKTtcblxuICAgICAgLy8gRGVwZW5kZW5jeSBvbiBoZWxtIGNoYXJ0XG4gICAgICBzcGMubm9kZS5hZGREZXBlbmRlbmN5KGgpXG5cbiAgICAgIGNvbnN0IGEgPSB0aGlzLmluc3RhbGxEYXRhZG9nQWdlbnRXaXRoVm9sdW1lTW91bnRzKGNsdXN0ZXIsIHByb3BzLmFwaUtleVNlY3JldCwgcHJvcHMuYXBwS2V5U2VjcmV0ISlcbiAgICAgIGEubm9kZS5hZGREZXBlbmRlbmN5KGgpXG5cbiAgICB9IGVsc2Uge1xuICAgICAgLy8gVW50aWwgZGF0YWRvZyBvcGVyYXRvciBpcyBmaXhlZCB3ZSBzaW1wbHkgdXNlIHRoaXNcbiAgICAgIGNvbnN0IGEgPSB0aGlzLmluc3RhbGxEYXRhZG9nQWdlbnRXaXRoRXhpc3RpbmdTZWNyZXQocHJvcHMsIGNsdXN0ZXIpXG4gICAgICBhLm5vZGUuYWRkRGVwZW5kZW5jeShoKVxuICAgIH1cblxuICB9XG4gIGNyZWF0ZVNlcnZpY2VBY2NvdW50KHByb3BzOiBEYXRhZG9nT3BlcmF0b3JTdGFja1Byb3BzLCBjbHVzdGVyOiBJQ2x1c3Rlcik6IFNlcnZpY2VBY2NvdW50IHtcblxuICAgIGNvbnN0IGFwaVNlY3JldCA9IFNlY3JldC5mcm9tU2VjcmV0TmFtZVYyKHRoaXMsICdEYXRhZG9nQXBpU2VjcmV0JywgcHJvcHMuYXBpS2V5U2VjcmV0KTtcbiAgICBjb25zdCBhcHBTZWNyZXQgPSBTZWNyZXQuZnJvbVNlY3JldE5hbWVWMih0aGlzLCAnRGF0YWRvZ0FwcFNlY3JldCcsIHByb3BzLmFwcEtleVNlY3JldCEpO1xuXG4gICAgY29uc3QgcyA9IGNsdXN0ZXIuYWRkU2VydmljZUFjY291bnQoXCJEYXRhZG9nU2VydmljZUFjY291bnRcIiwgeyBuYW1lOiBcImRhdGFkb2ctc2FcIiwgbmFtZXNwYWNlOiBcImRhdGFkb2dcIiB9KVxuICAgIHMuYWRkVG9QcmluY2lwYWxQb2xpY3kobmV3IFBvbGljeVN0YXRlbWVudCh7XG4gICAgICBzaWQ6IFwiQWxsb3dHZXRTZWNyZXRWYWx1ZUZvckVLU0RhdGFkb2dcIixcbiAgICAgIGFjdGlvbnM6IFtcbiAgICAgICAgXCJzZWNyZXRzbWFuYWdlcjpHZXRTZWNyZXRWYWx1ZVwiLFxuICAgICAgICBcInNlY3JldHNtYW5hZ2VyOkRlc2NyaWJlU2VjcmV0XCJcbiAgICAgIF0sXG4gICAgICByZXNvdXJjZXM6IFtgJHthcGlTZWNyZXQuc2VjcmV0QXJufS0qYCwgYCR7YXBwU2VjcmV0LnNlY3JldEFybn0tKmBdLFxuICAgICAgZWZmZWN0OiBFZmZlY3QuQUxMT1csXG4gICAgfSkpXG5cbiAgICByZXR1cm4gcztcbiAgfVxuXG4gIGNyZWF0ZVNlY3JldFByb3ZpZGVyQ2xhc3MocHJvcHM6IERhdGFkb2dPcGVyYXRvclN0YWNrUHJvcHMsIGNsdXN0ZXI6IElDbHVzdGVyKTogS3ViZXJuZXRlc01hbmlmZXN0IHtcbiAgICBjb25zdCBzID0gY2x1c3Rlci5hZGRNYW5pZmVzdCgnRGF0YWRvZ1NlY3JldFByb3ZpZGVyJywge1xuICAgICAgYXBpVmVyc2lvbjogXCJzZWNyZXRzLXN0b3JlLmNzaS54LWs4cy5pby92MVwiLFxuICAgICAga2luZDogXCJTZWNyZXRQcm92aWRlckNsYXNzXCIsXG4gICAgICBtZXRhZGF0YToge1xuICAgICAgICBuYW1lOiBcImRhdGFkb2ctc2VjcmV0LXByb3ZpZGVyXCIsXG4gICAgICAgIG5hbWVzcGFjZTogXCJkYXRhZG9nXCJcbiAgICAgIH0sXG4gICAgICBzcGVjOiB7XG4gICAgICAgIHByb3ZpZGVyOiBcImF3c1wiLFxuICAgICAgICBwYXJhbWV0ZXJzOiB7XG4gICAgICAgICAgb2JqZWN0czogSlNPTi5zdHJpbmdpZnkoW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBvYmplY3ROYW1lOiBwcm9wcy5hcGlLZXlTZWNyZXQsXG4gICAgICAgICAgICAgIG9iamVjdFR5cGU6IFwic2VjcmV0c21hbmFnZXJcIixcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIG9iamVjdE5hbWU6IHByb3BzLmFwcEtleVNlY3JldCEsXG4gICAgICAgICAgICAgIG9iamVjdFR5cGU6IFwic2VjcmV0c21hbmFnZXJcIixcbiAgICAgICAgICAgIH1cbiAgICAgICAgICBdKVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICByZXR1cm4gcztcbiAgfVxuXG4gIGluc3RhbGxEYXRhZG9nQWdlbnRXaXRoRXhpc3RpbmdTZWNyZXQocHJvcHM6IERhdGFkb2dPcGVyYXRvclN0YWNrUHJvcHMsIGNsdXN0ZXI6IElDbHVzdGVyKTogS3ViZXJuZXRlc01hbmlmZXN0IHtcblxuICAgIGNvbnN0IHMgPSBjbHVzdGVyLmFkZE1hbmlmZXN0KCdEYXRhZG9nQWdlbnQnLCB7XG4gICAgICBhcGlWZXJzaW9uOiBcImRhdGFkb2docS5jb20vdjFhbHBoYTFcIixcbiAgICAgIGtpbmQ6IFwiRGF0YWRvZ0FnZW50XCIsXG4gICAgICBtZXRhZGF0YToge1xuICAgICAgICBuYW1lOiBcImRhdGFkb2ctYWdlbnRcIixcbiAgICAgICAgbmFtZXNwYWNlOiBcImRhdGFkb2dcIlxuICAgICAgfSxcbiAgICAgIHNwZWM6IHtcbiAgICAgICAgY3JlZGVudGlhbHM6IHtcbiAgICAgICAgICBhcGlTZWNyZXQ6IHtcbiAgICAgICAgICAgIHNlY3JldE5hbWU6IHByb3BzLmRhdGFkb2dLOEV4aXN0aW5nU2VjcmV0ISxcbiAgICAgICAgICAgIGtleU5hbWU6ICdhcGkta2V5J1xuICAgICAgICAgIH0sXG4gICAgICAgICAgYXBwU2VjcmV0OiB7XG4gICAgICAgICAgICBzZWNyZXROYW1lOiBwcm9wcy5kYXRhZG9nSzhFeGlzdGluZ1NlY3JldCEsXG4gICAgICAgICAgICBrZXlOYW1lOiAnYXBwLWtleSdcbiAgICAgICAgICB9LFxuICAgICAgICB9LFxuICAgICAgICBhZ2VudDoge1xuICAgICAgICAgIGltYWdlOiB7XG4gICAgICAgICAgICBuYW1lOiAnZ2NyLmlvL2RhdGFkb2docS9hZ2VudDpsYXRlc3QnXG4gICAgICAgICAgfSxcbiAgICAgICAgICBsb2c6IHtcbiAgICAgICAgICAgIGVuYWJsZWQ6IHRydWUsXG4gICAgICAgICAgICBsb2dzQ29uZmlnQ29udGFpbmVyQ29sbGVjdEFsbDogdHJ1ZVxuICAgICAgICAgIH0sXG4gICAgICAgICAgc3lzdGVtUHJvYmU6IHtcbiAgICAgICAgICAgIGJwZkRlYnVnRW5hYmxlZDogZmFsc2UgLy8gZW5hYmxlZCB3aGVuIGJ1ZyBpcyBmaXhlZFxuICAgICAgICAgIH0sXG4gICAgICAgICAgc2VjdXJpdHk6IHtcbiAgICAgICAgICAgIGNvbXBsaWFuY2U6IHtcbiAgICAgICAgICAgICAgZW5hYmxlZDogZmFsc2UgLy8gZW5hYmxlZCB3aGVuIGJ1ZyBpcyBmaXhlZFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHJ1bnRpbWU6IHtcbiAgICAgICAgICAgICAgZW5hYmxlZDogZmFsc2UgLy8gZW5hYmxlZCB3aGVuIGJ1ZyBpcyBmaXhlZFxuICAgICAgICAgICAgfVxuICAgICAgICAgIH0sXG4gICAgICAgICAgYXBtOiB7XG4gICAgICAgICAgICBlbmFibGVkOiBmYWxzZSAvLyBlbmFibGUgd2hlbiBidWcgaXMgZml4ZWRcbiAgICAgICAgICB9LFxuICAgICAgICAgIHByb2Nlc3M6IHtcbiAgICAgICAgICAgIGVuYWJsZWQ6IGZhbHNlLCAvLyBlbmFibGUgd2hlbiBidWcgaXMgZml4ZWRcbiAgICAgICAgICAgIHByb2Nlc3NDb2xsZWN0aW9uRW5hYmxlZDogZmFsc2VcbiAgICAgICAgICB9LFxuICAgICAgICB9LFxuICAgICAgICBjbHVzdGVyQWdlbnQ6IHtcbiAgICAgICAgICBpbWFnZToge1xuICAgICAgICAgICAgbmFtZTogJ2djci5pby9kYXRhZG9naHEvY2x1c3Rlci1hZ2VudDpsYXRlc3QnXG4gICAgICAgICAgfSxcbiAgICAgICAgICBjb25maWc6IHtcbiAgICAgICAgICAgIGV4dGVybmFsTWV0cmljczoge1xuICAgICAgICAgICAgICBlbmFibGVkOiB0cnVlXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgYWRtaXNzaW9uQ29udHJvbGxlcjoge1xuICAgICAgICAgICAgICBlbmFibGVkOiB0cnVlXG4gICAgICAgICAgICB9LFxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pO1xuXG4gICAgcmV0dXJuIHM7XG5cbiAgfVxuXG5cbiAgaW5zdGFsbERhdGFkb2dBZ2VudFdpdGhWb2x1bWVNb3VudHMoY2x1c3RlcjogSUNsdXN0ZXIsIGFwaUtleTogc3RyaW5nLCBhcHBLZXk6IHN0cmluZyk6IEt1YmVybmV0ZXNNYW5pZmVzdCB7XG5cbiAgICBjb25zdCBhcGkgPSBhcGlLZXkucmVwbGFjZShcIi9cIiwgXCJfXCIpXG4gICAgY29uc3QgYXBwID0gYXBwS2V5LnJlcGxhY2UoXCIvXCIsIFwiX1wiKVxuICAgIGNvbnN0IHNlcnZpY2VBY2NvdW50TmFtZSA9ICdkYXRhZG9nLXNhJ1xuXG4gICAgY29uc3QgRERfRU5WID0gW1xuICAgICAge1xuICAgICAgICBuYW1lOiBcIkREX0FQSV9LRVlcIixcbiAgICAgICAgdmFsdWU6IGBFTkNbZmlsZUAvbW50L3NlY3JldHMvJHthcGl9XWAsXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICBuYW1lOiBcIkREX0FQUF9LRVlcIixcbiAgICAgICAgdmFsdWU6IGBFTkNbZmlsZUAvbW50L3NlY3JldHMvJHthcHB9XWAsXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICBuYW1lOiBcIkREX1NFQ1JFVF9CQUNLRU5EX0NPTU1BTkRcIixcbiAgICAgICAgdmFsdWU6ICcvcmVhZHNlY3JldF9tdWx0aXBsZV9wcm92aWRlcnMuc2gnLFxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgbmFtZTogXCJERF9TRUNSRVRfQkFDS0VORF9BUkdVTUVOVFNcIixcbiAgICAgICAgdmFsdWU6ICcvbW50L3NlY3JldHMnLFxuICAgICAgfSxcbiAgICBdXG5cbiAgICBjb25zdCBERF9WT0xVTUVTID0gW3tcbiAgICAgIG5hbWU6IFwic2VjcmV0cy1zdG9yZS1pbmxpbmVcIixcbiAgICAgIGNzaToge1xuICAgICAgICBkcml2ZXI6IFwic2VjcmV0cy1zdG9yZS5jc2kuazhzLmlvXCIsXG4gICAgICAgIHJlYWRPbmx5OiB0cnVlLFxuICAgICAgICB2b2x1bWVBdHRyaWJ1dGVzOiB7XG4gICAgICAgICAgc2VjcmV0UHJvdmlkZXJDbGFzczogJ2RhdGFkb2ctc2VjcmV0LXByb3ZpZGVyJ1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfV1cblxuICAgIGNvbnN0IEREX1ZPTFVNRV9NT1VOVFMgPSBbe1xuICAgICAgbmFtZTogXCJzZWNyZXRzLXN0b3JlLWlubGluZVwiLFxuICAgICAgbW91bnRQYXRoOiBcIi9tbnQvc2VjcmV0cy9cIixcbiAgICAgIHJlYWRPbmx5OiB0cnVlXG4gICAgfV1cblxuICAgIGNvbnN0IHMgPSBjbHVzdGVyLmFkZE1hbmlmZXN0KCdEYXRhZG9nQWdlbnQnLCB7XG4gICAgICBhcGlWZXJzaW9uOiBcImRhdGFkb2docS5jb20vdjFhbHBoYTFcIixcbiAgICAgIGtpbmQ6IFwiRGF0YWRvZ0FnZW50XCIsXG4gICAgICBtZXRhZGF0YToge1xuICAgICAgICBuYW1lOiBcImRhdGFkb2ctYWdlbnRcIixcbiAgICAgICAgbmFtZXNwYWNlOiBcImRhdGFkb2dcIlxuICAgICAgfSxcbiAgICAgIHNwZWM6IHtcbiAgICAgICAgY3JlZGVudGlhbHM6IHtcbiAgICAgICAgICBhcGlLZXk6IGBFTkNbZmlsZUAvbW50L3NlY3JldHMvJHthcHB9XWAsXG4gICAgICAgICAgYXBwS2V5OiBgRU5DW2ZpbGVAL21udC9zZWNyZXRzLyR7YXBwfV1gLFxuICAgICAgICAgIHVzZVNlY3JldEJhY2tlbmQ6IHRydWVcbiAgICAgICAgfSxcbiAgICAgICAgYWdlbnQ6IHtcbiAgICAgICAgICBlbnY6IEREX0VOVixcbiAgICAgICAgICBjb25maWc6IHtcbiAgICAgICAgICAgIHZvbHVtZXM6IEREX1ZPTFVNRVMsXG4gICAgICAgICAgICB2b2x1bWVNb3VudHM6IEREX1ZPTFVNRV9NT1VOVFNcbiAgICAgICAgICB9LFxuICAgICAgICAgIHJiYWM6IHtcbiAgICAgICAgICAgIGNyZWF0ZTogdHJ1ZSxcbiAgICAgICAgICAgIHNlcnZpY2VBY2NvdW50TmFtZTogc2VydmljZUFjY291bnROYW1lLFxuICAgICAgICAgIH0sXG4gICAgICAgICAgaW1hZ2U6IHtcbiAgICAgICAgICAgIG5hbWU6ICdnY3IuaW8vZGF0YWRvZ2hxL2FnZW50OmxhdGVzdCdcbiAgICAgICAgICB9LFxuICAgICAgICAgIGxvZzoge1xuICAgICAgICAgICAgZW5hYmxlZDogdHJ1ZSxcbiAgICAgICAgICAgIGxvZ3NDb25maWdDb250YWluZXJDb2xsZWN0QWxsOiB0cnVlXG4gICAgICAgICAgfSxcbiAgICAgICAgICBzeXN0ZW1Qcm9iZToge1xuICAgICAgICAgICAgZW52OiBERF9FTlYsXG4gICAgICAgICAgICBicGZEZWJ1Z0VuYWJsZWQ6IGZhbHNlIC8vIGVuYWJsZWQgd2hlbiBidWcgaXMgZml4ZWRcbiAgICAgICAgICB9LFxuICAgICAgICAgIHNlY3VyaXR5OiB7XG4gICAgICAgICAgICBjb21wbGlhbmNlOiB7XG4gICAgICAgICAgICAgIGVuYWJsZWQ6IGZhbHNlIC8vIGVuYWJsZWQgd2hlbiBidWcgaXMgZml4ZWRcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBydW50aW1lOiB7XG4gICAgICAgICAgICAgIGVuYWJsZWQ6IGZhbHNlIC8vIGVuYWJsZWQgd2hlbiBidWcgaXMgZml4ZWRcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9LFxuICAgICAgICAgIGFwbToge1xuICAgICAgICAgICAgZW52OiBERF9FTlYsXG4gICAgICAgICAgICBlbmFibGVkOiBmYWxzZSAvLyBlbmFibGUgd2hlbiBidWcgaXMgZml4ZWRcbiAgICAgICAgICB9LFxuICAgICAgICAgIHByb2Nlc3M6IHtcbiAgICAgICAgICAgIGVuYWJsZWQ6IGZhbHNlLCAvLyBlbmFibGUgd2hlbiBidWcgaXMgZml4ZWRcbiAgICAgICAgICAgIHByb2Nlc3NDb2xsZWN0aW9uRW5hYmxlZDogZmFsc2VcbiAgICAgICAgICB9LFxuICAgICAgICB9LFxuICAgICAgICBjbHVzdGVyQWdlbnQ6IHtcbiAgICAgICAgICBpbWFnZToge1xuICAgICAgICAgICAgbmFtZTogJ2djci5pby9kYXRhZG9naHEvY2x1c3Rlci1hZ2VudDpsYXRlc3QnXG4gICAgICAgICAgfSxcbiAgICAgICAgICByYmFjOiB7XG4gICAgICAgICAgICBjcmVhdGU6IHRydWUsXG4gICAgICAgICAgICBzZXJ2aWNlQWNjb3VudE5hbWU6IHNlcnZpY2VBY2NvdW50TmFtZSxcbiAgICAgICAgICB9LFxuICAgICAgICAgIGNvbmZpZzoge1xuICAgICAgICAgICAgZW52OiBERF9FTlYsXG4gICAgICAgICAgICBleHRlcm5hbE1ldHJpY3M6IHtcbiAgICAgICAgICAgICAgZW5hYmxlZDogdHJ1ZVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGFkbWlzc2lvbkNvbnRyb2xsZXI6IHtcbiAgICAgICAgICAgICAgZW5hYmxlZDogdHJ1ZVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHZvbHVtZXM6IEREX1ZPTFVNRVMsXG4gICAgICAgICAgICB2b2x1bWVNb3VudHM6IEREX1ZPTFVNRV9NT1VOVFNcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcblxuICAgIHJldHVybiBzO1xuICB9XG59XG4iXX0=
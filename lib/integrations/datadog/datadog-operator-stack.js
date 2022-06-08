"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatadogOperatorStack = void 0;
const aws_cdk_lib_1 = require("aws-cdk-lib");
const aws_eks_1 = require("aws-cdk-lib/aws-eks");
const aws_iam_1 = require("aws-cdk-lib/aws-iam");
const helm_chart_1 = require("../../eks/helm-chart");
const permissions_boundary_aspect_1 = require("../../utils/permissions-boundary-aspect");
const datadog_operator_construct_1 = require("./datadog-operator-construct");
class DatadogOperatorStack extends aws_cdk_lib_1.Stack {
    constructor(scope, id, props) {
        super(scope, id, props);
        this.DATADOG_OPERATOR_VERSION = "0.8.0";
        const h = this.installDatadogOperator(props);
        const a = new datadog_operator_construct_1.DatadogAgent(this, 'DatadogOperator', props);
        a.node.addDependency(h);
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
        const cluster = aws_eks_1.Cluster.fromClusterAttributes(this, `${props.clusterName}Ref`, {
            clusterName: props.clusterName,
            kubectlRoleArn: props.kubectlRoleArn,
            openIdConnectProvider: aws_iam_1.OpenIdConnectProvider.fromOpenIdConnectProviderArn(this, 'OpenIDConnectProvider', props.openIdConnectProviderArn),
        });
        // ..TODO.. harshad - This solves the stack name problem - Long term fix required
        const h = new helm_chart_1.HelmChartStack(this.node.root, 'DOH', chart, props.clusterName, props.kubectlRoleArn, {
            stackName: 'DatadogOperatorHelm',
            env: props.env,
            synthesizer: props.operatorSynthesizer,
        });
        if (props.permissionBoundaryRole) {
            aws_cdk_lib_1.Aspects.of(h).add(new permissions_boundary_aspect_1.PermissionsBoundaryAspect());
        }
        else {
            aws_cdk_lib_1.Aspects.of(h).add(new permissions_boundary_aspect_1.PermissionsBoundaryAspect());
        }
        return h;
    }
}
exports.DatadogOperatorStack = DatadogOperatorStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGF0YWRvZy1vcGVyYXRvci1zdGFjay5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImRhdGFkb2ctb3BlcmF0b3Itc3RhY2sudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsNkNBQTZDO0FBQzdDLGlEQUE4QztBQUM5QyxpREFBNEQ7QUFJNUQscURBQXNEO0FBQ3RELHlGQUFvRjtBQUNwRiw2RUFBNEQ7QUFFNUQsTUFBYSxvQkFBcUIsU0FBUSxtQkFBSztJQUk3QyxZQUFZLEtBQWdCLEVBQUUsRUFBVSxFQUFFLEtBQWdDO1FBQ3hFLEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBSDFCLDZCQUF3QixHQUFHLE9BQU8sQ0FBQTtRQUloQyxNQUFNLENBQUMsR0FBRyxJQUFJLENBQUMsc0JBQXNCLENBQUMsS0FBSyxDQUFDLENBQUE7UUFDNUMsTUFBTSxDQUFDLEdBQUcsSUFBSSx5Q0FBWSxDQUFDLElBQUksRUFBRSxpQkFBaUIsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUUxRCxDQUFDLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUV6QixDQUFDO0lBRUQsc0JBQXNCLENBQUMsS0FBZ0M7UUFFckQsTUFBTSxLQUFLLEdBQWE7WUFDdEIsSUFBSSxFQUFFLGlCQUFpQjtZQUN2QixLQUFLLEVBQUUsa0JBQWtCO1lBQ3pCLFNBQVMsRUFBRSxTQUFTO1lBQ3BCLE9BQU8sRUFBRSxJQUFJLElBQUksQ0FBQyx3QkFBd0IsRUFBRTtZQUM1QyxPQUFPLEVBQUUsR0FBRyxJQUFJLENBQUMsd0JBQXdCLEVBQUU7WUFDM0MsT0FBTyxFQUFFLElBQUk7WUFDYixVQUFVLEVBQUUsNEJBQTRCO1lBQ3hDLFdBQVcsRUFBRSxrQ0FBa0MsSUFBSSxDQUFDLHdCQUF3QixFQUFFO1lBQzlFLGVBQWUsRUFBRSxJQUFJO1lBQ3JCLE1BQU0sRUFBRSxFQUFFO1NBQ1gsQ0FBQTtRQUVELE1BQU0sT0FBTyxHQUFHLGlCQUFPLENBQUMscUJBQXFCLENBQUMsSUFBSSxFQUFFLEdBQUcsS0FBSyxDQUFDLFdBQVcsS0FBSyxFQUFFO1lBQzdFLFdBQVcsRUFBRSxLQUFLLENBQUMsV0FBWTtZQUMvQixjQUFjLEVBQUUsS0FBSyxDQUFDLGNBQWU7WUFDckMscUJBQXFCLEVBQUUsK0JBQXFCLENBQUMsNEJBQTRCLENBQUMsSUFBSSxFQUFFLHVCQUF1QixFQUFFLEtBQUssQ0FBQyx3QkFBeUIsQ0FBQztTQUMxSSxDQUFDLENBQUM7UUFDSCxpRkFBaUY7UUFDakYsTUFBTSxDQUFDLEdBQUcsSUFBSSwyQkFBYyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsS0FBSyxDQUFDLFdBQVksRUFBRSxLQUFLLENBQUMsY0FBZSxFQUFFO1lBQ3BHLFNBQVMsRUFBRSxxQkFBcUI7WUFDaEMsR0FBRyxFQUFFLEtBQUssQ0FBQyxHQUFHO1lBQ2QsV0FBVyxFQUFFLEtBQUssQ0FBQyxtQkFBbUI7U0FDdkMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxLQUFLLENBQUMsc0JBQXNCLEVBQUU7WUFBRSxxQkFBTyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSx1REFBeUIsRUFBRSxDQUFDLENBQUE7U0FBRTthQUNuRjtZQUFFLHFCQUFPLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLHVEQUF5QixFQUFFLENBQUMsQ0FBQTtTQUFFO1FBRTNELE9BQU8sQ0FBQyxDQUFBO0lBRVYsQ0FBQztDQUNGO0FBOUNELG9EQThDQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IEFzcGVjdHMsIFN0YWNrIH0gZnJvbSBcImF3cy1jZGstbGliXCI7XG5pbXBvcnQgeyBDbHVzdGVyIH0gZnJvbSBcImF3cy1jZGstbGliL2F3cy1la3NcIjtcbmltcG9ydCB7IE9wZW5JZENvbm5lY3RQcm92aWRlciB9IGZyb20gXCJhd3MtY2RrLWxpYi9hd3MtaWFtXCI7XG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tIFwiY29uc3RydWN0c1wiO1xuaW1wb3J0IHsgRUtTQ2hhcnQgfSBmcm9tIFwiLi4vLi4vLi4vaW50ZXJmYWNlcy9saWIvZWtzL2ludGVyZmFjZXNcIjtcbmltcG9ydCB7IERhdGFkb2dPcGVyYXRvclN0YWNrUHJvcHMgfSBmcm9tIFwiLi4vLi4vLi4vaW50ZXJmYWNlcy9saWIvaW50ZWdyYXRpb25zL2RhdGFkb2cvaW50ZWZhY2VzXCI7XG5pbXBvcnQgeyBIZWxtQ2hhcnRTdGFjayB9IGZyb20gXCIuLi8uLi9la3MvaGVsbS1jaGFydFwiO1xuaW1wb3J0IHsgUGVybWlzc2lvbnNCb3VuZGFyeUFzcGVjdCB9IGZyb20gXCIuLi8uLi91dGlscy9wZXJtaXNzaW9ucy1ib3VuZGFyeS1hc3BlY3RcIjtcbmltcG9ydCB7IERhdGFkb2dBZ2VudCB9IGZyb20gXCIuL2RhdGFkb2ctb3BlcmF0b3ItY29uc3RydWN0XCI7XG5cbmV4cG9ydCBjbGFzcyBEYXRhZG9nT3BlcmF0b3JTdGFjayBleHRlbmRzIFN0YWNrIHtcblxuICBEQVRBRE9HX09QRVJBVE9SX1ZFUlNJT04gPSBcIjAuOC4wXCJcblxuICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nLCBwcm9wczogRGF0YWRvZ09wZXJhdG9yU3RhY2tQcm9wcykge1xuICAgIHN1cGVyKHNjb3BlLCBpZCwgcHJvcHMpO1xuICAgIGNvbnN0IGggPSB0aGlzLmluc3RhbGxEYXRhZG9nT3BlcmF0b3IocHJvcHMpXG4gICAgY29uc3QgYSA9IG5ldyBEYXRhZG9nQWdlbnQodGhpcywgJ0RhdGFkb2dPcGVyYXRvcicsIHByb3BzKVxuXG4gICAgYS5ub2RlLmFkZERlcGVuZGVuY3koaClcblxuICB9XG5cbiAgaW5zdGFsbERhdGFkb2dPcGVyYXRvcihwcm9wczogRGF0YWRvZ09wZXJhdG9yU3RhY2tQcm9wcyk6IFN0YWNrIHtcblxuICAgIGNvbnN0IGNoYXJ0OiBFS1NDaGFydCA9IHtcbiAgICAgIG5hbWU6IFwiRGF0YWRvZ09wZXJhdG9yXCIsXG4gICAgICBjaGFydDogXCJkYXRhZG9nLW9wZXJhdG9yXCIsXG4gICAgICBuYW1lc3BhY2U6IFwiZGF0YWRvZ1wiLFxuICAgICAgcmVsZWFzZTogYHYke3RoaXMuREFUQURPR19PUEVSQVRPUl9WRVJTSU9OfWAsXG4gICAgICB2ZXJzaW9uOiBgJHt0aGlzLkRBVEFET0dfT1BFUkFUT1JfVkVSU0lPTn1gLFxuICAgICAgZW5hYmxlZDogdHJ1ZSxcbiAgICAgIHJlcG9zaXRvcnk6IFwiaHR0cHM6Ly9oZWxtLmRhdGFkb2docS5jb21cIixcbiAgICAgIGRlc2NyaXB0aW9uOiBgRGF0YWRvZyBvcGVyYXRvciBpbnN0YWxsYXRpb24gdiR7dGhpcy5EQVRBRE9HX09QRVJBVE9SX1ZFUlNJT059YCxcbiAgICAgIGNyZWF0ZU5hbWVzcGFjZTogdHJ1ZSxcbiAgICAgIHZhbHVlczoge31cbiAgICB9XG5cbiAgICBjb25zdCBjbHVzdGVyID0gQ2x1c3Rlci5mcm9tQ2x1c3RlckF0dHJpYnV0ZXModGhpcywgYCR7cHJvcHMuY2x1c3Rlck5hbWV9UmVmYCwge1xuICAgICAgY2x1c3Rlck5hbWU6IHByb3BzLmNsdXN0ZXJOYW1lISxcbiAgICAgIGt1YmVjdGxSb2xlQXJuOiBwcm9wcy5rdWJlY3RsUm9sZUFybiEsXG4gICAgICBvcGVuSWRDb25uZWN0UHJvdmlkZXI6IE9wZW5JZENvbm5lY3RQcm92aWRlci5mcm9tT3BlbklkQ29ubmVjdFByb3ZpZGVyQXJuKHRoaXMsICdPcGVuSURDb25uZWN0UHJvdmlkZXInLCBwcm9wcy5vcGVuSWRDb25uZWN0UHJvdmlkZXJBcm4hKSxcbiAgICB9KTtcbiAgICAvLyAuLlRPRE8uLiBoYXJzaGFkIC0gVGhpcyBzb2x2ZXMgdGhlIHN0YWNrIG5hbWUgcHJvYmxlbSAtIExvbmcgdGVybSBmaXggcmVxdWlyZWRcbiAgICBjb25zdCBoID0gbmV3IEhlbG1DaGFydFN0YWNrKHRoaXMubm9kZS5yb290LCAnRE9IJywgY2hhcnQsIHByb3BzLmNsdXN0ZXJOYW1lISwgcHJvcHMua3ViZWN0bFJvbGVBcm4hLCB7XG4gICAgICBzdGFja05hbWU6ICdEYXRhZG9nT3BlcmF0b3JIZWxtJyxcbiAgICAgIGVudjogcHJvcHMuZW52LFxuICAgICAgc3ludGhlc2l6ZXI6IHByb3BzLm9wZXJhdG9yU3ludGhlc2l6ZXIsXG4gICAgfSk7XG5cbiAgICBpZiAocHJvcHMucGVybWlzc2lvbkJvdW5kYXJ5Um9sZSkgeyBBc3BlY3RzLm9mKGgpLmFkZChuZXcgUGVybWlzc2lvbnNCb3VuZGFyeUFzcGVjdCgpKSB9XG4gICAgZWxzZSB7IEFzcGVjdHMub2YoaCkuYWRkKG5ldyBQZXJtaXNzaW9uc0JvdW5kYXJ5QXNwZWN0KCkpIH1cblxuICAgIHJldHVybiBoXG5cbiAgfVxufSJdfQ==
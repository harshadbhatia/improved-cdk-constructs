"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatadogOperatorStack = void 0;
const aws_cdk_lib_1 = require("aws-cdk-lib");
const aws_eks_1 = require("aws-cdk-lib/aws-eks");
const aws_iam_1 = require("aws-cdk-lib/aws-iam");
const helm_chart_1 = require("../../eks/helm-chart");
const permissions_boundary_aspect_1 = require("../../utils/permissions-boundary-aspect");
const datadog_agent_construct_1 = require("./datadog-agent-construct");
class DatadogOperatorStack extends aws_cdk_lib_1.Stack {
    constructor(scope, id, props) {
        super(scope, id, props);
        this.DATADOG_OPERATOR_VERSION = "0.8.0";
        const h = this.installDatadogOperator(props);
        const a = new datadog_agent_construct_1.DatadogAgent(this, 'DatadogOperator', props);
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
        const h = new helm_chart_1.HelmChartStack(this, 'DOH', chart, props.clusterName, props.kubectlRoleArn, {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGF0YWRvZy1vcGVyYXRvci1zdGFjay5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImRhdGFkb2ctb3BlcmF0b3Itc3RhY2sudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsNkNBQTZDO0FBQzdDLGlEQUE4QztBQUM5QyxpREFBNEQ7QUFJNUQscURBQXNEO0FBQ3RELHlGQUFvRjtBQUNwRix1RUFBeUQ7QUFFekQsTUFBYSxvQkFBcUIsU0FBUSxtQkFBSztJQUk3QyxZQUFZLEtBQWdCLEVBQUUsRUFBVSxFQUFFLEtBQWdDO1FBQ3hFLEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBSDFCLDZCQUF3QixHQUFHLE9BQU8sQ0FBQTtRQUloQyxNQUFNLENBQUMsR0FBRyxJQUFJLENBQUMsc0JBQXNCLENBQUMsS0FBSyxDQUFDLENBQUE7UUFDNUMsTUFBTSxDQUFDLEdBQUcsSUFBSSxzQ0FBWSxDQUFDLElBQUksRUFBRSxpQkFBaUIsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUUxRCxDQUFDLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUV6QixDQUFDO0lBRUQsc0JBQXNCLENBQUMsS0FBZ0M7UUFFckQsTUFBTSxLQUFLLEdBQWE7WUFDdEIsSUFBSSxFQUFFLGlCQUFpQjtZQUN2QixLQUFLLEVBQUUsa0JBQWtCO1lBQ3pCLFNBQVMsRUFBRSxTQUFTO1lBQ3BCLE9BQU8sRUFBRSxJQUFJLElBQUksQ0FBQyx3QkFBd0IsRUFBRTtZQUM1QyxPQUFPLEVBQUUsR0FBRyxJQUFJLENBQUMsd0JBQXdCLEVBQUU7WUFDM0MsT0FBTyxFQUFFLElBQUk7WUFDYixVQUFVLEVBQUUsNEJBQTRCO1lBQ3hDLFdBQVcsRUFBRSxrQ0FBa0MsSUFBSSxDQUFDLHdCQUF3QixFQUFFO1lBQzlFLGVBQWUsRUFBRSxJQUFJO1lBQ3JCLE1BQU0sRUFBRSxFQUFFO1NBQ1gsQ0FBQTtRQUVELE1BQU0sT0FBTyxHQUFHLGlCQUFPLENBQUMscUJBQXFCLENBQUMsSUFBSSxFQUFFLEdBQUcsS0FBSyxDQUFDLFdBQVcsS0FBSyxFQUFFO1lBQzdFLFdBQVcsRUFBRSxLQUFLLENBQUMsV0FBWTtZQUMvQixjQUFjLEVBQUUsS0FBSyxDQUFDLGNBQWU7WUFDckMscUJBQXFCLEVBQUUsK0JBQXFCLENBQUMsNEJBQTRCLENBQUMsSUFBSSxFQUFFLHVCQUF1QixFQUFFLEtBQUssQ0FBQyx3QkFBeUIsQ0FBQztTQUMxSSxDQUFDLENBQUM7UUFDSCxpRkFBaUY7UUFDakYsTUFBTSxDQUFDLEdBQUcsSUFBSSwyQkFBYyxDQUFDLElBQUksRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLEtBQUssQ0FBQyxXQUFZLEVBQUUsS0FBSyxDQUFDLGNBQWUsRUFBRTtZQUMxRixTQUFTLEVBQUUscUJBQXFCO1lBQ2hDLEdBQUcsRUFBRSxLQUFLLENBQUMsR0FBRztZQUNkLFdBQVcsRUFBRSxLQUFLLENBQUMsbUJBQW1CO1NBQ3ZDLENBQUMsQ0FBQztRQUVILElBQUksS0FBSyxDQUFDLHNCQUFzQixFQUFFO1lBQUUscUJBQU8sQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksdURBQXlCLEVBQUUsQ0FBQyxDQUFBO1NBQUU7YUFDbkY7WUFBRSxxQkFBTyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSx1REFBeUIsRUFBRSxDQUFDLENBQUE7U0FBRTtRQUUzRCxPQUFPLENBQUMsQ0FBQTtJQUVWLENBQUM7Q0FDRjtBQTlDRCxvREE4Q0MiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBBc3BlY3RzLCBTdGFjayB9IGZyb20gXCJhd3MtY2RrLWxpYlwiO1xuaW1wb3J0IHsgQ2x1c3RlciB9IGZyb20gXCJhd3MtY2RrLWxpYi9hd3MtZWtzXCI7XG5pbXBvcnQgeyBPcGVuSWRDb25uZWN0UHJvdmlkZXIgfSBmcm9tIFwiYXdzLWNkay1saWIvYXdzLWlhbVwiO1xuaW1wb3J0IHsgQ29uc3RydWN0IH0gZnJvbSBcImNvbnN0cnVjdHNcIjtcbmltcG9ydCB7IEVLU0NoYXJ0IH0gZnJvbSBcIi4uLy4uLy4uL2ludGVyZmFjZXMvbGliL2Vrcy9pbnRlcmZhY2VzXCI7XG5pbXBvcnQgeyBEYXRhZG9nT3BlcmF0b3JTdGFja1Byb3BzIH0gZnJvbSBcIi4uLy4uLy4uL2ludGVyZmFjZXMvbGliL2ludGVncmF0aW9ucy9kYXRhZG9nL2ludGVmYWNlc1wiO1xuaW1wb3J0IHsgSGVsbUNoYXJ0U3RhY2sgfSBmcm9tIFwiLi4vLi4vZWtzL2hlbG0tY2hhcnRcIjtcbmltcG9ydCB7IFBlcm1pc3Npb25zQm91bmRhcnlBc3BlY3QgfSBmcm9tIFwiLi4vLi4vdXRpbHMvcGVybWlzc2lvbnMtYm91bmRhcnktYXNwZWN0XCI7XG5pbXBvcnQgeyBEYXRhZG9nQWdlbnQgfSBmcm9tIFwiLi9kYXRhZG9nLWFnZW50LWNvbnN0cnVjdFwiO1xuXG5leHBvcnQgY2xhc3MgRGF0YWRvZ09wZXJhdG9yU3RhY2sgZXh0ZW5kcyBTdGFjayB7XG5cbiAgREFUQURPR19PUEVSQVRPUl9WRVJTSU9OID0gXCIwLjguMFwiXG5cbiAgY29uc3RydWN0b3Ioc2NvcGU6IENvbnN0cnVjdCwgaWQ6IHN0cmluZywgcHJvcHM6IERhdGFkb2dPcGVyYXRvclN0YWNrUHJvcHMpIHtcbiAgICBzdXBlcihzY29wZSwgaWQsIHByb3BzKTtcbiAgICBjb25zdCBoID0gdGhpcy5pbnN0YWxsRGF0YWRvZ09wZXJhdG9yKHByb3BzKVxuICAgIGNvbnN0IGEgPSBuZXcgRGF0YWRvZ0FnZW50KHRoaXMsICdEYXRhZG9nT3BlcmF0b3InLCBwcm9wcylcblxuICAgIGEubm9kZS5hZGREZXBlbmRlbmN5KGgpXG5cbiAgfVxuXG4gIGluc3RhbGxEYXRhZG9nT3BlcmF0b3IocHJvcHM6IERhdGFkb2dPcGVyYXRvclN0YWNrUHJvcHMpOiBTdGFjayB7XG5cbiAgICBjb25zdCBjaGFydDogRUtTQ2hhcnQgPSB7XG4gICAgICBuYW1lOiBcIkRhdGFkb2dPcGVyYXRvclwiLFxuICAgICAgY2hhcnQ6IFwiZGF0YWRvZy1vcGVyYXRvclwiLFxuICAgICAgbmFtZXNwYWNlOiBcImRhdGFkb2dcIixcbiAgICAgIHJlbGVhc2U6IGB2JHt0aGlzLkRBVEFET0dfT1BFUkFUT1JfVkVSU0lPTn1gLFxuICAgICAgdmVyc2lvbjogYCR7dGhpcy5EQVRBRE9HX09QRVJBVE9SX1ZFUlNJT059YCxcbiAgICAgIGVuYWJsZWQ6IHRydWUsXG4gICAgICByZXBvc2l0b3J5OiBcImh0dHBzOi8vaGVsbS5kYXRhZG9naHEuY29tXCIsXG4gICAgICBkZXNjcmlwdGlvbjogYERhdGFkb2cgb3BlcmF0b3IgaW5zdGFsbGF0aW9uIHYke3RoaXMuREFUQURPR19PUEVSQVRPUl9WRVJTSU9OfWAsXG4gICAgICBjcmVhdGVOYW1lc3BhY2U6IHRydWUsXG4gICAgICB2YWx1ZXM6IHt9XG4gICAgfVxuXG4gICAgY29uc3QgY2x1c3RlciA9IENsdXN0ZXIuZnJvbUNsdXN0ZXJBdHRyaWJ1dGVzKHRoaXMsIGAke3Byb3BzLmNsdXN0ZXJOYW1lfVJlZmAsIHtcbiAgICAgIGNsdXN0ZXJOYW1lOiBwcm9wcy5jbHVzdGVyTmFtZSEsXG4gICAgICBrdWJlY3RsUm9sZUFybjogcHJvcHMua3ViZWN0bFJvbGVBcm4hLFxuICAgICAgb3BlbklkQ29ubmVjdFByb3ZpZGVyOiBPcGVuSWRDb25uZWN0UHJvdmlkZXIuZnJvbU9wZW5JZENvbm5lY3RQcm92aWRlckFybih0aGlzLCAnT3BlbklEQ29ubmVjdFByb3ZpZGVyJywgcHJvcHMub3BlbklkQ29ubmVjdFByb3ZpZGVyQXJuISksXG4gICAgfSk7XG4gICAgLy8gLi5UT0RPLi4gaGFyc2hhZCAtIFRoaXMgc29sdmVzIHRoZSBzdGFjayBuYW1lIHByb2JsZW0gLSBMb25nIHRlcm0gZml4IHJlcXVpcmVkXG4gICAgY29uc3QgaCA9IG5ldyBIZWxtQ2hhcnRTdGFjayh0aGlzLCAnRE9IJywgY2hhcnQsIHByb3BzLmNsdXN0ZXJOYW1lISwgcHJvcHMua3ViZWN0bFJvbGVBcm4hLCB7XG4gICAgICBzdGFja05hbWU6ICdEYXRhZG9nT3BlcmF0b3JIZWxtJyxcbiAgICAgIGVudjogcHJvcHMuZW52LFxuICAgICAgc3ludGhlc2l6ZXI6IHByb3BzLm9wZXJhdG9yU3ludGhlc2l6ZXIsXG4gICAgfSk7XG5cbiAgICBpZiAocHJvcHMucGVybWlzc2lvbkJvdW5kYXJ5Um9sZSkgeyBBc3BlY3RzLm9mKGgpLmFkZChuZXcgUGVybWlzc2lvbnNCb3VuZGFyeUFzcGVjdCgpKSB9XG4gICAgZWxzZSB7IEFzcGVjdHMub2YoaCkuYWRkKG5ldyBQZXJtaXNzaW9uc0JvdW5kYXJ5QXNwZWN0KCkpIH1cblxuICAgIHJldHVybiBoXG5cbiAgfVxufSJdfQ==
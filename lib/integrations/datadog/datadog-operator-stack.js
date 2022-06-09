"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatadogOperatorStack = void 0;
const aws_cdk_lib_1 = require("aws-cdk-lib");
const aws_eks_1 = require("aws-cdk-lib/aws-eks");
const aws_iam_1 = require("aws-cdk-lib/aws-iam");
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
        const h = cluster.addHelmChart(chart.name, {
            chart: chart.chart,
            namespace: chart.namespace,
            repository: chart.repository,
            values: chart.values,
            release: chart.release,
            version: chart.version,
            createNamespace: chart.createNamespace,
        });
        return h;
    }
}
exports.DatadogOperatorStack = DatadogOperatorStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGF0YWRvZy1vcGVyYXRvci1zdGFjay5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImRhdGFkb2ctb3BlcmF0b3Itc3RhY2sudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsNkNBQW9DO0FBQ3BDLGlEQUF5RDtBQUN6RCxpREFBNEQ7QUFJNUQsdUVBQXlEO0FBRXpELE1BQWEsb0JBQXFCLFNBQVEsbUJBQUs7SUFJN0MsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxLQUFnQztRQUN4RSxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUgxQiw2QkFBd0IsR0FBRyxPQUFPLENBQUE7UUFJaEMsTUFBTSxDQUFDLEdBQUcsSUFBSSxDQUFDLHNCQUFzQixDQUFDLEtBQUssQ0FBQyxDQUFBO1FBQzVDLE1BQU0sQ0FBQyxHQUFHLElBQUksc0NBQVksQ0FBQyxJQUFJLEVBQUUsaUJBQWlCLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFFMUQsQ0FBQyxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFFekIsQ0FBQztJQUVELHNCQUFzQixDQUFDLEtBQWdDO1FBRXJELE1BQU0sS0FBSyxHQUFhO1lBQ3RCLElBQUksRUFBRSxpQkFBaUI7WUFDdkIsS0FBSyxFQUFFLGtCQUFrQjtZQUN6QixTQUFTLEVBQUUsU0FBUztZQUNwQixPQUFPLEVBQUUsSUFBSSxJQUFJLENBQUMsd0JBQXdCLEVBQUU7WUFDNUMsT0FBTyxFQUFFLEdBQUcsSUFBSSxDQUFDLHdCQUF3QixFQUFFO1lBQzNDLE9BQU8sRUFBRSxJQUFJO1lBQ2IsVUFBVSxFQUFFLDRCQUE0QjtZQUN4QyxXQUFXLEVBQUUsa0NBQWtDLElBQUksQ0FBQyx3QkFBd0IsRUFBRTtZQUM5RSxlQUFlLEVBQUUsSUFBSTtZQUNyQixNQUFNLEVBQUUsRUFBRTtTQUNYLENBQUE7UUFFRCxNQUFNLE9BQU8sR0FBRyxpQkFBTyxDQUFDLHFCQUFxQixDQUFDLElBQUksRUFBRSxHQUFHLEtBQUssQ0FBQyxXQUFXLEtBQUssRUFBRTtZQUM3RSxXQUFXLEVBQUUsS0FBSyxDQUFDLFdBQVk7WUFDL0IsY0FBYyxFQUFFLEtBQUssQ0FBQyxjQUFlO1lBQ3JDLHFCQUFxQixFQUFFLCtCQUFxQixDQUFDLDRCQUE0QixDQUFDLElBQUksRUFBRSx1QkFBdUIsRUFBRSxLQUFLLENBQUMsd0JBQXlCLENBQUM7U0FDMUksQ0FBQyxDQUFDO1FBRUgsTUFBTSxDQUFDLEdBQUcsT0FBTyxDQUFDLFlBQVksQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFO1lBQ3pDLEtBQUssRUFBRSxLQUFLLENBQUMsS0FBSztZQUNsQixTQUFTLEVBQUUsS0FBSyxDQUFDLFNBQVM7WUFDMUIsVUFBVSxFQUFFLEtBQUssQ0FBQyxVQUFVO1lBQzVCLE1BQU0sRUFBRSxLQUFLLENBQUMsTUFBTTtZQUNwQixPQUFPLEVBQUUsS0FBSyxDQUFDLE9BQU87WUFDdEIsT0FBTyxFQUFFLEtBQUssQ0FBQyxPQUFPO1lBQ3RCLGVBQWUsRUFBRSxLQUFLLENBQUMsZUFBZTtTQUN2QyxDQUFDLENBQUM7UUFHSCxPQUFPLENBQUMsQ0FBQTtJQUVWLENBQUM7Q0FDRjtBQWhERCxvREFnREMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBTdGFjayB9IGZyb20gXCJhd3MtY2RrLWxpYlwiO1xuaW1wb3J0IHsgQ2x1c3RlciwgSGVsbUNoYXJ0IH0gZnJvbSBcImF3cy1jZGstbGliL2F3cy1la3NcIjtcbmltcG9ydCB7IE9wZW5JZENvbm5lY3RQcm92aWRlciB9IGZyb20gXCJhd3MtY2RrLWxpYi9hd3MtaWFtXCI7XG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tIFwiY29uc3RydWN0c1wiO1xuaW1wb3J0IHsgRUtTQ2hhcnQgfSBmcm9tIFwiLi4vLi4vLi4vaW50ZXJmYWNlcy9saWIvZWtzL2ludGVyZmFjZXNcIjtcbmltcG9ydCB7IERhdGFkb2dPcGVyYXRvclN0YWNrUHJvcHMgfSBmcm9tIFwiLi4vLi4vLi4vaW50ZXJmYWNlcy9saWIvaW50ZWdyYXRpb25zL2RhdGFkb2cvaW50ZWZhY2VzXCI7XG5pbXBvcnQgeyBEYXRhZG9nQWdlbnQgfSBmcm9tIFwiLi9kYXRhZG9nLWFnZW50LWNvbnN0cnVjdFwiO1xuXG5leHBvcnQgY2xhc3MgRGF0YWRvZ09wZXJhdG9yU3RhY2sgZXh0ZW5kcyBTdGFjayB7XG5cbiAgREFUQURPR19PUEVSQVRPUl9WRVJTSU9OID0gXCIwLjguMFwiXG5cbiAgY29uc3RydWN0b3Ioc2NvcGU6IENvbnN0cnVjdCwgaWQ6IHN0cmluZywgcHJvcHM6IERhdGFkb2dPcGVyYXRvclN0YWNrUHJvcHMpIHtcbiAgICBzdXBlcihzY29wZSwgaWQsIHByb3BzKTtcbiAgICBjb25zdCBoID0gdGhpcy5pbnN0YWxsRGF0YWRvZ09wZXJhdG9yKHByb3BzKVxuICAgIGNvbnN0IGEgPSBuZXcgRGF0YWRvZ0FnZW50KHRoaXMsICdEYXRhZG9nT3BlcmF0b3InLCBwcm9wcylcblxuICAgIGEubm9kZS5hZGREZXBlbmRlbmN5KGgpXG5cbiAgfVxuXG4gIGluc3RhbGxEYXRhZG9nT3BlcmF0b3IocHJvcHM6IERhdGFkb2dPcGVyYXRvclN0YWNrUHJvcHMpOiBIZWxtQ2hhcnQge1xuXG4gICAgY29uc3QgY2hhcnQ6IEVLU0NoYXJ0ID0ge1xuICAgICAgbmFtZTogXCJEYXRhZG9nT3BlcmF0b3JcIixcbiAgICAgIGNoYXJ0OiBcImRhdGFkb2ctb3BlcmF0b3JcIixcbiAgICAgIG5hbWVzcGFjZTogXCJkYXRhZG9nXCIsXG4gICAgICByZWxlYXNlOiBgdiR7dGhpcy5EQVRBRE9HX09QRVJBVE9SX1ZFUlNJT059YCxcbiAgICAgIHZlcnNpb246IGAke3RoaXMuREFUQURPR19PUEVSQVRPUl9WRVJTSU9OfWAsXG4gICAgICBlbmFibGVkOiB0cnVlLFxuICAgICAgcmVwb3NpdG9yeTogXCJodHRwczovL2hlbG0uZGF0YWRvZ2hxLmNvbVwiLFxuICAgICAgZGVzY3JpcHRpb246IGBEYXRhZG9nIG9wZXJhdG9yIGluc3RhbGxhdGlvbiB2JHt0aGlzLkRBVEFET0dfT1BFUkFUT1JfVkVSU0lPTn1gLFxuICAgICAgY3JlYXRlTmFtZXNwYWNlOiB0cnVlLFxuICAgICAgdmFsdWVzOiB7fVxuICAgIH1cblxuICAgIGNvbnN0IGNsdXN0ZXIgPSBDbHVzdGVyLmZyb21DbHVzdGVyQXR0cmlidXRlcyh0aGlzLCBgJHtwcm9wcy5jbHVzdGVyTmFtZX1SZWZgLCB7XG4gICAgICBjbHVzdGVyTmFtZTogcHJvcHMuY2x1c3Rlck5hbWUhLFxuICAgICAga3ViZWN0bFJvbGVBcm46IHByb3BzLmt1YmVjdGxSb2xlQXJuISxcbiAgICAgIG9wZW5JZENvbm5lY3RQcm92aWRlcjogT3BlbklkQ29ubmVjdFByb3ZpZGVyLmZyb21PcGVuSWRDb25uZWN0UHJvdmlkZXJBcm4odGhpcywgJ09wZW5JRENvbm5lY3RQcm92aWRlcicsIHByb3BzLm9wZW5JZENvbm5lY3RQcm92aWRlckFybiEpLFxuICAgIH0pO1xuXG4gICAgY29uc3QgaCA9IGNsdXN0ZXIuYWRkSGVsbUNoYXJ0KGNoYXJ0Lm5hbWUsIHtcbiAgICAgIGNoYXJ0OiBjaGFydC5jaGFydCxcbiAgICAgIG5hbWVzcGFjZTogY2hhcnQubmFtZXNwYWNlLFxuICAgICAgcmVwb3NpdG9yeTogY2hhcnQucmVwb3NpdG9yeSxcbiAgICAgIHZhbHVlczogY2hhcnQudmFsdWVzLFxuICAgICAgcmVsZWFzZTogY2hhcnQucmVsZWFzZSxcbiAgICAgIHZlcnNpb246IGNoYXJ0LnZlcnNpb24sXG4gICAgICBjcmVhdGVOYW1lc3BhY2U6IGNoYXJ0LmNyZWF0ZU5hbWVzcGFjZSxcbiAgICB9KTtcblxuXG4gICAgcmV0dXJuIGhcblxuICB9XG59Il19
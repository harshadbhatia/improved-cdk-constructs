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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGF0YWRvZy1vcGVyYXRvci1zdGFjay5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImRhdGFkb2ctb3BlcmF0b3Itc3RhY2sudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsNkNBQTZDO0FBQzdDLGlEQUF5RDtBQUN6RCxpREFBNEQ7QUFNNUQsdUVBQXlEO0FBRXpELE1BQWEsb0JBQXFCLFNBQVEsbUJBQUs7SUFJN0MsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxLQUFnQztRQUN4RSxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUgxQiw2QkFBd0IsR0FBRyxPQUFPLENBQUE7UUFJaEMsTUFBTSxDQUFDLEdBQUcsSUFBSSxDQUFDLHNCQUFzQixDQUFDLEtBQUssQ0FBQyxDQUFBO1FBQzVDLE1BQU0sQ0FBQyxHQUFHLElBQUksc0NBQVksQ0FBQyxJQUFJLEVBQUUsaUJBQWlCLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFFMUQsQ0FBQyxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFFekIsQ0FBQztJQUVELHNCQUFzQixDQUFDLEtBQWdDO1FBRXJELE1BQU0sS0FBSyxHQUFhO1lBQ3RCLElBQUksRUFBRSxpQkFBaUI7WUFDdkIsS0FBSyxFQUFFLGtCQUFrQjtZQUN6QixTQUFTLEVBQUUsU0FBUztZQUNwQixPQUFPLEVBQUUsSUFBSSxJQUFJLENBQUMsd0JBQXdCLEVBQUU7WUFDNUMsT0FBTyxFQUFFLEdBQUcsSUFBSSxDQUFDLHdCQUF3QixFQUFFO1lBQzNDLE9BQU8sRUFBRSxJQUFJO1lBQ2IsVUFBVSxFQUFFLDRCQUE0QjtZQUN4QyxXQUFXLEVBQUUsa0NBQWtDLElBQUksQ0FBQyx3QkFBd0IsRUFBRTtZQUM5RSxlQUFlLEVBQUUsSUFBSTtZQUNyQixNQUFNLEVBQUUsRUFBRTtTQUNYLENBQUE7UUFFRCxNQUFNLE9BQU8sR0FBRyxpQkFBTyxDQUFDLHFCQUFxQixDQUFDLElBQUksRUFBRSxHQUFHLEtBQUssQ0FBQyxXQUFXLEtBQUssRUFBRTtZQUM3RSxXQUFXLEVBQUUsS0FBSyxDQUFDLFdBQVk7WUFDL0IsY0FBYyxFQUFFLEtBQUssQ0FBQyxjQUFlO1lBQ3JDLHFCQUFxQixFQUFFLCtCQUFxQixDQUFDLDRCQUE0QixDQUFDLElBQUksRUFBRSx1QkFBdUIsRUFBRSxLQUFLLENBQUMsd0JBQXlCLENBQUM7U0FDMUksQ0FBQyxDQUFDO1FBRUgsTUFBTSxDQUFDLEdBQUcsT0FBTyxDQUFDLFlBQVksQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFO1lBRXpDLEtBQUssRUFBRSxLQUFLLENBQUMsS0FBSztZQUNsQixTQUFTLEVBQUUsS0FBSyxDQUFDLFNBQVM7WUFDMUIsVUFBVSxFQUFFLEtBQUssQ0FBQyxVQUFVO1lBQzVCLE1BQU0sRUFBRSxLQUFLLENBQUMsTUFBTTtZQUNwQixPQUFPLEVBQUUsS0FBSyxDQUFDLE9BQU87WUFDdEIsT0FBTyxFQUFFLEtBQUssQ0FBQyxPQUFPO1lBQ3RCLGVBQWUsRUFBRSxLQUFLLENBQUMsZUFBZTtTQUN2QyxDQUFDLENBQUM7UUFHSCxPQUFPLENBQUMsQ0FBQTtJQUVWLENBQUM7Q0FDRjtBQWpERCxvREFpREMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBBc3BlY3RzLCBTdGFjayB9IGZyb20gXCJhd3MtY2RrLWxpYlwiO1xuaW1wb3J0IHsgQ2x1c3RlciwgSGVsbUNoYXJ0IH0gZnJvbSBcImF3cy1jZGstbGliL2F3cy1la3NcIjtcbmltcG9ydCB7IE9wZW5JZENvbm5lY3RQcm92aWRlciB9IGZyb20gXCJhd3MtY2RrLWxpYi9hd3MtaWFtXCI7XG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tIFwiY29uc3RydWN0c1wiO1xuaW1wb3J0IHsgRUtTQ2hhcnQgfSBmcm9tIFwiLi4vLi4vLi4vaW50ZXJmYWNlcy9saWIvZWtzL2ludGVyZmFjZXNcIjtcbmltcG9ydCB7IERhdGFkb2dPcGVyYXRvclN0YWNrUHJvcHMgfSBmcm9tIFwiLi4vLi4vLi4vaW50ZXJmYWNlcy9saWIvaW50ZWdyYXRpb25zL2RhdGFkb2cvaW50ZWZhY2VzXCI7XG5pbXBvcnQgeyBIZWxtQ2hhcnRTdGFjayB9IGZyb20gXCIuLi8uLi9la3MvaGVsbS1jaGFydFwiO1xuaW1wb3J0IHsgUGVybWlzc2lvbnNCb3VuZGFyeUFzcGVjdCB9IGZyb20gXCIuLi8uLi91dGlscy9wZXJtaXNzaW9ucy1ib3VuZGFyeS1hc3BlY3RcIjtcbmltcG9ydCB7IERhdGFkb2dBZ2VudCB9IGZyb20gXCIuL2RhdGFkb2ctYWdlbnQtY29uc3RydWN0XCI7XG5cbmV4cG9ydCBjbGFzcyBEYXRhZG9nT3BlcmF0b3JTdGFjayBleHRlbmRzIFN0YWNrIHtcblxuICBEQVRBRE9HX09QRVJBVE9SX1ZFUlNJT04gPSBcIjAuOC4wXCJcblxuICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nLCBwcm9wczogRGF0YWRvZ09wZXJhdG9yU3RhY2tQcm9wcykge1xuICAgIHN1cGVyKHNjb3BlLCBpZCwgcHJvcHMpO1xuICAgIGNvbnN0IGggPSB0aGlzLmluc3RhbGxEYXRhZG9nT3BlcmF0b3IocHJvcHMpXG4gICAgY29uc3QgYSA9IG5ldyBEYXRhZG9nQWdlbnQodGhpcywgJ0RhdGFkb2dPcGVyYXRvcicsIHByb3BzKVxuXG4gICAgYS5ub2RlLmFkZERlcGVuZGVuY3koaClcblxuICB9XG5cbiAgaW5zdGFsbERhdGFkb2dPcGVyYXRvcihwcm9wczogRGF0YWRvZ09wZXJhdG9yU3RhY2tQcm9wcyk6IEhlbG1DaGFydCB7XG5cbiAgICBjb25zdCBjaGFydDogRUtTQ2hhcnQgPSB7XG4gICAgICBuYW1lOiBcIkRhdGFkb2dPcGVyYXRvclwiLFxuICAgICAgY2hhcnQ6IFwiZGF0YWRvZy1vcGVyYXRvclwiLFxuICAgICAgbmFtZXNwYWNlOiBcImRhdGFkb2dcIixcbiAgICAgIHJlbGVhc2U6IGB2JHt0aGlzLkRBVEFET0dfT1BFUkFUT1JfVkVSU0lPTn1gLFxuICAgICAgdmVyc2lvbjogYCR7dGhpcy5EQVRBRE9HX09QRVJBVE9SX1ZFUlNJT059YCxcbiAgICAgIGVuYWJsZWQ6IHRydWUsXG4gICAgICByZXBvc2l0b3J5OiBcImh0dHBzOi8vaGVsbS5kYXRhZG9naHEuY29tXCIsXG4gICAgICBkZXNjcmlwdGlvbjogYERhdGFkb2cgb3BlcmF0b3IgaW5zdGFsbGF0aW9uIHYke3RoaXMuREFUQURPR19PUEVSQVRPUl9WRVJTSU9OfWAsXG4gICAgICBjcmVhdGVOYW1lc3BhY2U6IHRydWUsXG4gICAgICB2YWx1ZXM6IHt9XG4gICAgfVxuXG4gICAgY29uc3QgY2x1c3RlciA9IENsdXN0ZXIuZnJvbUNsdXN0ZXJBdHRyaWJ1dGVzKHRoaXMsIGAke3Byb3BzLmNsdXN0ZXJOYW1lfVJlZmAsIHtcbiAgICAgIGNsdXN0ZXJOYW1lOiBwcm9wcy5jbHVzdGVyTmFtZSEsXG4gICAgICBrdWJlY3RsUm9sZUFybjogcHJvcHMua3ViZWN0bFJvbGVBcm4hLFxuICAgICAgb3BlbklkQ29ubmVjdFByb3ZpZGVyOiBPcGVuSWRDb25uZWN0UHJvdmlkZXIuZnJvbU9wZW5JZENvbm5lY3RQcm92aWRlckFybih0aGlzLCAnT3BlbklEQ29ubmVjdFByb3ZpZGVyJywgcHJvcHMub3BlbklkQ29ubmVjdFByb3ZpZGVyQXJuISksXG4gICAgfSk7XG5cbiAgICBjb25zdCBoID0gY2x1c3Rlci5hZGRIZWxtQ2hhcnQoY2hhcnQubmFtZSwge1xuXG4gICAgICBjaGFydDogY2hhcnQuY2hhcnQsXG4gICAgICBuYW1lc3BhY2U6IGNoYXJ0Lm5hbWVzcGFjZSxcbiAgICAgIHJlcG9zaXRvcnk6IGNoYXJ0LnJlcG9zaXRvcnksXG4gICAgICB2YWx1ZXM6IGNoYXJ0LnZhbHVlcyxcbiAgICAgIHJlbGVhc2U6IGNoYXJ0LnJlbGVhc2UsXG4gICAgICB2ZXJzaW9uOiBjaGFydC52ZXJzaW9uLFxuICAgICAgY3JlYXRlTmFtZXNwYWNlOiBjaGFydC5jcmVhdGVOYW1lc3BhY2UsXG4gICAgfSk7XG5cblxuICAgIHJldHVybiBoXG5cbiAgfVxufSJdfQ==
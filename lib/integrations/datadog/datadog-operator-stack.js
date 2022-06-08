"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatadogOperatorStack = void 0;
const aws_cdk_lib_1 = require("aws-cdk-lib");
const aws_eks_1 = require("aws-cdk-lib/aws-eks");
const aws_iam_1 = require("aws-cdk-lib/aws-iam");
const helm_chart_1 = require("../../eks/helm-chart");
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
        // Create secret
        const cluster = aws_eks_1.Cluster.fromClusterAttributes(this, `${props.clusterName}Ref`, {
            clusterName: props.clusterName,
            kubectlRoleArn: props.kubectlRoleArn,
            openIdConnectProvider: aws_iam_1.OpenIdConnectProvider.fromOpenIdConnectProviderArn(this, 'OpenIDConnectProvider', props.openIdConnectProviderArn),
        });
        // ..TODO.. harshad - This solves the stack name problem - Long term fix required
        const h = new helm_chart_1.HelmChartStack(this.node.root, 'DatadogOperatorHelm', chart, props.clusterName, props.kubectlRoleArn, {
            stackName: 'DatadogOperatorHelm',
            env: props.env,
            synthesizer: props.operatorSynthesizer,
        });
        return h;
    }
}
exports.DatadogOperatorStack = DatadogOperatorStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGF0YWRvZy1vcGVyYXRvci1zdGFjay5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImRhdGFkb2ctb3BlcmF0b3Itc3RhY2sudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsNkNBQW9DO0FBQ3BDLGlEQUE4QztBQUM5QyxpREFBNEQ7QUFJNUQscURBQXNEO0FBQ3RELDZFQUE0RDtBQUU1RCxNQUFhLG9CQUFxQixTQUFRLG1CQUFLO0lBSTdDLFlBQVksS0FBZ0IsRUFBRSxFQUFVLEVBQUUsS0FBZ0M7UUFDeEUsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFIMUIsNkJBQXdCLEdBQUcsT0FBTyxDQUFBO1FBSWhDLE1BQU0sQ0FBQyxHQUFHLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxLQUFLLENBQUMsQ0FBQTtRQUM1QyxNQUFNLENBQUMsR0FBRyxJQUFJLHlDQUFZLENBQUMsSUFBSSxFQUFFLGlCQUFpQixFQUFFLEtBQUssQ0FBQyxDQUFBO1FBRTFELENBQUMsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxDQUFBO0lBRXpCLENBQUM7SUFFRCxzQkFBc0IsQ0FBQyxLQUFnQztRQUVyRCxNQUFNLEtBQUssR0FBYTtZQUN0QixJQUFJLEVBQUUsaUJBQWlCO1lBQ3ZCLEtBQUssRUFBRSxrQkFBa0I7WUFDekIsU0FBUyxFQUFFLFNBQVM7WUFDcEIsT0FBTyxFQUFFLElBQUksSUFBSSxDQUFDLHdCQUF3QixFQUFFO1lBQzVDLE9BQU8sRUFBRSxHQUFHLElBQUksQ0FBQyx3QkFBd0IsRUFBRTtZQUMzQyxPQUFPLEVBQUUsSUFBSTtZQUNiLFVBQVUsRUFBRSw0QkFBNEI7WUFDeEMsV0FBVyxFQUFFLGtDQUFrQyxJQUFJLENBQUMsd0JBQXdCLEVBQUU7WUFDOUUsZUFBZSxFQUFFLElBQUk7WUFDckIsTUFBTSxFQUFFLEVBQUU7U0FDWCxDQUFBO1FBRUQsZ0JBQWdCO1FBQ2hCLE1BQU0sT0FBTyxHQUFHLGlCQUFPLENBQUMscUJBQXFCLENBQUMsSUFBSSxFQUFFLEdBQUcsS0FBSyxDQUFDLFdBQVcsS0FBSyxFQUFFO1lBQzdFLFdBQVcsRUFBRSxLQUFLLENBQUMsV0FBWTtZQUMvQixjQUFjLEVBQUUsS0FBSyxDQUFDLGNBQWU7WUFDckMscUJBQXFCLEVBQUUsK0JBQXFCLENBQUMsNEJBQTRCLENBQUMsSUFBSSxFQUFFLHVCQUF1QixFQUFFLEtBQUssQ0FBQyx3QkFBeUIsQ0FBQztTQUMxSSxDQUFDLENBQUM7UUFDSCxpRkFBaUY7UUFDakYsTUFBTSxDQUFDLEdBQUcsSUFBSSwyQkFBYyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLHFCQUFxQixFQUFFLEtBQUssRUFBRSxLQUFLLENBQUMsV0FBWSxFQUFFLEtBQUssQ0FBQyxjQUFlLEVBQUU7WUFDcEgsU0FBUyxFQUFFLHFCQUFxQjtZQUNoQyxHQUFHLEVBQUUsS0FBSyxDQUFDLEdBQUc7WUFDZCxXQUFXLEVBQUUsS0FBSyxDQUFDLG1CQUFtQjtTQUN2QyxDQUFDLENBQUM7UUFFSCxPQUFPLENBQUMsQ0FBQTtJQUVWLENBQUM7Q0FDRjtBQTVDRCxvREE0Q0MiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBTdGFjayB9IGZyb20gXCJhd3MtY2RrLWxpYlwiO1xuaW1wb3J0IHsgQ2x1c3RlciB9IGZyb20gXCJhd3MtY2RrLWxpYi9hd3MtZWtzXCI7XG5pbXBvcnQgeyBPcGVuSWRDb25uZWN0UHJvdmlkZXIgfSBmcm9tIFwiYXdzLWNkay1saWIvYXdzLWlhbVwiO1xuaW1wb3J0IHsgQ29uc3RydWN0IH0gZnJvbSBcImNvbnN0cnVjdHNcIjtcbmltcG9ydCB7IEVLU0NoYXJ0IH0gZnJvbSBcIi4uLy4uLy4uL2ludGVyZmFjZXMvbGliL2Vrcy9pbnRlcmZhY2VzXCI7XG5pbXBvcnQgeyBEYXRhZG9nT3BlcmF0b3JTdGFja1Byb3BzIH0gZnJvbSBcIi4uLy4uLy4uL2ludGVyZmFjZXMvbGliL2ludGVncmF0aW9ucy9kYXRhZG9nL2ludGVmYWNlc1wiO1xuaW1wb3J0IHsgSGVsbUNoYXJ0U3RhY2sgfSBmcm9tIFwiLi4vLi4vZWtzL2hlbG0tY2hhcnRcIjtcbmltcG9ydCB7IERhdGFkb2dBZ2VudCB9IGZyb20gXCIuL2RhdGFkb2ctb3BlcmF0b3ItY29uc3RydWN0XCI7XG5cbmV4cG9ydCBjbGFzcyBEYXRhZG9nT3BlcmF0b3JTdGFjayBleHRlbmRzIFN0YWNrIHtcblxuICBEQVRBRE9HX09QRVJBVE9SX1ZFUlNJT04gPSBcIjAuOC4wXCJcblxuICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nLCBwcm9wczogRGF0YWRvZ09wZXJhdG9yU3RhY2tQcm9wcykge1xuICAgIHN1cGVyKHNjb3BlLCBpZCwgcHJvcHMpO1xuICAgIGNvbnN0IGggPSB0aGlzLmluc3RhbGxEYXRhZG9nT3BlcmF0b3IocHJvcHMpXG4gICAgY29uc3QgYSA9IG5ldyBEYXRhZG9nQWdlbnQodGhpcywgJ0RhdGFkb2dPcGVyYXRvcicsIHByb3BzKVxuXG4gICAgYS5ub2RlLmFkZERlcGVuZGVuY3koaClcblxuICB9XG5cbiAgaW5zdGFsbERhdGFkb2dPcGVyYXRvcihwcm9wczogRGF0YWRvZ09wZXJhdG9yU3RhY2tQcm9wcyk6IFN0YWNrIHtcblxuICAgIGNvbnN0IGNoYXJ0OiBFS1NDaGFydCA9IHtcbiAgICAgIG5hbWU6IFwiRGF0YWRvZ09wZXJhdG9yXCIsXG4gICAgICBjaGFydDogXCJkYXRhZG9nLW9wZXJhdG9yXCIsXG4gICAgICBuYW1lc3BhY2U6IFwiZGF0YWRvZ1wiLFxuICAgICAgcmVsZWFzZTogYHYke3RoaXMuREFUQURPR19PUEVSQVRPUl9WRVJTSU9OfWAsXG4gICAgICB2ZXJzaW9uOiBgJHt0aGlzLkRBVEFET0dfT1BFUkFUT1JfVkVSU0lPTn1gLFxuICAgICAgZW5hYmxlZDogdHJ1ZSxcbiAgICAgIHJlcG9zaXRvcnk6IFwiaHR0cHM6Ly9oZWxtLmRhdGFkb2docS5jb21cIixcbiAgICAgIGRlc2NyaXB0aW9uOiBgRGF0YWRvZyBvcGVyYXRvciBpbnN0YWxsYXRpb24gdiR7dGhpcy5EQVRBRE9HX09QRVJBVE9SX1ZFUlNJT059YCxcbiAgICAgIGNyZWF0ZU5hbWVzcGFjZTogdHJ1ZSxcbiAgICAgIHZhbHVlczoge31cbiAgICB9XG5cbiAgICAvLyBDcmVhdGUgc2VjcmV0XG4gICAgY29uc3QgY2x1c3RlciA9IENsdXN0ZXIuZnJvbUNsdXN0ZXJBdHRyaWJ1dGVzKHRoaXMsIGAke3Byb3BzLmNsdXN0ZXJOYW1lfVJlZmAsIHtcbiAgICAgIGNsdXN0ZXJOYW1lOiBwcm9wcy5jbHVzdGVyTmFtZSEsXG4gICAgICBrdWJlY3RsUm9sZUFybjogcHJvcHMua3ViZWN0bFJvbGVBcm4hLFxuICAgICAgb3BlbklkQ29ubmVjdFByb3ZpZGVyOiBPcGVuSWRDb25uZWN0UHJvdmlkZXIuZnJvbU9wZW5JZENvbm5lY3RQcm92aWRlckFybih0aGlzLCAnT3BlbklEQ29ubmVjdFByb3ZpZGVyJywgcHJvcHMub3BlbklkQ29ubmVjdFByb3ZpZGVyQXJuISksXG4gICAgfSk7XG4gICAgLy8gLi5UT0RPLi4gaGFyc2hhZCAtIFRoaXMgc29sdmVzIHRoZSBzdGFjayBuYW1lIHByb2JsZW0gLSBMb25nIHRlcm0gZml4IHJlcXVpcmVkXG4gICAgY29uc3QgaCA9IG5ldyBIZWxtQ2hhcnRTdGFjayh0aGlzLm5vZGUucm9vdCwgJ0RhdGFkb2dPcGVyYXRvckhlbG0nLCBjaGFydCwgcHJvcHMuY2x1c3Rlck5hbWUhLCBwcm9wcy5rdWJlY3RsUm9sZUFybiEsIHtcbiAgICAgIHN0YWNrTmFtZTogJ0RhdGFkb2dPcGVyYXRvckhlbG0nLFxuICAgICAgZW52OiBwcm9wcy5lbnYsXG4gICAgICBzeW50aGVzaXplcjogcHJvcHMub3BlcmF0b3JTeW50aGVzaXplcixcbiAgICB9KTtcblxuICAgIHJldHVybiBoXG5cbiAgfVxufSJdfQ==
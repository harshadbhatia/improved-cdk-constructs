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
        const h = new helm_chart_1.HelmChartStack(this.node.root, 'DatadogOperatorHelm', chart, props.clusterName, props.kubectlRoleArn, {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGF0YWRvZy1vcGVyYXRvci1zdGFjay5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImRhdGFkb2ctb3BlcmF0b3Itc3RhY2sudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsNkNBQTZDO0FBQzdDLGlEQUE4QztBQUM5QyxpREFBNEQ7QUFJNUQscURBQXNEO0FBQ3RELHlGQUFvRjtBQUNwRiw2RUFBNEQ7QUFFNUQsTUFBYSxvQkFBcUIsU0FBUSxtQkFBSztJQUk3QyxZQUFZLEtBQWdCLEVBQUUsRUFBVSxFQUFFLEtBQWdDO1FBQ3hFLEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBSDFCLDZCQUF3QixHQUFHLE9BQU8sQ0FBQTtRQUloQyxNQUFNLENBQUMsR0FBRyxJQUFJLENBQUMsc0JBQXNCLENBQUMsS0FBSyxDQUFDLENBQUE7UUFDNUMsTUFBTSxDQUFDLEdBQUcsSUFBSSx5Q0FBWSxDQUFDLElBQUksRUFBRSxpQkFBaUIsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUUxRCxDQUFDLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUV6QixDQUFDO0lBRUQsc0JBQXNCLENBQUMsS0FBZ0M7UUFFckQsTUFBTSxLQUFLLEdBQWE7WUFDdEIsSUFBSSxFQUFFLGlCQUFpQjtZQUN2QixLQUFLLEVBQUUsa0JBQWtCO1lBQ3pCLFNBQVMsRUFBRSxTQUFTO1lBQ3BCLE9BQU8sRUFBRSxJQUFJLElBQUksQ0FBQyx3QkFBd0IsRUFBRTtZQUM1QyxPQUFPLEVBQUUsR0FBRyxJQUFJLENBQUMsd0JBQXdCLEVBQUU7WUFDM0MsT0FBTyxFQUFFLElBQUk7WUFDYixVQUFVLEVBQUUsNEJBQTRCO1lBQ3hDLFdBQVcsRUFBRSxrQ0FBa0MsSUFBSSxDQUFDLHdCQUF3QixFQUFFO1lBQzlFLGVBQWUsRUFBRSxJQUFJO1lBQ3JCLE1BQU0sRUFBRSxFQUFFO1NBQ1gsQ0FBQTtRQUVELE1BQU0sT0FBTyxHQUFHLGlCQUFPLENBQUMscUJBQXFCLENBQUMsSUFBSSxFQUFFLEdBQUcsS0FBSyxDQUFDLFdBQVcsS0FBSyxFQUFFO1lBQzdFLFdBQVcsRUFBRSxLQUFLLENBQUMsV0FBWTtZQUMvQixjQUFjLEVBQUUsS0FBSyxDQUFDLGNBQWU7WUFDckMscUJBQXFCLEVBQUUsK0JBQXFCLENBQUMsNEJBQTRCLENBQUMsSUFBSSxFQUFFLHVCQUF1QixFQUFFLEtBQUssQ0FBQyx3QkFBeUIsQ0FBQztTQUMxSSxDQUFDLENBQUM7UUFDSCxpRkFBaUY7UUFDakYsTUFBTSxDQUFDLEdBQUcsSUFBSSwyQkFBYyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLHFCQUFxQixFQUFFLEtBQUssRUFBRSxLQUFLLENBQUMsV0FBWSxFQUFFLEtBQUssQ0FBQyxjQUFlLEVBQUU7WUFDcEgsU0FBUyxFQUFFLHFCQUFxQjtZQUNoQyxHQUFHLEVBQUUsS0FBSyxDQUFDLEdBQUc7WUFDZCxXQUFXLEVBQUUsS0FBSyxDQUFDLG1CQUFtQjtTQUN2QyxDQUFDLENBQUM7UUFFSCxJQUFJLEtBQUssQ0FBQyxzQkFBc0IsRUFBRTtZQUFFLHFCQUFPLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLHVEQUF5QixFQUFFLENBQUMsQ0FBQTtTQUFFO2FBQ25GO1lBQUUscUJBQU8sQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksdURBQXlCLEVBQUUsQ0FBQyxDQUFBO1NBQUU7UUFFM0QsT0FBTyxDQUFDLENBQUE7SUFFVixDQUFDO0NBQ0Y7QUE5Q0Qsb0RBOENDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQXNwZWN0cywgU3RhY2sgfSBmcm9tIFwiYXdzLWNkay1saWJcIjtcbmltcG9ydCB7IENsdXN0ZXIgfSBmcm9tIFwiYXdzLWNkay1saWIvYXdzLWVrc1wiO1xuaW1wb3J0IHsgT3BlbklkQ29ubmVjdFByb3ZpZGVyIH0gZnJvbSBcImF3cy1jZGstbGliL2F3cy1pYW1cIjtcbmltcG9ydCB7IENvbnN0cnVjdCB9IGZyb20gXCJjb25zdHJ1Y3RzXCI7XG5pbXBvcnQgeyBFS1NDaGFydCB9IGZyb20gXCIuLi8uLi8uLi9pbnRlcmZhY2VzL2xpYi9la3MvaW50ZXJmYWNlc1wiO1xuaW1wb3J0IHsgRGF0YWRvZ09wZXJhdG9yU3RhY2tQcm9wcyB9IGZyb20gXCIuLi8uLi8uLi9pbnRlcmZhY2VzL2xpYi9pbnRlZ3JhdGlvbnMvZGF0YWRvZy9pbnRlZmFjZXNcIjtcbmltcG9ydCB7IEhlbG1DaGFydFN0YWNrIH0gZnJvbSBcIi4uLy4uL2Vrcy9oZWxtLWNoYXJ0XCI7XG5pbXBvcnQgeyBQZXJtaXNzaW9uc0JvdW5kYXJ5QXNwZWN0IH0gZnJvbSBcIi4uLy4uL3V0aWxzL3Blcm1pc3Npb25zLWJvdW5kYXJ5LWFzcGVjdFwiO1xuaW1wb3J0IHsgRGF0YWRvZ0FnZW50IH0gZnJvbSBcIi4vZGF0YWRvZy1vcGVyYXRvci1jb25zdHJ1Y3RcIjtcblxuZXhwb3J0IGNsYXNzIERhdGFkb2dPcGVyYXRvclN0YWNrIGV4dGVuZHMgU3RhY2sge1xuXG4gIERBVEFET0dfT1BFUkFUT1JfVkVSU0lPTiA9IFwiMC44LjBcIlxuXG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcsIHByb3BzOiBEYXRhZG9nT3BlcmF0b3JTdGFja1Byb3BzKSB7XG4gICAgc3VwZXIoc2NvcGUsIGlkLCBwcm9wcyk7XG4gICAgY29uc3QgaCA9IHRoaXMuaW5zdGFsbERhdGFkb2dPcGVyYXRvcihwcm9wcylcbiAgICBjb25zdCBhID0gbmV3IERhdGFkb2dBZ2VudCh0aGlzLCAnRGF0YWRvZ09wZXJhdG9yJywgcHJvcHMpXG5cbiAgICBhLm5vZGUuYWRkRGVwZW5kZW5jeShoKVxuXG4gIH1cblxuICBpbnN0YWxsRGF0YWRvZ09wZXJhdG9yKHByb3BzOiBEYXRhZG9nT3BlcmF0b3JTdGFja1Byb3BzKTogU3RhY2sge1xuXG4gICAgY29uc3QgY2hhcnQ6IEVLU0NoYXJ0ID0ge1xuICAgICAgbmFtZTogXCJEYXRhZG9nT3BlcmF0b3JcIixcbiAgICAgIGNoYXJ0OiBcImRhdGFkb2ctb3BlcmF0b3JcIixcbiAgICAgIG5hbWVzcGFjZTogXCJkYXRhZG9nXCIsXG4gICAgICByZWxlYXNlOiBgdiR7dGhpcy5EQVRBRE9HX09QRVJBVE9SX1ZFUlNJT059YCxcbiAgICAgIHZlcnNpb246IGAke3RoaXMuREFUQURPR19PUEVSQVRPUl9WRVJTSU9OfWAsXG4gICAgICBlbmFibGVkOiB0cnVlLFxuICAgICAgcmVwb3NpdG9yeTogXCJodHRwczovL2hlbG0uZGF0YWRvZ2hxLmNvbVwiLFxuICAgICAgZGVzY3JpcHRpb246IGBEYXRhZG9nIG9wZXJhdG9yIGluc3RhbGxhdGlvbiB2JHt0aGlzLkRBVEFET0dfT1BFUkFUT1JfVkVSU0lPTn1gLFxuICAgICAgY3JlYXRlTmFtZXNwYWNlOiB0cnVlLFxuICAgICAgdmFsdWVzOiB7fVxuICAgIH1cblxuICAgIGNvbnN0IGNsdXN0ZXIgPSBDbHVzdGVyLmZyb21DbHVzdGVyQXR0cmlidXRlcyh0aGlzLCBgJHtwcm9wcy5jbHVzdGVyTmFtZX1SZWZgLCB7XG4gICAgICBjbHVzdGVyTmFtZTogcHJvcHMuY2x1c3Rlck5hbWUhLFxuICAgICAga3ViZWN0bFJvbGVBcm46IHByb3BzLmt1YmVjdGxSb2xlQXJuISxcbiAgICAgIG9wZW5JZENvbm5lY3RQcm92aWRlcjogT3BlbklkQ29ubmVjdFByb3ZpZGVyLmZyb21PcGVuSWRDb25uZWN0UHJvdmlkZXJBcm4odGhpcywgJ09wZW5JRENvbm5lY3RQcm92aWRlcicsIHByb3BzLm9wZW5JZENvbm5lY3RQcm92aWRlckFybiEpLFxuICAgIH0pO1xuICAgIC8vIC4uVE9ETy4uIGhhcnNoYWQgLSBUaGlzIHNvbHZlcyB0aGUgc3RhY2sgbmFtZSBwcm9ibGVtIC0gTG9uZyB0ZXJtIGZpeCByZXF1aXJlZFxuICAgIGNvbnN0IGggPSBuZXcgSGVsbUNoYXJ0U3RhY2sodGhpcy5ub2RlLnJvb3QsICdEYXRhZG9nT3BlcmF0b3JIZWxtJywgY2hhcnQsIHByb3BzLmNsdXN0ZXJOYW1lISwgcHJvcHMua3ViZWN0bFJvbGVBcm4hLCB7XG4gICAgICBzdGFja05hbWU6ICdEYXRhZG9nT3BlcmF0b3JIZWxtJyxcbiAgICAgIGVudjogcHJvcHMuZW52LFxuICAgICAgc3ludGhlc2l6ZXI6IHByb3BzLm9wZXJhdG9yU3ludGhlc2l6ZXIsXG4gICAgfSk7XG5cbiAgICBpZiAocHJvcHMucGVybWlzc2lvbkJvdW5kYXJ5Um9sZSkgeyBBc3BlY3RzLm9mKGgpLmFkZChuZXcgUGVybWlzc2lvbnNCb3VuZGFyeUFzcGVjdCgpKSB9XG4gICAgZWxzZSB7IEFzcGVjdHMub2YoaCkuYWRkKG5ldyBQZXJtaXNzaW9uc0JvdW5kYXJ5QXNwZWN0KCkpIH1cblxuICAgIHJldHVybiBoXG5cbiAgfVxufSJdfQ==
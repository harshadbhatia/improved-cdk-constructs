"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrometheusStack = void 0;
const aws_cdk_lib_1 = require("aws-cdk-lib");
const aws_iam_1 = require("aws-cdk-lib/aws-iam");
class PrometheusStack extends aws_cdk_lib_1.NestedStack {
    // IAM - Helm - Workspace
    // Currently there is no higher level contruct for Promethus and Grafana. 
    // ..TODO pre prod activitiy 
    constructor(scope, id, cluster, props) {
        super(scope, id);
        this.createMonitoringPromethus(cluster);
    }
    createMonitoringPromethus(eksCluster) {
        this.prometheusIngestRole(eksCluster);
        this.prometheusQueryRole(eksCluster);
    }
    prometheusIngestRole(eksCluster) {
        const saNamepsace = "prometheus";
        const saName = "amp-iamproxy-ingest-service-account";
        const oidc_provider = eksCluster.openIdConnectProvider.openIdConnectProviderIssuer;
        const stringEqualsKey = `${oidc_provider}:sub`;
        const seI = new aws_cdk_lib_1.CfnJson(this, 'seI', {
            value: {
                [stringEqualsKey]: `system:serviceaccount:${saNamepsace}:${saName}`
            }
        });
        const promRole = new aws_iam_1.Role(this, "AMPIamProxyIngestRole", {
            roleName: "AMPIamProxyIngestRole",
            description: "Allows Write to AMP (Ingest Role)",
            assumedBy: new aws_iam_1.FederatedPrincipal(eksCluster.openIdConnectProvider.openIdConnectProviderArn, {
                "StringEquals": seI
            }, "sts:AssumeRoleWithWebIdentity"),
            inlinePolicies: { ingestRolePolicy: this.ingestPolicy() }
        });
    }
    ;
    ingestPolicy() {
        const permissionPolicy = new aws_iam_1.PolicyStatement({
            sid: "AMPIngestPolicy",
            effect: aws_iam_1.Effect.ALLOW,
            actions: [
                "aps:RemoteWrite",
                "aps:GetSeries",
                "aps:GetLabels",
                "aps:GetMetricMetadata"
            ],
            resources: ["*"]
        });
        const document = new aws_iam_1.PolicyDocument();
        document.addStatements(permissionPolicy);
        return document;
    }
    prometheusQueryRole(eksCluster) {
        const saNamepsace = "prometheus";
        const saName = "amp-iamproxy-query-service-account";
        const oidc_provider = eksCluster.openIdConnectProvider.openIdConnectProviderIssuer;
        const stringEqualsKey = `${oidc_provider}:sub`;
        const seQ = new aws_cdk_lib_1.CfnJson(this, 'Seq', {
            value: {
                [stringEqualsKey]: `system:serviceaccount:${saNamepsace}:${saName}`
            }
        });
        const promRole = new aws_iam_1.Role(this, "AMPIamProxyQueryRole", {
            roleName: "AMPIamProxyQueryRole",
            description: "Allows Read from AMP (Query Role)",
            assumedBy: new aws_iam_1.FederatedPrincipal(eksCluster.openIdConnectProvider.openIdConnectProviderArn, {
                "StringEquals": seQ
            }, "sts:AssumeRoleWithWebIdentity"),
            inlinePolicies: { QueryRolePolicy: this.queryPolicy() }
        });
    }
    ;
    queryPolicy() {
        const permissionPolicy = new aws_iam_1.PolicyStatement({
            sid: "AMPQueryPolicy",
            effect: aws_iam_1.Effect.ALLOW,
            actions: [
                "aps:QueryMetrics",
                "aps:GetSeries",
                "aps:GetLabels",
                "aps:GetMetricMetadata"
            ],
            resources: ["*"]
        });
        const document = new aws_iam_1.PolicyDocument();
        document.addStatements(permissionPolicy);
        return document;
    }
}
exports.PrometheusStack = PrometheusStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvbWV0aGV1cy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInByb21ldGhldXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBRUEsNkNBQW1EO0FBRW5ELGlEQUF3RztBQUd4RyxNQUFhLGVBQWdCLFNBQVEseUJBQVc7SUFFOUMseUJBQXlCO0lBQ3pCLDBFQUEwRTtJQUMxRSw2QkFBNkI7SUFFN0IsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxPQUFvQixFQUFFLEtBQXNCO1FBQ3BGLEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFFLENBQUM7UUFFbEIsSUFBSSxDQUFDLHlCQUF5QixDQUFDLE9BQU8sQ0FBQyxDQUFBO0lBRXpDLENBQUM7SUFFRCx5QkFBeUIsQ0FBQyxVQUF1QjtRQUMvQyxJQUFJLENBQUMsb0JBQW9CLENBQUMsVUFBVSxDQUFDLENBQUE7UUFDckMsSUFBSSxDQUFDLG1CQUFtQixDQUFDLFVBQVUsQ0FBQyxDQUFBO0lBQ3RDLENBQUM7SUFFRCxvQkFBb0IsQ0FBQyxVQUFtQjtRQUN0QyxNQUFNLFdBQVcsR0FBRyxZQUFZLENBQUE7UUFDaEMsTUFBTSxNQUFNLEdBQUcscUNBQXFDLENBQUE7UUFDcEQsTUFBTSxhQUFhLEdBQUcsVUFBVSxDQUFDLHFCQUFxQixDQUFDLDJCQUEyQixDQUFBO1FBRWxGLE1BQU0sZUFBZSxHQUFHLEdBQUcsYUFBYSxNQUFNLENBQUE7UUFFOUMsTUFBTSxHQUFHLEdBQUcsSUFBSSxxQkFBTyxDQUFDLElBQUksRUFBRSxLQUFLLEVBQUU7WUFDbkMsS0FBSyxFQUFFO2dCQUNMLENBQUMsZUFBZSxDQUFDLEVBQUUseUJBQXlCLFdBQVcsSUFBSSxNQUFNLEVBQUU7YUFDcEU7U0FDRixDQUFDLENBQUE7UUFFRixNQUFNLFFBQVEsR0FBRyxJQUFJLGNBQUksQ0FBQyxJQUFJLEVBQUUsdUJBQXVCLEVBQUU7WUFDdkQsUUFBUSxFQUFFLHVCQUF1QjtZQUNqQyxXQUFXLEVBQUUsbUNBQW1DO1lBQ2hELFNBQVMsRUFBRSxJQUFJLDRCQUFrQixDQUMvQixVQUFVLENBQUMscUJBQXFCLENBQUMsd0JBQXdCLEVBQ3pEO2dCQUNFLGNBQWMsRUFBRSxHQUFHO2FBQ3BCLEVBQ0QsK0JBQStCLENBQ2hDO1lBQ0QsY0FBYyxFQUFFLEVBQUUsZ0JBQWdCLEVBQUUsSUFBSSxDQUFDLFlBQVksRUFBRSxFQUFFO1NBQzFELENBQUMsQ0FBQTtJQUVKLENBQUM7SUFBQSxDQUFDO0lBRUYsWUFBWTtRQUVWLE1BQU0sZ0JBQWdCLEdBQUcsSUFBSSx5QkFBZSxDQUMxQztZQUNFLEdBQUcsRUFBRSxpQkFBaUI7WUFDdEIsTUFBTSxFQUFFLGdCQUFNLENBQUMsS0FBSztZQUVwQixPQUFPLEVBQUU7Z0JBQ1AsaUJBQWlCO2dCQUNqQixlQUFlO2dCQUNmLGVBQWU7Z0JBQ2YsdUJBQXVCO2FBQ3hCO1lBQ0QsU0FBUyxFQUFFLENBQUMsR0FBRyxDQUFDO1NBQ2pCLENBQ0YsQ0FBQTtRQUVELE1BQU0sUUFBUSxHQUFHLElBQUksd0JBQWMsRUFBRSxDQUFDO1FBQ3RDLFFBQVEsQ0FBQyxhQUFhLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztRQUV6QyxPQUFPLFFBQVEsQ0FBQztJQUVsQixDQUFDO0lBRUQsbUJBQW1CLENBQUMsVUFBbUI7UUFDckMsTUFBTSxXQUFXLEdBQUcsWUFBWSxDQUFBO1FBQ2hDLE1BQU0sTUFBTSxHQUFHLG9DQUFvQyxDQUFBO1FBRW5ELE1BQU0sYUFBYSxHQUFHLFVBQVUsQ0FBQyxxQkFBcUIsQ0FBQywyQkFBMkIsQ0FBQTtRQUNsRixNQUFNLGVBQWUsR0FBRyxHQUFHLGFBQWEsTUFBTSxDQUFBO1FBRTlDLE1BQU0sR0FBRyxHQUFHLElBQUkscUJBQU8sQ0FBQyxJQUFJLEVBQUUsS0FBSyxFQUFFO1lBQ25DLEtBQUssRUFBRTtnQkFDTCxDQUFDLGVBQWUsQ0FBQyxFQUFFLHlCQUF5QixXQUFXLElBQUksTUFBTSxFQUFFO2FBQ3BFO1NBQ0YsQ0FBQyxDQUFBO1FBRUYsTUFBTSxRQUFRLEdBQUcsSUFBSSxjQUFJLENBQUMsSUFBSSxFQUFFLHNCQUFzQixFQUFFO1lBQ3RELFFBQVEsRUFBRSxzQkFBc0I7WUFDaEMsV0FBVyxFQUFFLG1DQUFtQztZQUNoRCxTQUFTLEVBQUUsSUFBSSw0QkFBa0IsQ0FDL0IsVUFBVSxDQUFDLHFCQUFxQixDQUFDLHdCQUF3QixFQUN6RDtnQkFDRSxjQUFjLEVBQUUsR0FBRzthQUNwQixFQUNELCtCQUErQixDQUNoQztZQUNELGNBQWMsRUFBRSxFQUFFLGVBQWUsRUFBRSxJQUFJLENBQUMsV0FBVyxFQUFFLEVBQUU7U0FDeEQsQ0FBQyxDQUFBO0lBQ0osQ0FBQztJQUFBLENBQUM7SUFFRixXQUFXO1FBRVQsTUFBTSxnQkFBZ0IsR0FBRyxJQUFJLHlCQUFlLENBQzFDO1lBQ0UsR0FBRyxFQUFFLGdCQUFnQjtZQUNyQixNQUFNLEVBQUUsZ0JBQU0sQ0FBQyxLQUFLO1lBQ3BCLE9BQU8sRUFBRTtnQkFDUCxrQkFBa0I7Z0JBQ2xCLGVBQWU7Z0JBQ2YsZUFBZTtnQkFDZix1QkFBdUI7YUFDeEI7WUFDRCxTQUFTLEVBQUUsQ0FBQyxHQUFHLENBQUM7U0FDakIsQ0FDRixDQUFBO1FBRUQsTUFBTSxRQUFRLEdBQUcsSUFBSSx3QkFBYyxFQUFFLENBQUM7UUFDdEMsUUFBUSxDQUFDLGFBQWEsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO1FBRXpDLE9BQU8sUUFBUSxDQUFDO0lBQ2xCLENBQUM7Q0FJRjtBQXpIRCwwQ0F5SEMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgZWtzID0gcmVxdWlyZSgnYXdzLWNkay1saWIvYXdzLWVrcycpO1xuaW1wb3J0IGNkayA9IHJlcXVpcmUoJ2F3cy1jZGstbGliJyk7XG5pbXBvcnQgeyBDZm5Kc29uLCBOZXN0ZWRTdGFjayB9IGZyb20gJ2F3cy1jZGstbGliJztcbmltcG9ydCB7IENsdXN0ZXIgfSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtZWtzJztcbmltcG9ydCB7IEVmZmVjdCwgRmVkZXJhdGVkUHJpbmNpcGFsLCBQb2xpY3lEb2N1bWVudCwgUG9saWN5U3RhdGVtZW50LCBSb2xlIH0gZnJvbSAnYXdzLWNkay1saWIvYXdzLWlhbSc7XG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tICdjb25zdHJ1Y3RzJztcblxuZXhwb3J0IGNsYXNzIFByb21ldGhldXNTdGFjayBleHRlbmRzIE5lc3RlZFN0YWNrIHtcblxuICAvLyBJQU0gLSBIZWxtIC0gV29ya3NwYWNlXG4gIC8vIEN1cnJlbnRseSB0aGVyZSBpcyBubyBoaWdoZXIgbGV2ZWwgY29udHJ1Y3QgZm9yIFByb21ldGh1cyBhbmQgR3JhZmFuYS4gXG4gIC8vIC4uVE9ETyBwcmUgcHJvZCBhY3Rpdml0aXkgXG5cbiAgY29uc3RydWN0b3Ioc2NvcGU6IENvbnN0cnVjdCwgaWQ6IHN0cmluZywgY2x1c3RlcjogZWtzLkNsdXN0ZXIsIHByb3BzPzogY2RrLlN0YWNrUHJvcHMpIHtcbiAgICBzdXBlcihzY29wZSwgaWQsKTtcblxuICAgIHRoaXMuY3JlYXRlTW9uaXRvcmluZ1Byb21ldGh1cyhjbHVzdGVyKVxuXG4gIH1cblxuICBjcmVhdGVNb25pdG9yaW5nUHJvbWV0aHVzKGVrc0NsdXN0ZXI6IGVrcy5DbHVzdGVyKSB7XG4gICAgdGhpcy5wcm9tZXRoZXVzSW5nZXN0Um9sZShla3NDbHVzdGVyKVxuICAgIHRoaXMucHJvbWV0aGV1c1F1ZXJ5Um9sZShla3NDbHVzdGVyKVxuICB9XG5cbiAgcHJvbWV0aGV1c0luZ2VzdFJvbGUoZWtzQ2x1c3RlcjogQ2x1c3Rlcik6IHZvaWQge1xuICAgIGNvbnN0IHNhTmFtZXBzYWNlID0gXCJwcm9tZXRoZXVzXCJcbiAgICBjb25zdCBzYU5hbWUgPSBcImFtcC1pYW1wcm94eS1pbmdlc3Qtc2VydmljZS1hY2NvdW50XCJcbiAgICBjb25zdCBvaWRjX3Byb3ZpZGVyID0gZWtzQ2x1c3Rlci5vcGVuSWRDb25uZWN0UHJvdmlkZXIub3BlbklkQ29ubmVjdFByb3ZpZGVySXNzdWVyXG5cbiAgICBjb25zdCBzdHJpbmdFcXVhbHNLZXkgPSBgJHtvaWRjX3Byb3ZpZGVyfTpzdWJgXG5cbiAgICBjb25zdCBzZUkgPSBuZXcgQ2ZuSnNvbih0aGlzLCAnc2VJJywge1xuICAgICAgdmFsdWU6IHtcbiAgICAgICAgW3N0cmluZ0VxdWFsc0tleV06IGBzeXN0ZW06c2VydmljZWFjY291bnQ6JHtzYU5hbWVwc2FjZX06JHtzYU5hbWV9YFxuICAgICAgfVxuICAgIH0pXG5cbiAgICBjb25zdCBwcm9tUm9sZSA9IG5ldyBSb2xlKHRoaXMsIFwiQU1QSWFtUHJveHlJbmdlc3RSb2xlXCIsIHtcbiAgICAgIHJvbGVOYW1lOiBcIkFNUElhbVByb3h5SW5nZXN0Um9sZVwiLFxuICAgICAgZGVzY3JpcHRpb246IFwiQWxsb3dzIFdyaXRlIHRvIEFNUCAoSW5nZXN0IFJvbGUpXCIsXG4gICAgICBhc3N1bWVkQnk6IG5ldyBGZWRlcmF0ZWRQcmluY2lwYWwoXG4gICAgICAgIGVrc0NsdXN0ZXIub3BlbklkQ29ubmVjdFByb3ZpZGVyLm9wZW5JZENvbm5lY3RQcm92aWRlckFybixcbiAgICAgICAge1xuICAgICAgICAgIFwiU3RyaW5nRXF1YWxzXCI6IHNlSVxuICAgICAgICB9LFxuICAgICAgICBcInN0czpBc3N1bWVSb2xlV2l0aFdlYklkZW50aXR5XCJcbiAgICAgICksXG4gICAgICBpbmxpbmVQb2xpY2llczogeyBpbmdlc3RSb2xlUG9saWN5OiB0aGlzLmluZ2VzdFBvbGljeSgpIH1cbiAgICB9KVxuXG4gIH07XG5cbiAgaW5nZXN0UG9saWN5KCk6IFBvbGljeURvY3VtZW50IHtcblxuICAgIGNvbnN0IHBlcm1pc3Npb25Qb2xpY3kgPSBuZXcgUG9saWN5U3RhdGVtZW50KFxuICAgICAge1xuICAgICAgICBzaWQ6IFwiQU1QSW5nZXN0UG9saWN5XCIsXG4gICAgICAgIGVmZmVjdDogRWZmZWN0LkFMTE9XLFxuXG4gICAgICAgIGFjdGlvbnM6IFtcbiAgICAgICAgICBcImFwczpSZW1vdGVXcml0ZVwiLFxuICAgICAgICAgIFwiYXBzOkdldFNlcmllc1wiLFxuICAgICAgICAgIFwiYXBzOkdldExhYmVsc1wiLFxuICAgICAgICAgIFwiYXBzOkdldE1ldHJpY01ldGFkYXRhXCJcbiAgICAgICAgXSxcbiAgICAgICAgcmVzb3VyY2VzOiBbXCIqXCJdXG4gICAgICB9XG4gICAgKVxuXG4gICAgY29uc3QgZG9jdW1lbnQgPSBuZXcgUG9saWN5RG9jdW1lbnQoKTtcbiAgICBkb2N1bWVudC5hZGRTdGF0ZW1lbnRzKHBlcm1pc3Npb25Qb2xpY3kpO1xuXG4gICAgcmV0dXJuIGRvY3VtZW50O1xuXG4gIH1cblxuICBwcm9tZXRoZXVzUXVlcnlSb2xlKGVrc0NsdXN0ZXI6IENsdXN0ZXIpOiB2b2lkIHtcbiAgICBjb25zdCBzYU5hbWVwc2FjZSA9IFwicHJvbWV0aGV1c1wiXG4gICAgY29uc3Qgc2FOYW1lID0gXCJhbXAtaWFtcHJveHktcXVlcnktc2VydmljZS1hY2NvdW50XCJcblxuICAgIGNvbnN0IG9pZGNfcHJvdmlkZXIgPSBla3NDbHVzdGVyLm9wZW5JZENvbm5lY3RQcm92aWRlci5vcGVuSWRDb25uZWN0UHJvdmlkZXJJc3N1ZXJcbiAgICBjb25zdCBzdHJpbmdFcXVhbHNLZXkgPSBgJHtvaWRjX3Byb3ZpZGVyfTpzdWJgXG5cbiAgICBjb25zdCBzZVEgPSBuZXcgQ2ZuSnNvbih0aGlzLCAnU2VxJywge1xuICAgICAgdmFsdWU6IHtcbiAgICAgICAgW3N0cmluZ0VxdWFsc0tleV06IGBzeXN0ZW06c2VydmljZWFjY291bnQ6JHtzYU5hbWVwc2FjZX06JHtzYU5hbWV9YFxuICAgICAgfVxuICAgIH0pXG5cbiAgICBjb25zdCBwcm9tUm9sZSA9IG5ldyBSb2xlKHRoaXMsIFwiQU1QSWFtUHJveHlRdWVyeVJvbGVcIiwge1xuICAgICAgcm9sZU5hbWU6IFwiQU1QSWFtUHJveHlRdWVyeVJvbGVcIixcbiAgICAgIGRlc2NyaXB0aW9uOiBcIkFsbG93cyBSZWFkIGZyb20gQU1QIChRdWVyeSBSb2xlKVwiLFxuICAgICAgYXNzdW1lZEJ5OiBuZXcgRmVkZXJhdGVkUHJpbmNpcGFsKFxuICAgICAgICBla3NDbHVzdGVyLm9wZW5JZENvbm5lY3RQcm92aWRlci5vcGVuSWRDb25uZWN0UHJvdmlkZXJBcm4sXG4gICAgICAgIHtcbiAgICAgICAgICBcIlN0cmluZ0VxdWFsc1wiOiBzZVFcbiAgICAgICAgfSxcbiAgICAgICAgXCJzdHM6QXNzdW1lUm9sZVdpdGhXZWJJZGVudGl0eVwiXG4gICAgICApLFxuICAgICAgaW5saW5lUG9saWNpZXM6IHsgUXVlcnlSb2xlUG9saWN5OiB0aGlzLnF1ZXJ5UG9saWN5KCkgfVxuICAgIH0pXG4gIH07XG5cbiAgcXVlcnlQb2xpY3koKTogUG9saWN5RG9jdW1lbnQge1xuXG4gICAgY29uc3QgcGVybWlzc2lvblBvbGljeSA9IG5ldyBQb2xpY3lTdGF0ZW1lbnQoXG4gICAgICB7XG4gICAgICAgIHNpZDogXCJBTVBRdWVyeVBvbGljeVwiLFxuICAgICAgICBlZmZlY3Q6IEVmZmVjdC5BTExPVyxcbiAgICAgICAgYWN0aW9uczogW1xuICAgICAgICAgIFwiYXBzOlF1ZXJ5TWV0cmljc1wiLFxuICAgICAgICAgIFwiYXBzOkdldFNlcmllc1wiLFxuICAgICAgICAgIFwiYXBzOkdldExhYmVsc1wiLFxuICAgICAgICAgIFwiYXBzOkdldE1ldHJpY01ldGFkYXRhXCJcbiAgICAgICAgXSxcbiAgICAgICAgcmVzb3VyY2VzOiBbXCIqXCJdXG4gICAgICB9XG4gICAgKVxuXG4gICAgY29uc3QgZG9jdW1lbnQgPSBuZXcgUG9saWN5RG9jdW1lbnQoKTtcbiAgICBkb2N1bWVudC5hZGRTdGF0ZW1lbnRzKHBlcm1pc3Npb25Qb2xpY3kpO1xuXG4gICAgcmV0dXJuIGRvY3VtZW50O1xuICB9XG5cblxuXG59XG5cbiJdfQ==
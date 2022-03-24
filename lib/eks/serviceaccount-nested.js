"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServiceAccountNestedStack = void 0;
const eks = require("aws-cdk-lib/aws-eks");
const aws_cdk_lib_1 = require("aws-cdk-lib");
const aws_iam_1 = require("aws-cdk-lib/aws-iam");
class ServiceAccountNestedStack extends aws_cdk_lib_1.NestedStack {
    constructor(scope, id, eksCluster, svcAccountsCfg, props) {
        super(scope, id);
        this.config = svcAccountsCfg;
        this.createServiceAccount(eksCluster);
    }
    createServiceAccount(cluster) {
        var _a;
        // Create Kubernetes ServiceAccount
        let svcAccount = cluster.addServiceAccount(this.config.name.replace('-', ''), {
            name: this.config.name,
            namespace: this.config.namespace,
        });
        const iamPolicyDocument = this.config.policy;
        if (iamPolicyDocument && this.config.policyName) {
            // Create IAM Policy
            const iamPolicy = new aws_iam_1.Policy(this, this.config.policyName, {
                policyName: this.config.policyName,
                document: aws_iam_1.PolicyDocument.fromJson(iamPolicyDocument),
            });
            // Attach IAM role
            svcAccount.role.attachInlinePolicy(iamPolicy);
        }
        // Check if we have any role and its bindings - create required manifests
        (_a = this.config.k8RoleAndBinding) === null || _a === void 0 ? void 0 : _a.forEach(roleAndBinding => {
            const role = {
                apiVersion: "rbac.authorization.k8s.io/v1",
                kind: "Role",
                metadata: { namespace: this.config.namespace, name: roleAndBinding.name },
                rules: roleAndBinding.rules
            };
            // Some subjects may have cross namepsace requirements
            var rbSubjects = false;
            if (roleAndBinding.subjects)
                rbSubjects = true;
            else
                rbSubjects = false;
            const roleBinding = {
                apiVersion: "rbac.authorization.k8s.io/v1",
                kind: "RoleBinding",
                metadata: { namespace: this.config.namespace, name: `${roleAndBinding.name}-binding` },
                subjects: rbSubjects ? roleAndBinding.subjects : [{ kind: "ServiceAccount", name: this.config.name, namespace: this.config.namespace }],
                roleRef: {
                    kind: "Role",
                    name: roleAndBinding.name,
                    apiGroup: "rbac.authorization.k8s.io"
                }
            };
            new eks.KubernetesManifest(this, `${this.config.name}RoleAndBinding`, {
                cluster,
                manifest: [role, roleBinding],
            });
        });
    }
}
exports.ServiceAccountNestedStack = ServiceAccountNestedStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VydmljZWFjY291bnQtbmVzdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsic2VydmljZWFjY291bnQtbmVzdGVkLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLDJDQUE0QztBQUU1Qyw2Q0FBc0Q7QUFFdEQsaURBQTZEO0FBSzdELE1BQWEseUJBQTBCLFNBQVEseUJBQVc7SUFLeEQsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxVQUFtQixFQUFFLGNBQWlDLEVBQUUsS0FBa0I7UUFDbEgsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsQ0FBQztRQUVqQixJQUFJLENBQUMsTUFBTSxHQUFHLGNBQWMsQ0FBQztRQUM3QixJQUFJLENBQUMsb0JBQW9CLENBQUMsVUFBVSxDQUFDLENBQUE7SUFFdkMsQ0FBQztJQUVELG9CQUFvQixDQUFDLE9BQWdCOztRQUVuQyxtQ0FBbUM7UUFDbkMsSUFBSSxVQUFVLEdBQUcsT0FBTyxDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDLEVBQUU7WUFDNUUsSUFBSSxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSTtZQUN0QixTQUFTLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxTQUFTO1NBQ2pDLENBQUMsQ0FBQztRQUVILE1BQU0saUJBQWlCLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUE7UUFFNUMsSUFBSSxpQkFBaUIsSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLFVBQVUsRUFBRTtZQUMvQyxvQkFBb0I7WUFDcEIsTUFBTSxTQUFTLEdBQUcsSUFBSSxnQkFBTSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLFVBQVUsRUFBRTtnQkFDekQsVUFBVSxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsVUFBVTtnQkFDbEMsUUFBUSxFQUFFLHdCQUFjLENBQUMsUUFBUSxDQUFDLGlCQUFpQixDQUFDO2FBQ3JELENBQUMsQ0FBQTtZQUVGLGtCQUFrQjtZQUNsQixVQUFVLENBQUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLFNBQVMsQ0FBQyxDQUFDO1NBQy9DO1FBR0QseUVBQXlFO1FBQ3pFLE1BQUEsSUFBSSxDQUFDLE1BQU0sQ0FBQyxnQkFBZ0IsMENBQUUsT0FBTyxDQUFDLGNBQWMsQ0FBQyxFQUFFO1lBQ3JELE1BQU0sSUFBSSxHQUFHO2dCQUNYLFVBQVUsRUFBRSw4QkFBOEI7Z0JBQzFDLElBQUksRUFBRSxNQUFNO2dCQUNaLFFBQVEsRUFBRSxFQUFFLFNBQVMsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLFNBQVMsRUFBRSxJQUFJLEVBQUUsY0FBYyxDQUFDLElBQUksRUFBRTtnQkFDekUsS0FBSyxFQUFFLGNBQWMsQ0FBQyxLQUFLO2FBQzVCLENBQUM7WUFFRixzREFBc0Q7WUFDdEQsSUFBSSxVQUFVLEdBQUcsS0FBSyxDQUFBO1lBQ3RCLElBQUksY0FBYyxDQUFDLFFBQVE7Z0JBQUUsVUFBVSxHQUFHLElBQUksQ0FBQTs7Z0JBQ3pDLFVBQVUsR0FBRyxLQUFLLENBQUE7WUFHdkIsTUFBTSxXQUFXLEdBQUc7Z0JBQ2xCLFVBQVUsRUFBRSw4QkFBOEI7Z0JBQzFDLElBQUksRUFBRSxhQUFhO2dCQUNuQixRQUFRLEVBQUUsRUFBRSxTQUFTLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxTQUFTLEVBQUUsSUFBSSxFQUFFLEdBQUcsY0FBYyxDQUFDLElBQUksVUFBVSxFQUFFO2dCQUN0RixRQUFRLEVBQUUsVUFBVSxDQUFDLENBQUMsQ0FBQyxjQUFjLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLGdCQUFnQixFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxTQUFTLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxTQUFTLEVBQUUsQ0FBQztnQkFDdkksT0FBTyxFQUFFO29CQUNQLElBQUksRUFBRSxNQUFNO29CQUNaLElBQUksRUFBRSxjQUFjLENBQUMsSUFBSTtvQkFDekIsUUFBUSxFQUFFLDJCQUEyQjtpQkFDdEM7YUFDRixDQUFDO1lBRUYsSUFBSSxHQUFHLENBQUMsa0JBQWtCLENBQUMsSUFBSSxFQUFFLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLGdCQUFnQixFQUFFO2dCQUNwRSxPQUFPO2dCQUNQLFFBQVEsRUFBRSxDQUFDLElBQUksRUFBRSxXQUFXLENBQUM7YUFDOUIsQ0FBQyxDQUFDO1FBRUwsQ0FBQyxFQUFDO0lBQ0osQ0FBQztDQUVGO0FBdEVELDhEQXNFQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBla3MgPSByZXF1aXJlKCdhd3MtY2RrLWxpYi9hd3MtZWtzJyk7XG5cbmltcG9ydCB7IE5lc3RlZFN0YWNrLCBTdGFja1Byb3BzIH0gZnJvbSAnYXdzLWNkay1saWInO1xuaW1wb3J0IHsgQ2x1c3RlciB9IGZyb20gJ2F3cy1jZGstbGliL2F3cy1la3MnO1xuaW1wb3J0IHsgUG9saWN5LCBQb2xpY3lEb2N1bWVudCB9IGZyb20gJ2F3cy1jZGstbGliL2F3cy1pYW0nO1xuaW1wb3J0IHsgQ29uc3RydWN0IH0gZnJvbSBcImNvbnN0cnVjdHNcIjtcbmltcG9ydCB7IFNlcnZpY2VBY2NvdW50Q2ZnIH0gZnJvbSAnLi4vLi4vaW50ZXJmYWNlcy9saWIvZWtzL2ludGVyZmFjZXMnO1xuXG5cbmV4cG9ydCBjbGFzcyBTZXJ2aWNlQWNjb3VudE5lc3RlZFN0YWNrIGV4dGVuZHMgTmVzdGVkU3RhY2sge1xuICBib2R5OiBDb25zdHJ1Y3Q7XG4gIGJvZGllczogQ29uc3RydWN0W107XG4gIGNvbmZpZzogU2VydmljZUFjY291bnRDZmc7XG5cbiAgY29uc3RydWN0b3Ioc2NvcGU6IENvbnN0cnVjdCwgaWQ6IHN0cmluZywgZWtzQ2x1c3RlcjogQ2x1c3Rlciwgc3ZjQWNjb3VudHNDZmc6IFNlcnZpY2VBY2NvdW50Q2ZnLCBwcm9wcz86IFN0YWNrUHJvcHMpIHtcbiAgICBzdXBlcihzY29wZSwgaWQpO1xuXG4gICAgdGhpcy5jb25maWcgPSBzdmNBY2NvdW50c0NmZztcbiAgICB0aGlzLmNyZWF0ZVNlcnZpY2VBY2NvdW50KGVrc0NsdXN0ZXIpXG5cbiAgfVxuXG4gIGNyZWF0ZVNlcnZpY2VBY2NvdW50KGNsdXN0ZXI6IENsdXN0ZXIpIHtcblxuICAgIC8vIENyZWF0ZSBLdWJlcm5ldGVzIFNlcnZpY2VBY2NvdW50XG4gICAgbGV0IHN2Y0FjY291bnQgPSBjbHVzdGVyLmFkZFNlcnZpY2VBY2NvdW50KHRoaXMuY29uZmlnLm5hbWUucmVwbGFjZSgnLScsICcnKSwge1xuICAgICAgbmFtZTogdGhpcy5jb25maWcubmFtZSxcbiAgICAgIG5hbWVzcGFjZTogdGhpcy5jb25maWcubmFtZXNwYWNlLFxuICAgIH0pO1xuXG4gICAgY29uc3QgaWFtUG9saWN5RG9jdW1lbnQgPSB0aGlzLmNvbmZpZy5wb2xpY3lcblxuICAgIGlmIChpYW1Qb2xpY3lEb2N1bWVudCAmJiB0aGlzLmNvbmZpZy5wb2xpY3lOYW1lKSB7XG4gICAgICAvLyBDcmVhdGUgSUFNIFBvbGljeVxuICAgICAgY29uc3QgaWFtUG9saWN5ID0gbmV3IFBvbGljeSh0aGlzLCB0aGlzLmNvbmZpZy5wb2xpY3lOYW1lLCB7XG4gICAgICAgIHBvbGljeU5hbWU6IHRoaXMuY29uZmlnLnBvbGljeU5hbWUsXG4gICAgICAgIGRvY3VtZW50OiBQb2xpY3lEb2N1bWVudC5mcm9tSnNvbihpYW1Qb2xpY3lEb2N1bWVudCksXG4gICAgICB9KVxuXG4gICAgICAvLyBBdHRhY2ggSUFNIHJvbGVcbiAgICAgIHN2Y0FjY291bnQucm9sZS5hdHRhY2hJbmxpbmVQb2xpY3koaWFtUG9saWN5KTtcbiAgICB9XG5cblxuICAgIC8vIENoZWNrIGlmIHdlIGhhdmUgYW55IHJvbGUgYW5kIGl0cyBiaW5kaW5ncyAtIGNyZWF0ZSByZXF1aXJlZCBtYW5pZmVzdHNcbiAgICB0aGlzLmNvbmZpZy5rOFJvbGVBbmRCaW5kaW5nPy5mb3JFYWNoKHJvbGVBbmRCaW5kaW5nID0+IHtcbiAgICAgIGNvbnN0IHJvbGUgPSB7XG4gICAgICAgIGFwaVZlcnNpb246IFwicmJhYy5hdXRob3JpemF0aW9uLms4cy5pby92MVwiLFxuICAgICAgICBraW5kOiBcIlJvbGVcIixcbiAgICAgICAgbWV0YWRhdGE6IHsgbmFtZXNwYWNlOiB0aGlzLmNvbmZpZy5uYW1lc3BhY2UsIG5hbWU6IHJvbGVBbmRCaW5kaW5nLm5hbWUgfSxcbiAgICAgICAgcnVsZXM6IHJvbGVBbmRCaW5kaW5nLnJ1bGVzXG4gICAgICB9O1xuXG4gICAgICAvLyBTb21lIHN1YmplY3RzIG1heSBoYXZlIGNyb3NzIG5hbWVwc2FjZSByZXF1aXJlbWVudHNcbiAgICAgIHZhciByYlN1YmplY3RzID0gZmFsc2VcbiAgICAgIGlmIChyb2xlQW5kQmluZGluZy5zdWJqZWN0cykgcmJTdWJqZWN0cyA9IHRydWVcbiAgICAgIGVsc2UgcmJTdWJqZWN0cyA9IGZhbHNlXG5cblxuICAgICAgY29uc3Qgcm9sZUJpbmRpbmcgPSB7XG4gICAgICAgIGFwaVZlcnNpb246IFwicmJhYy5hdXRob3JpemF0aW9uLms4cy5pby92MVwiLFxuICAgICAgICBraW5kOiBcIlJvbGVCaW5kaW5nXCIsXG4gICAgICAgIG1ldGFkYXRhOiB7IG5hbWVzcGFjZTogdGhpcy5jb25maWcubmFtZXNwYWNlLCBuYW1lOiBgJHtyb2xlQW5kQmluZGluZy5uYW1lfS1iaW5kaW5nYCB9LFxuICAgICAgICBzdWJqZWN0czogcmJTdWJqZWN0cyA/IHJvbGVBbmRCaW5kaW5nLnN1YmplY3RzIDogW3sga2luZDogXCJTZXJ2aWNlQWNjb3VudFwiLCBuYW1lOiB0aGlzLmNvbmZpZy5uYW1lLCBuYW1lc3BhY2U6IHRoaXMuY29uZmlnLm5hbWVzcGFjZSB9XSxcbiAgICAgICAgcm9sZVJlZjoge1xuICAgICAgICAgIGtpbmQ6IFwiUm9sZVwiLFxuICAgICAgICAgIG5hbWU6IHJvbGVBbmRCaW5kaW5nLm5hbWUsXG4gICAgICAgICAgYXBpR3JvdXA6IFwicmJhYy5hdXRob3JpemF0aW9uLms4cy5pb1wiXG4gICAgICAgIH1cbiAgICAgIH07XG5cbiAgICAgIG5ldyBla3MuS3ViZXJuZXRlc01hbmlmZXN0KHRoaXMsIGAke3RoaXMuY29uZmlnLm5hbWV9Um9sZUFuZEJpbmRpbmdgLCB7XG4gICAgICAgIGNsdXN0ZXIsXG4gICAgICAgIG1hbmlmZXN0OiBbcm9sZSwgcm9sZUJpbmRpbmddLFxuICAgICAgfSk7XG5cbiAgICB9KVxuICB9XG5cbn1cblxuIl19
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VydmljZWFjY291bnQtbmVzdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsic2VydmljZWFjY291bnQtbmVzdGVkLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLDJDQUE0QztBQUU1Qyw2Q0FBc0Q7QUFFdEQsaURBQTZEO0FBSzdELE1BQWEseUJBQTBCLFNBQVEseUJBQVc7SUFLeEQsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxVQUFtQixFQUFFLGNBQWlDLEVBQUUsS0FBa0I7UUFDbEgsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsQ0FBQztRQUVqQixJQUFJLENBQUMsTUFBTSxHQUFHLGNBQWMsQ0FBQztRQUM3QixJQUFJLENBQUMsb0JBQW9CLENBQUMsVUFBVSxDQUFDLENBQUE7SUFFdkMsQ0FBQztJQUVELG9CQUFvQixDQUFDLE9BQWdCOztRQUVuQyxtQ0FBbUM7UUFDbkMsSUFBSSxVQUFVLEdBQUcsT0FBTyxDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDLEVBQUU7WUFDNUUsSUFBSSxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSTtZQUN0QixTQUFTLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxTQUFTO1NBQ2pDLENBQUMsQ0FBQztRQUVILE1BQU0saUJBQWlCLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUE7UUFFNUMsSUFBSSxpQkFBaUIsSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLFVBQVUsRUFBRTtZQUMvQyxvQkFBb0I7WUFDcEIsTUFBTSxTQUFTLEdBQUcsSUFBSSxnQkFBTSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLFVBQVUsRUFBRTtnQkFDekQsVUFBVSxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsVUFBVTtnQkFDbEMsUUFBUSxFQUFFLHdCQUFjLENBQUMsUUFBUSxDQUFDLGlCQUFpQixDQUFDO2FBQ3JELENBQUMsQ0FBQTtZQUVGLGtCQUFrQjtZQUNsQixVQUFVLENBQUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLFNBQVMsQ0FBQyxDQUFDO1NBQy9DO1FBR0QseUVBQXlFO1FBQ3pFLE1BQUEsSUFBSSxDQUFDLE1BQU0sQ0FBQyxnQkFBZ0IsMENBQUUsT0FBTyxDQUFDLGNBQWMsQ0FBQyxFQUFFO1lBQ3JELE1BQU0sSUFBSSxHQUFHO2dCQUNYLFVBQVUsRUFBRSw4QkFBOEI7Z0JBQzFDLElBQUksRUFBRSxNQUFNO2dCQUNaLFFBQVEsRUFBRSxFQUFFLFNBQVMsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLFNBQVMsRUFBRSxJQUFJLEVBQUUsY0FBYyxDQUFDLElBQUksRUFBRTtnQkFDekUsS0FBSyxFQUFFLGNBQWMsQ0FBQyxLQUFLO2FBQzVCLENBQUM7WUFFRixzREFBc0Q7WUFDdEQsSUFBSSxVQUFVLEdBQUcsS0FBSyxDQUFBO1lBQ3RCLElBQUksY0FBYyxDQUFDLFFBQVE7Z0JBQUUsVUFBVSxHQUFHLElBQUksQ0FBQTs7Z0JBQ3pDLFVBQVUsR0FBRyxLQUFLLENBQUE7WUFHdkIsTUFBTSxXQUFXLEdBQUc7Z0JBQ2xCLFVBQVUsRUFBRSw4QkFBOEI7Z0JBQzFDLElBQUksRUFBRSxhQUFhO2dCQUNuQixRQUFRLEVBQUUsRUFBRSxTQUFTLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxTQUFTLEVBQUUsSUFBSSxFQUFFLEdBQUcsY0FBYyxDQUFDLElBQUksVUFBVSxFQUFFO2dCQUN0RixRQUFRLEVBQUUsVUFBVSxDQUFDLENBQUMsQ0FBQyxjQUFjLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLGdCQUFnQixFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxTQUFTLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxTQUFTLEVBQUUsQ0FBQztnQkFDdkksT0FBTyxFQUFFO29CQUNQLElBQUksRUFBRSxNQUFNO29CQUNaLElBQUksRUFBRSxjQUFjLENBQUMsSUFBSTtvQkFDekIsUUFBUSxFQUFFLDJCQUEyQjtpQkFDdEM7YUFDRixDQUFDO1lBRUYsSUFBSSxHQUFHLENBQUMsa0JBQWtCLENBQUMsSUFBSSxFQUFFLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLGdCQUFnQixFQUFFO2dCQUNwRSxPQUFPO2dCQUNQLFFBQVEsRUFBRSxDQUFDLElBQUksRUFBRSxXQUFXLENBQUM7YUFDOUIsQ0FBQyxDQUFDO1FBRUwsQ0FBQyxDQUFDLENBQUE7SUFDSixDQUFDO0NBRUY7QUF0RUQsOERBc0VDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IGVrcyA9IHJlcXVpcmUoJ2F3cy1jZGstbGliL2F3cy1la3MnKTtcblxuaW1wb3J0IHsgTmVzdGVkU3RhY2ssIFN0YWNrUHJvcHMgfSBmcm9tICdhd3MtY2RrLWxpYic7XG5pbXBvcnQgeyBDbHVzdGVyIH0gZnJvbSAnYXdzLWNkay1saWIvYXdzLWVrcyc7XG5pbXBvcnQgeyBQb2xpY3ksIFBvbGljeURvY3VtZW50IH0gZnJvbSAnYXdzLWNkay1saWIvYXdzLWlhbSc7XG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tIFwiY29uc3RydWN0c1wiO1xuaW1wb3J0IHsgU2VydmljZUFjY291bnRDZmcgfSBmcm9tICcuLi8uLi9pbnRlcmZhY2VzL2xpYi9la3MvaW50ZXJmYWNlcyc7XG5cblxuZXhwb3J0IGNsYXNzIFNlcnZpY2VBY2NvdW50TmVzdGVkU3RhY2sgZXh0ZW5kcyBOZXN0ZWRTdGFjayB7XG4gIGJvZHk6IENvbnN0cnVjdDtcbiAgYm9kaWVzOiBDb25zdHJ1Y3RbXTtcbiAgY29uZmlnOiBTZXJ2aWNlQWNjb3VudENmZztcblxuICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nLCBla3NDbHVzdGVyOiBDbHVzdGVyLCBzdmNBY2NvdW50c0NmZzogU2VydmljZUFjY291bnRDZmcsIHByb3BzPzogU3RhY2tQcm9wcykge1xuICAgIHN1cGVyKHNjb3BlLCBpZCk7XG5cbiAgICB0aGlzLmNvbmZpZyA9IHN2Y0FjY291bnRzQ2ZnO1xuICAgIHRoaXMuY3JlYXRlU2VydmljZUFjY291bnQoZWtzQ2x1c3RlcilcblxuICB9XG5cbiAgY3JlYXRlU2VydmljZUFjY291bnQoY2x1c3RlcjogQ2x1c3Rlcikge1xuXG4gICAgLy8gQ3JlYXRlIEt1YmVybmV0ZXMgU2VydmljZUFjY291bnRcbiAgICBsZXQgc3ZjQWNjb3VudCA9IGNsdXN0ZXIuYWRkU2VydmljZUFjY291bnQodGhpcy5jb25maWcubmFtZS5yZXBsYWNlKCctJywgJycpLCB7XG4gICAgICBuYW1lOiB0aGlzLmNvbmZpZy5uYW1lLFxuICAgICAgbmFtZXNwYWNlOiB0aGlzLmNvbmZpZy5uYW1lc3BhY2UsXG4gICAgfSk7XG5cbiAgICBjb25zdCBpYW1Qb2xpY3lEb2N1bWVudCA9IHRoaXMuY29uZmlnLnBvbGljeVxuXG4gICAgaWYgKGlhbVBvbGljeURvY3VtZW50ICYmIHRoaXMuY29uZmlnLnBvbGljeU5hbWUpIHtcbiAgICAgIC8vIENyZWF0ZSBJQU0gUG9saWN5XG4gICAgICBjb25zdCBpYW1Qb2xpY3kgPSBuZXcgUG9saWN5KHRoaXMsIHRoaXMuY29uZmlnLnBvbGljeU5hbWUsIHtcbiAgICAgICAgcG9saWN5TmFtZTogdGhpcy5jb25maWcucG9saWN5TmFtZSxcbiAgICAgICAgZG9jdW1lbnQ6IFBvbGljeURvY3VtZW50LmZyb21Kc29uKGlhbVBvbGljeURvY3VtZW50KSxcbiAgICAgIH0pXG5cbiAgICAgIC8vIEF0dGFjaCBJQU0gcm9sZVxuICAgICAgc3ZjQWNjb3VudC5yb2xlLmF0dGFjaElubGluZVBvbGljeShpYW1Qb2xpY3kpO1xuICAgIH1cblxuXG4gICAgLy8gQ2hlY2sgaWYgd2UgaGF2ZSBhbnkgcm9sZSBhbmQgaXRzIGJpbmRpbmdzIC0gY3JlYXRlIHJlcXVpcmVkIG1hbmlmZXN0c1xuICAgIHRoaXMuY29uZmlnLms4Um9sZUFuZEJpbmRpbmc/LmZvckVhY2gocm9sZUFuZEJpbmRpbmcgPT4ge1xuICAgICAgY29uc3Qgcm9sZSA9IHtcbiAgICAgICAgYXBpVmVyc2lvbjogXCJyYmFjLmF1dGhvcml6YXRpb24uazhzLmlvL3YxXCIsXG4gICAgICAgIGtpbmQ6IFwiUm9sZVwiLFxuICAgICAgICBtZXRhZGF0YTogeyBuYW1lc3BhY2U6IHRoaXMuY29uZmlnLm5hbWVzcGFjZSwgbmFtZTogcm9sZUFuZEJpbmRpbmcubmFtZSB9LFxuICAgICAgICBydWxlczogcm9sZUFuZEJpbmRpbmcucnVsZXNcbiAgICAgIH07XG5cbiAgICAgIC8vIFNvbWUgc3ViamVjdHMgbWF5IGhhdmUgY3Jvc3MgbmFtZXBzYWNlIHJlcXVpcmVtZW50c1xuICAgICAgdmFyIHJiU3ViamVjdHMgPSBmYWxzZVxuICAgICAgaWYgKHJvbGVBbmRCaW5kaW5nLnN1YmplY3RzKSByYlN1YmplY3RzID0gdHJ1ZVxuICAgICAgZWxzZSByYlN1YmplY3RzID0gZmFsc2VcblxuXG4gICAgICBjb25zdCByb2xlQmluZGluZyA9IHtcbiAgICAgICAgYXBpVmVyc2lvbjogXCJyYmFjLmF1dGhvcml6YXRpb24uazhzLmlvL3YxXCIsXG4gICAgICAgIGtpbmQ6IFwiUm9sZUJpbmRpbmdcIixcbiAgICAgICAgbWV0YWRhdGE6IHsgbmFtZXNwYWNlOiB0aGlzLmNvbmZpZy5uYW1lc3BhY2UsIG5hbWU6IGAke3JvbGVBbmRCaW5kaW5nLm5hbWV9LWJpbmRpbmdgIH0sXG4gICAgICAgIHN1YmplY3RzOiByYlN1YmplY3RzID8gcm9sZUFuZEJpbmRpbmcuc3ViamVjdHMgOiBbeyBraW5kOiBcIlNlcnZpY2VBY2NvdW50XCIsIG5hbWU6IHRoaXMuY29uZmlnLm5hbWUsIG5hbWVzcGFjZTogdGhpcy5jb25maWcubmFtZXNwYWNlIH1dLFxuICAgICAgICByb2xlUmVmOiB7XG4gICAgICAgICAga2luZDogXCJSb2xlXCIsXG4gICAgICAgICAgbmFtZTogcm9sZUFuZEJpbmRpbmcubmFtZSxcbiAgICAgICAgICBhcGlHcm91cDogXCJyYmFjLmF1dGhvcml6YXRpb24uazhzLmlvXCJcbiAgICAgICAgfVxuICAgICAgfTtcblxuICAgICAgbmV3IGVrcy5LdWJlcm5ldGVzTWFuaWZlc3QodGhpcywgYCR7dGhpcy5jb25maWcubmFtZX1Sb2xlQW5kQmluZGluZ2AsIHtcbiAgICAgICAgY2x1c3RlcixcbiAgICAgICAgbWFuaWZlc3Q6IFtyb2xlLCByb2xlQmluZGluZ10sXG4gICAgICB9KTtcblxuICAgIH0pXG4gIH1cblxufVxuXG4iXX0=
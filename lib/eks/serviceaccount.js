"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServiceAccountStack = void 0;
const cdk = require("aws-cdk-lib");
const eks = require("aws-cdk-lib/aws-eks");
const aws_iam_1 = require("aws-cdk-lib/aws-iam");
class ServiceAccountStack extends cdk.Stack {
    constructor(scope, id, config, eksCluster, props) {
        super(scope, id, props);
        this.config = config;
        this.createServiceAccount(eksCluster);
    }
    createServiceAccount(cluster) {
        var _a;
        (_a = this.config.serviceAccounts) === null || _a === void 0 ? void 0 : _a.map(sa => {
            var _a;
            // Create Kubernetes ServiceAccount
            let svcAccount = cluster.addServiceAccount(sa.name.replace('-', ''), {
                name: sa.name,
                namespace: sa.namespace,
            });
            const iamPolicyDocument = sa.policy;
            if (iamPolicyDocument && sa.policyName) {
                // Create IAM Policy
                const iamPolicy = new aws_iam_1.Policy(this, sa.policyName, {
                    policyName: sa.policyName,
                    document: aws_iam_1.PolicyDocument.fromJson(iamPolicyDocument),
                });
                // Attach IAM role
                svcAccount.role.attachInlinePolicy(iamPolicy);
            }
            // Check if we have any role and its bindings - create required manifests
            (_a = sa.k8RoleAndBinding) === null || _a === void 0 ? void 0 : _a.forEach((roleAndBinding, idx) => {
                const role = {
                    apiVersion: "rbac.authorization.k8s.io/v1",
                    kind: "Role",
                    metadata: { namespace: sa.namespace, name: roleAndBinding.name },
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
                    metadata: { namespace: sa.namespace, name: `${roleAndBinding.name}-binding` },
                    subjects: rbSubjects ? roleAndBinding.subjects : [{ kind: "ServiceAccount", name: sa.name, namespace: sa.namespace }],
                    roleRef: {
                        kind: "Role",
                        name: roleAndBinding.name,
                        apiGroup: "rbac.authorization.k8s.io"
                    }
                };
                new eks.KubernetesManifest(this, `${sa.name}${roleAndBinding.name}RoleAndBinding`, {
                    cluster,
                    manifest: [role, roleBinding],
                });
            });
        });
    }
}
exports.ServiceAccountStack = ServiceAccountStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VydmljZWFjY291bnQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJzZXJ2aWNlYWNjb3VudC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxtQ0FBb0M7QUFDcEMsMkNBQTRDO0FBRzVDLGlEQUE2RDtBQU03RCxNQUFhLG1CQUFvQixTQUFRLEdBQUcsQ0FBQyxLQUFLO0lBSWhELFlBQVksS0FBZ0IsRUFBRSxFQUFVLEVBQUUsTUFBd0IsRUFBRSxVQUFtQixFQUFFLEtBQWtCO1FBQ3pHLEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBRXhCLElBQUksQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFDO1FBQ3JCLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxVQUFVLENBQUMsQ0FBQTtJQUV2QyxDQUFDO0lBRUQsb0JBQW9CLENBQUMsT0FBZ0I7O1FBRW5DLE1BQUEsSUFBSSxDQUFDLE1BQU0sQ0FBQyxlQUFlLDBDQUFFLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBRTs7WUFDcEMsbUNBQW1DO1lBQ25DLElBQUksVUFBVSxHQUFHLE9BQU8sQ0FBQyxpQkFBaUIsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDLEVBQUU7Z0JBQ25FLElBQUksRUFBRSxFQUFFLENBQUMsSUFBSTtnQkFDYixTQUFTLEVBQUUsRUFBRSxDQUFDLFNBQVM7YUFDeEIsQ0FBQyxDQUFDO1lBRUgsTUFBTSxpQkFBaUIsR0FBRyxFQUFFLENBQUMsTUFBTSxDQUFBO1lBRW5DLElBQUksaUJBQWlCLElBQUksRUFBRSxDQUFDLFVBQVUsRUFBRTtnQkFDdEMsb0JBQW9CO2dCQUNwQixNQUFNLFNBQVMsR0FBRyxJQUFJLGdCQUFNLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxVQUFVLEVBQUU7b0JBQ2hELFVBQVUsRUFBRSxFQUFFLENBQUMsVUFBVTtvQkFDekIsUUFBUSxFQUFFLHdCQUFjLENBQUMsUUFBUSxDQUFDLGlCQUFpQixDQUFDO2lCQUNyRCxDQUFDLENBQUE7Z0JBRUYsa0JBQWtCO2dCQUNsQixVQUFVLENBQUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLFNBQVMsQ0FBQyxDQUFDO2FBQy9DO1lBR0QseUVBQXlFO1lBQ3pFLE1BQUEsRUFBRSxDQUFDLGdCQUFnQiwwQ0FBRSxPQUFPLENBQUMsQ0FBQyxjQUFjLEVBQUUsR0FBRyxFQUFFLEVBQUU7Z0JBQ25ELE1BQU0sSUFBSSxHQUFHO29CQUNYLFVBQVUsRUFBRSw4QkFBOEI7b0JBQzFDLElBQUksRUFBRSxNQUFNO29CQUNaLFFBQVEsRUFBRSxFQUFFLFNBQVMsRUFBRSxFQUFFLENBQUMsU0FBUyxFQUFFLElBQUksRUFBRSxjQUFjLENBQUMsSUFBSSxFQUFFO29CQUNoRSxLQUFLLEVBQUUsY0FBYyxDQUFDLEtBQUs7aUJBQzVCLENBQUM7Z0JBRUYsc0RBQXNEO2dCQUN0RCxJQUFJLFVBQVUsR0FBRyxLQUFLLENBQUE7Z0JBQ3RCLElBQUksY0FBYyxDQUFDLFFBQVE7b0JBQUUsVUFBVSxHQUFHLElBQUksQ0FBQTs7b0JBQ3pDLFVBQVUsR0FBRyxLQUFLLENBQUE7Z0JBR3ZCLE1BQU0sV0FBVyxHQUFHO29CQUNsQixVQUFVLEVBQUUsOEJBQThCO29CQUMxQyxJQUFJLEVBQUUsYUFBYTtvQkFDbkIsUUFBUSxFQUFFLEVBQUUsU0FBUyxFQUFFLEVBQUUsQ0FBQyxTQUFTLEVBQUUsSUFBSSxFQUFFLEdBQUcsY0FBYyxDQUFDLElBQUksVUFBVSxFQUFFO29CQUM3RSxRQUFRLEVBQUUsVUFBVSxDQUFDLENBQUMsQ0FBQyxjQUFjLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLGdCQUFnQixFQUFFLElBQUksRUFBRSxFQUFFLENBQUMsSUFBSSxFQUFFLFNBQVMsRUFBRSxFQUFFLENBQUMsU0FBUyxFQUFFLENBQUM7b0JBQ3JILE9BQU8sRUFBRTt3QkFDUCxJQUFJLEVBQUUsTUFBTTt3QkFDWixJQUFJLEVBQUUsY0FBYyxDQUFDLElBQUk7d0JBQ3pCLFFBQVEsRUFBRSwyQkFBMkI7cUJBQ3RDO2lCQUNGLENBQUM7Z0JBRUYsSUFBSSxHQUFHLENBQUMsa0JBQWtCLENBQUMsSUFBSSxFQUFFLEdBQUcsRUFBRSxDQUFDLElBQUksR0FBRyxjQUFjLENBQUMsSUFBSSxnQkFBZ0IsRUFBRTtvQkFDakYsT0FBTztvQkFDUCxRQUFRLEVBQUUsQ0FBQyxJQUFJLEVBQUUsV0FBVyxDQUFDO2lCQUM5QixDQUFDLENBQUM7WUFFTCxDQUFDLENBQUMsQ0FBQTtRQUVKLENBQUMsQ0FBQyxDQUFBO0lBR0osQ0FBQztDQUVGO0FBMUVELGtEQTBFQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBjZGsgPSByZXF1aXJlKCdhd3MtY2RrLWxpYicpO1xuaW1wb3J0IGVrcyA9IHJlcXVpcmUoJ2F3cy1jZGstbGliL2F3cy1la3MnKTtcblxuaW1wb3J0IHsgU3RhY2tQcm9wcyB9IGZyb20gJ2F3cy1jZGstbGliJztcbmltcG9ydCB7IFBvbGljeSwgUG9saWN5RG9jdW1lbnQgfSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtaWFtJztcbmltcG9ydCB7IENvbnN0cnVjdCB9IGZyb20gXCJjb25zdHJ1Y3RzXCI7XG5pbXBvcnQgeyBFS1NTQVN0YWNrQ29uZmlnIH0gZnJvbSAnLi4vLi4vaW50ZXJmYWNlcy9saWIvZWtzL2ludGVyZmFjZXMnO1xuaW1wb3J0IHsgQ2x1c3RlciB9IGZyb20gJ2F3cy1jZGstbGliL2F3cy1la3MnO1xuXG5cbmV4cG9ydCBjbGFzcyBTZXJ2aWNlQWNjb3VudFN0YWNrIGV4dGVuZHMgY2RrLlN0YWNrIHtcblxuICBjb25maWc6IEVLU1NBU3RhY2tDb25maWc7XG5cbiAgY29uc3RydWN0b3Ioc2NvcGU6IENvbnN0cnVjdCwgaWQ6IHN0cmluZywgY29uZmlnOiBFS1NTQVN0YWNrQ29uZmlnLCBla3NDbHVzdGVyOiBDbHVzdGVyLCBwcm9wcz86IFN0YWNrUHJvcHMpIHtcbiAgICBzdXBlcihzY29wZSwgaWQsIHByb3BzKTtcblxuICAgIHRoaXMuY29uZmlnID0gY29uZmlnO1xuICAgIHRoaXMuY3JlYXRlU2VydmljZUFjY291bnQoZWtzQ2x1c3RlcilcblxuICB9XG5cbiAgY3JlYXRlU2VydmljZUFjY291bnQoY2x1c3RlcjogQ2x1c3Rlcikge1xuXG4gICAgdGhpcy5jb25maWcuc2VydmljZUFjY291bnRzPy5tYXAoc2EgPT4ge1xuICAgICAgLy8gQ3JlYXRlIEt1YmVybmV0ZXMgU2VydmljZUFjY291bnRcbiAgICAgIGxldCBzdmNBY2NvdW50ID0gY2x1c3Rlci5hZGRTZXJ2aWNlQWNjb3VudChzYS5uYW1lLnJlcGxhY2UoJy0nLCAnJyksIHtcbiAgICAgICAgbmFtZTogc2EubmFtZSxcbiAgICAgICAgbmFtZXNwYWNlOiBzYS5uYW1lc3BhY2UsXG4gICAgICB9KTtcblxuICAgICAgY29uc3QgaWFtUG9saWN5RG9jdW1lbnQgPSBzYS5wb2xpY3lcblxuICAgICAgaWYgKGlhbVBvbGljeURvY3VtZW50ICYmIHNhLnBvbGljeU5hbWUpIHtcbiAgICAgICAgLy8gQ3JlYXRlIElBTSBQb2xpY3lcbiAgICAgICAgY29uc3QgaWFtUG9saWN5ID0gbmV3IFBvbGljeSh0aGlzLCBzYS5wb2xpY3lOYW1lLCB7XG4gICAgICAgICAgcG9saWN5TmFtZTogc2EucG9saWN5TmFtZSxcbiAgICAgICAgICBkb2N1bWVudDogUG9saWN5RG9jdW1lbnQuZnJvbUpzb24oaWFtUG9saWN5RG9jdW1lbnQpLFxuICAgICAgICB9KVxuXG4gICAgICAgIC8vIEF0dGFjaCBJQU0gcm9sZVxuICAgICAgICBzdmNBY2NvdW50LnJvbGUuYXR0YWNoSW5saW5lUG9saWN5KGlhbVBvbGljeSk7XG4gICAgICB9XG5cblxuICAgICAgLy8gQ2hlY2sgaWYgd2UgaGF2ZSBhbnkgcm9sZSBhbmQgaXRzIGJpbmRpbmdzIC0gY3JlYXRlIHJlcXVpcmVkIG1hbmlmZXN0c1xuICAgICAgc2EuazhSb2xlQW5kQmluZGluZz8uZm9yRWFjaCgocm9sZUFuZEJpbmRpbmcsIGlkeCkgPT4ge1xuICAgICAgICBjb25zdCByb2xlID0ge1xuICAgICAgICAgIGFwaVZlcnNpb246IFwicmJhYy5hdXRob3JpemF0aW9uLms4cy5pby92MVwiLFxuICAgICAgICAgIGtpbmQ6IFwiUm9sZVwiLFxuICAgICAgICAgIG1ldGFkYXRhOiB7IG5hbWVzcGFjZTogc2EubmFtZXNwYWNlLCBuYW1lOiByb2xlQW5kQmluZGluZy5uYW1lIH0sXG4gICAgICAgICAgcnVsZXM6IHJvbGVBbmRCaW5kaW5nLnJ1bGVzXG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gU29tZSBzdWJqZWN0cyBtYXkgaGF2ZSBjcm9zcyBuYW1lcHNhY2UgcmVxdWlyZW1lbnRzXG4gICAgICAgIHZhciByYlN1YmplY3RzID0gZmFsc2VcbiAgICAgICAgaWYgKHJvbGVBbmRCaW5kaW5nLnN1YmplY3RzKSByYlN1YmplY3RzID0gdHJ1ZVxuICAgICAgICBlbHNlIHJiU3ViamVjdHMgPSBmYWxzZVxuXG5cbiAgICAgICAgY29uc3Qgcm9sZUJpbmRpbmcgPSB7XG4gICAgICAgICAgYXBpVmVyc2lvbjogXCJyYmFjLmF1dGhvcml6YXRpb24uazhzLmlvL3YxXCIsXG4gICAgICAgICAga2luZDogXCJSb2xlQmluZGluZ1wiLFxuICAgICAgICAgIG1ldGFkYXRhOiB7IG5hbWVzcGFjZTogc2EubmFtZXNwYWNlLCBuYW1lOiBgJHtyb2xlQW5kQmluZGluZy5uYW1lfS1iaW5kaW5nYCB9LFxuICAgICAgICAgIHN1YmplY3RzOiByYlN1YmplY3RzID8gcm9sZUFuZEJpbmRpbmcuc3ViamVjdHMgOiBbeyBraW5kOiBcIlNlcnZpY2VBY2NvdW50XCIsIG5hbWU6IHNhLm5hbWUsIG5hbWVzcGFjZTogc2EubmFtZXNwYWNlIH1dLFxuICAgICAgICAgIHJvbGVSZWY6IHtcbiAgICAgICAgICAgIGtpbmQ6IFwiUm9sZVwiLFxuICAgICAgICAgICAgbmFtZTogcm9sZUFuZEJpbmRpbmcubmFtZSxcbiAgICAgICAgICAgIGFwaUdyb3VwOiBcInJiYWMuYXV0aG9yaXphdGlvbi5rOHMuaW9cIlxuICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICBuZXcgZWtzLkt1YmVybmV0ZXNNYW5pZmVzdCh0aGlzLCBgJHtzYS5uYW1lfSR7cm9sZUFuZEJpbmRpbmcubmFtZX1Sb2xlQW5kQmluZGluZ2AsIHtcbiAgICAgICAgICBjbHVzdGVyLFxuICAgICAgICAgIG1hbmlmZXN0OiBbcm9sZSwgcm9sZUJpbmRpbmddLFxuICAgICAgICB9KTtcblxuICAgICAgfSlcblxuICAgIH0pXG5cblxuICB9XG5cbn1cblxuIl19
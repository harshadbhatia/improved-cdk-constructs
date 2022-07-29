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
            (_a = sa.k8RoleAndBinding) === null || _a === void 0 ? void 0 : _a.forEach(roleAndBinding => {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VydmljZWFjY291bnQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJzZXJ2aWNlYWNjb3VudC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxtQ0FBb0M7QUFDcEMsMkNBQTRDO0FBRzVDLGlEQUE2RDtBQU03RCxNQUFhLG1CQUFvQixTQUFRLEdBQUcsQ0FBQyxLQUFLO0lBSWhELFlBQVksS0FBZ0IsRUFBRSxFQUFVLEVBQUUsTUFBd0IsRUFBRSxVQUFtQixFQUFFLEtBQWtCO1FBQ3pHLEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBRXhCLElBQUksQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFDO1FBQ3JCLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxVQUFVLENBQUMsQ0FBQTtJQUV2QyxDQUFDO0lBRUQsb0JBQW9CLENBQUMsT0FBZ0I7O1FBRW5DLE1BQUEsSUFBSSxDQUFDLE1BQU0sQ0FBQyxlQUFlLDBDQUFFLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBRTs7WUFDbkMsbUNBQW1DO1lBQ3RDLElBQUksVUFBVSxHQUFHLE9BQU8sQ0FBQyxpQkFBaUIsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDLEVBQUU7Z0JBQ25FLElBQUksRUFBRSxFQUFFLENBQUMsSUFBSTtnQkFDYixTQUFTLEVBQUUsRUFBRSxDQUFDLFNBQVM7YUFDeEIsQ0FBQyxDQUFDO1lBRUgsTUFBTSxpQkFBaUIsR0FBRyxFQUFFLENBQUMsTUFBTSxDQUFBO1lBRW5DLElBQUksaUJBQWlCLElBQUksRUFBRSxDQUFDLFVBQVUsRUFBRTtnQkFDdEMsb0JBQW9CO2dCQUNwQixNQUFNLFNBQVMsR0FBRyxJQUFJLGdCQUFNLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxVQUFVLEVBQUU7b0JBQ2hELFVBQVUsRUFBRSxFQUFFLENBQUMsVUFBVTtvQkFDekIsUUFBUSxFQUFFLHdCQUFjLENBQUMsUUFBUSxDQUFDLGlCQUFpQixDQUFDO2lCQUNyRCxDQUFDLENBQUE7Z0JBRUYsa0JBQWtCO2dCQUNsQixVQUFVLENBQUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLFNBQVMsQ0FBQyxDQUFDO2FBQy9DO1lBR0QseUVBQXlFO1lBQ3pFLE1BQUEsRUFBRSxDQUFDLGdCQUFnQiwwQ0FBRSxPQUFPLENBQUMsY0FBYyxDQUFDLEVBQUU7Z0JBQzVDLE1BQU0sSUFBSSxHQUFHO29CQUNYLFVBQVUsRUFBRSw4QkFBOEI7b0JBQzFDLElBQUksRUFBRSxNQUFNO29CQUNaLFFBQVEsRUFBRSxFQUFFLFNBQVMsRUFBRSxFQUFFLENBQUMsU0FBUyxFQUFFLElBQUksRUFBRSxjQUFjLENBQUMsSUFBSSxFQUFFO29CQUNoRSxLQUFLLEVBQUUsY0FBYyxDQUFDLEtBQUs7aUJBQzVCLENBQUM7Z0JBRUYsc0RBQXNEO2dCQUN0RCxJQUFJLFVBQVUsR0FBRyxLQUFLLENBQUE7Z0JBQ3RCLElBQUksY0FBYyxDQUFDLFFBQVE7b0JBQUUsVUFBVSxHQUFHLElBQUksQ0FBQTs7b0JBQ3pDLFVBQVUsR0FBRyxLQUFLLENBQUE7Z0JBR3ZCLE1BQU0sV0FBVyxHQUFHO29CQUNsQixVQUFVLEVBQUUsOEJBQThCO29CQUMxQyxJQUFJLEVBQUUsYUFBYTtvQkFDbkIsUUFBUSxFQUFFLEVBQUUsU0FBUyxFQUFFLEVBQUUsQ0FBQyxTQUFTLEVBQUUsSUFBSSxFQUFFLEdBQUcsY0FBYyxDQUFDLElBQUksVUFBVSxFQUFFO29CQUM3RSxRQUFRLEVBQUUsVUFBVSxDQUFDLENBQUMsQ0FBQyxjQUFjLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLGdCQUFnQixFQUFFLElBQUksRUFBRSxFQUFFLENBQUMsSUFBSSxFQUFFLFNBQVMsRUFBRSxFQUFFLENBQUMsU0FBUyxFQUFFLENBQUM7b0JBQ3JILE9BQU8sRUFBRTt3QkFDUCxJQUFJLEVBQUUsTUFBTTt3QkFDWixJQUFJLEVBQUUsY0FBYyxDQUFDLElBQUk7d0JBQ3pCLFFBQVEsRUFBRSwyQkFBMkI7cUJBQ3RDO2lCQUNGLENBQUM7Z0JBRUYsSUFBSSxHQUFHLENBQUMsa0JBQWtCLENBQUMsSUFBSSxFQUFFLEdBQUcsRUFBRSxDQUFDLElBQUksR0FBRyxjQUFjLENBQUMsSUFBSSxnQkFBZ0IsRUFBRTtvQkFDakYsT0FBTztvQkFDUCxRQUFRLEVBQUUsQ0FBQyxJQUFJLEVBQUUsV0FBVyxDQUFDO2lCQUM5QixDQUFDLENBQUM7WUFFTCxDQUFDLENBQUMsQ0FBQTtRQUVGLENBQUMsQ0FBQyxDQUFBO0lBR0osQ0FBQztDQUVGO0FBMUVELGtEQTBFQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBjZGsgPSByZXF1aXJlKCdhd3MtY2RrLWxpYicpO1xuaW1wb3J0IGVrcyA9IHJlcXVpcmUoJ2F3cy1jZGstbGliL2F3cy1la3MnKTtcblxuaW1wb3J0IHsgU3RhY2tQcm9wcyB9IGZyb20gJ2F3cy1jZGstbGliJztcbmltcG9ydCB7IFBvbGljeSwgUG9saWN5RG9jdW1lbnQgfSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtaWFtJztcbmltcG9ydCB7IENvbnN0cnVjdCB9IGZyb20gXCJjb25zdHJ1Y3RzXCI7XG5pbXBvcnQgeyBFS1NTQVN0YWNrQ29uZmlnIH0gZnJvbSAnLi4vLi4vaW50ZXJmYWNlcy9saWIvZWtzL2ludGVyZmFjZXMnO1xuaW1wb3J0IHsgQ2x1c3RlciB9IGZyb20gJ2F3cy1jZGstbGliL2F3cy1la3MnO1xuXG5cbmV4cG9ydCBjbGFzcyBTZXJ2aWNlQWNjb3VudFN0YWNrIGV4dGVuZHMgY2RrLlN0YWNrIHtcblxuICBjb25maWc6IEVLU1NBU3RhY2tDb25maWc7XG5cbiAgY29uc3RydWN0b3Ioc2NvcGU6IENvbnN0cnVjdCwgaWQ6IHN0cmluZywgY29uZmlnOiBFS1NTQVN0YWNrQ29uZmlnLCBla3NDbHVzdGVyOiBDbHVzdGVyLCBwcm9wcz86IFN0YWNrUHJvcHMpIHtcbiAgICBzdXBlcihzY29wZSwgaWQsIHByb3BzKTtcblxuICAgIHRoaXMuY29uZmlnID0gY29uZmlnO1xuICAgIHRoaXMuY3JlYXRlU2VydmljZUFjY291bnQoZWtzQ2x1c3RlcilcblxuICB9XG5cbiAgY3JlYXRlU2VydmljZUFjY291bnQoY2x1c3RlcjogQ2x1c3Rlcikge1xuXG4gICAgdGhpcy5jb25maWcuc2VydmljZUFjY291bnRzPy5tYXAoc2EgPT4ge1xuICAgICAgIC8vIENyZWF0ZSBLdWJlcm5ldGVzIFNlcnZpY2VBY2NvdW50XG4gICAgbGV0IHN2Y0FjY291bnQgPSBjbHVzdGVyLmFkZFNlcnZpY2VBY2NvdW50KHNhLm5hbWUucmVwbGFjZSgnLScsICcnKSwge1xuICAgICAgbmFtZTogc2EubmFtZSxcbiAgICAgIG5hbWVzcGFjZTogc2EubmFtZXNwYWNlLFxuICAgIH0pO1xuXG4gICAgY29uc3QgaWFtUG9saWN5RG9jdW1lbnQgPSBzYS5wb2xpY3lcblxuICAgIGlmIChpYW1Qb2xpY3lEb2N1bWVudCAmJiBzYS5wb2xpY3lOYW1lKSB7XG4gICAgICAvLyBDcmVhdGUgSUFNIFBvbGljeVxuICAgICAgY29uc3QgaWFtUG9saWN5ID0gbmV3IFBvbGljeSh0aGlzLCBzYS5wb2xpY3lOYW1lLCB7XG4gICAgICAgIHBvbGljeU5hbWU6IHNhLnBvbGljeU5hbWUsXG4gICAgICAgIGRvY3VtZW50OiBQb2xpY3lEb2N1bWVudC5mcm9tSnNvbihpYW1Qb2xpY3lEb2N1bWVudCksXG4gICAgICB9KVxuXG4gICAgICAvLyBBdHRhY2ggSUFNIHJvbGVcbiAgICAgIHN2Y0FjY291bnQucm9sZS5hdHRhY2hJbmxpbmVQb2xpY3koaWFtUG9saWN5KTtcbiAgICB9XG5cblxuICAgIC8vIENoZWNrIGlmIHdlIGhhdmUgYW55IHJvbGUgYW5kIGl0cyBiaW5kaW5ncyAtIGNyZWF0ZSByZXF1aXJlZCBtYW5pZmVzdHNcbiAgICBzYS5rOFJvbGVBbmRCaW5kaW5nPy5mb3JFYWNoKHJvbGVBbmRCaW5kaW5nID0+IHtcbiAgICAgIGNvbnN0IHJvbGUgPSB7XG4gICAgICAgIGFwaVZlcnNpb246IFwicmJhYy5hdXRob3JpemF0aW9uLms4cy5pby92MVwiLFxuICAgICAgICBraW5kOiBcIlJvbGVcIixcbiAgICAgICAgbWV0YWRhdGE6IHsgbmFtZXNwYWNlOiBzYS5uYW1lc3BhY2UsIG5hbWU6IHJvbGVBbmRCaW5kaW5nLm5hbWUgfSxcbiAgICAgICAgcnVsZXM6IHJvbGVBbmRCaW5kaW5nLnJ1bGVzXG4gICAgICB9O1xuXG4gICAgICAvLyBTb21lIHN1YmplY3RzIG1heSBoYXZlIGNyb3NzIG5hbWVwc2FjZSByZXF1aXJlbWVudHNcbiAgICAgIHZhciByYlN1YmplY3RzID0gZmFsc2VcbiAgICAgIGlmIChyb2xlQW5kQmluZGluZy5zdWJqZWN0cykgcmJTdWJqZWN0cyA9IHRydWVcbiAgICAgIGVsc2UgcmJTdWJqZWN0cyA9IGZhbHNlXG5cblxuICAgICAgY29uc3Qgcm9sZUJpbmRpbmcgPSB7XG4gICAgICAgIGFwaVZlcnNpb246IFwicmJhYy5hdXRob3JpemF0aW9uLms4cy5pby92MVwiLFxuICAgICAgICBraW5kOiBcIlJvbGVCaW5kaW5nXCIsXG4gICAgICAgIG1ldGFkYXRhOiB7IG5hbWVzcGFjZTogc2EubmFtZXNwYWNlLCBuYW1lOiBgJHtyb2xlQW5kQmluZGluZy5uYW1lfS1iaW5kaW5nYCB9LFxuICAgICAgICBzdWJqZWN0czogcmJTdWJqZWN0cyA/IHJvbGVBbmRCaW5kaW5nLnN1YmplY3RzIDogW3sga2luZDogXCJTZXJ2aWNlQWNjb3VudFwiLCBuYW1lOiBzYS5uYW1lLCBuYW1lc3BhY2U6IHNhLm5hbWVzcGFjZSB9XSxcbiAgICAgICAgcm9sZVJlZjoge1xuICAgICAgICAgIGtpbmQ6IFwiUm9sZVwiLFxuICAgICAgICAgIG5hbWU6IHJvbGVBbmRCaW5kaW5nLm5hbWUsXG4gICAgICAgICAgYXBpR3JvdXA6IFwicmJhYy5hdXRob3JpemF0aW9uLms4cy5pb1wiXG4gICAgICAgIH1cbiAgICAgIH07XG5cbiAgICAgIG5ldyBla3MuS3ViZXJuZXRlc01hbmlmZXN0KHRoaXMsIGAke3NhLm5hbWV9JHtyb2xlQW5kQmluZGluZy5uYW1lfVJvbGVBbmRCaW5kaW5nYCwge1xuICAgICAgICBjbHVzdGVyLFxuICAgICAgICBtYW5pZmVzdDogW3JvbGUsIHJvbGVCaW5kaW5nXSxcbiAgICAgIH0pO1xuXG4gICAgfSlcblxuICAgIH0pXG5cblxuICB9XG5cbn1cblxuIl19
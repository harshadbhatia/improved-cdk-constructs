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
                new eks.KubernetesManifest(this, `${sa.name}RoleAndBinding`, {
                    cluster,
                    manifest: [role, roleBinding],
                });
            });
        });
    }
}
exports.ServiceAccountStack = ServiceAccountStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VydmljZWFjY291bnQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJzZXJ2aWNlYWNjb3VudC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxtQ0FBb0M7QUFDcEMsMkNBQTRDO0FBRzVDLGlEQUE2RDtBQU03RCxNQUFhLG1CQUFvQixTQUFRLEdBQUcsQ0FBQyxLQUFLO0lBSWhELFlBQVksS0FBZ0IsRUFBRSxFQUFVLEVBQUUsTUFBd0IsRUFBRSxVQUFtQixFQUFFLEtBQWtCO1FBQ3pHLEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBRXhCLElBQUksQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFDO1FBQ3JCLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxVQUFVLENBQUMsQ0FBQTtJQUV2QyxDQUFDO0lBRUQsb0JBQW9CLENBQUMsT0FBZ0I7O1FBRW5DLE1BQUEsSUFBSSxDQUFDLE1BQU0sQ0FBQyxlQUFlLDBDQUFFLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBRTs7WUFDbkMsbUNBQW1DO1lBQ3RDLElBQUksVUFBVSxHQUFHLE9BQU8sQ0FBQyxpQkFBaUIsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDLEVBQUU7Z0JBQ25FLElBQUksRUFBRSxFQUFFLENBQUMsSUFBSTtnQkFDYixTQUFTLEVBQUUsRUFBRSxDQUFDLFNBQVM7YUFDeEIsQ0FBQyxDQUFDO1lBRUgsTUFBTSxpQkFBaUIsR0FBRyxFQUFFLENBQUMsTUFBTSxDQUFBO1lBRW5DLElBQUksaUJBQWlCLElBQUksRUFBRSxDQUFDLFVBQVUsRUFBRTtnQkFDdEMsb0JBQW9CO2dCQUNwQixNQUFNLFNBQVMsR0FBRyxJQUFJLGdCQUFNLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxVQUFVLEVBQUU7b0JBQ2hELFVBQVUsRUFBRSxFQUFFLENBQUMsVUFBVTtvQkFDekIsUUFBUSxFQUFFLHdCQUFjLENBQUMsUUFBUSxDQUFDLGlCQUFpQixDQUFDO2lCQUNyRCxDQUFDLENBQUE7Z0JBRUYsa0JBQWtCO2dCQUNsQixVQUFVLENBQUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLFNBQVMsQ0FBQyxDQUFDO2FBQy9DO1lBR0QseUVBQXlFO1lBQ3pFLE1BQUEsRUFBRSxDQUFDLGdCQUFnQiwwQ0FBRSxPQUFPLENBQUMsY0FBYyxDQUFDLEVBQUU7Z0JBQzVDLE1BQU0sSUFBSSxHQUFHO29CQUNYLFVBQVUsRUFBRSw4QkFBOEI7b0JBQzFDLElBQUksRUFBRSxNQUFNO29CQUNaLFFBQVEsRUFBRSxFQUFFLFNBQVMsRUFBRSxFQUFFLENBQUMsU0FBUyxFQUFFLElBQUksRUFBRSxjQUFjLENBQUMsSUFBSSxFQUFFO29CQUNoRSxLQUFLLEVBQUUsY0FBYyxDQUFDLEtBQUs7aUJBQzVCLENBQUM7Z0JBRUYsc0RBQXNEO2dCQUN0RCxJQUFJLFVBQVUsR0FBRyxLQUFLLENBQUE7Z0JBQ3RCLElBQUksY0FBYyxDQUFDLFFBQVE7b0JBQUUsVUFBVSxHQUFHLElBQUksQ0FBQTs7b0JBQ3pDLFVBQVUsR0FBRyxLQUFLLENBQUE7Z0JBR3ZCLE1BQU0sV0FBVyxHQUFHO29CQUNsQixVQUFVLEVBQUUsOEJBQThCO29CQUMxQyxJQUFJLEVBQUUsYUFBYTtvQkFDbkIsUUFBUSxFQUFFLEVBQUUsU0FBUyxFQUFFLEVBQUUsQ0FBQyxTQUFTLEVBQUUsSUFBSSxFQUFFLEdBQUcsY0FBYyxDQUFDLElBQUksVUFBVSxFQUFFO29CQUM3RSxRQUFRLEVBQUUsVUFBVSxDQUFDLENBQUMsQ0FBQyxjQUFjLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLGdCQUFnQixFQUFFLElBQUksRUFBRSxFQUFFLENBQUMsSUFBSSxFQUFFLFNBQVMsRUFBRSxFQUFFLENBQUMsU0FBUyxFQUFFLENBQUM7b0JBQ3JILE9BQU8sRUFBRTt3QkFDUCxJQUFJLEVBQUUsTUFBTTt3QkFDWixJQUFJLEVBQUUsY0FBYyxDQUFDLElBQUk7d0JBQ3pCLFFBQVEsRUFBRSwyQkFBMkI7cUJBQ3RDO2lCQUNGLENBQUM7Z0JBRUYsSUFBSSxHQUFHLENBQUMsa0JBQWtCLENBQUMsSUFBSSxFQUFFLEdBQUcsRUFBRSxDQUFDLElBQUksZ0JBQWdCLEVBQUU7b0JBQzNELE9BQU87b0JBQ1AsUUFBUSxFQUFFLENBQUMsSUFBSSxFQUFFLFdBQVcsQ0FBQztpQkFDOUIsQ0FBQyxDQUFDO1lBRUwsQ0FBQyxDQUFDLENBQUE7UUFFRixDQUFDLENBQUMsQ0FBQTtJQUdKLENBQUM7Q0FFRjtBQTFFRCxrREEwRUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgY2RrID0gcmVxdWlyZSgnYXdzLWNkay1saWInKTtcbmltcG9ydCBla3MgPSByZXF1aXJlKCdhd3MtY2RrLWxpYi9hd3MtZWtzJyk7XG5cbmltcG9ydCB7IFN0YWNrUHJvcHMgfSBmcm9tICdhd3MtY2RrLWxpYic7XG5pbXBvcnQgeyBQb2xpY3ksIFBvbGljeURvY3VtZW50IH0gZnJvbSAnYXdzLWNkay1saWIvYXdzLWlhbSc7XG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tIFwiY29uc3RydWN0c1wiO1xuaW1wb3J0IHsgRUtTU0FTdGFja0NvbmZpZyB9IGZyb20gJy4uLy4uL2ludGVyZmFjZXMvbGliL2Vrcy9pbnRlcmZhY2VzJztcbmltcG9ydCB7IENsdXN0ZXIgfSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtZWtzJztcblxuXG5leHBvcnQgY2xhc3MgU2VydmljZUFjY291bnRTdGFjayBleHRlbmRzIGNkay5TdGFjayB7XG4gIFxuICBjb25maWc6IEVLU1NBU3RhY2tDb25maWc7XG5cbiAgY29uc3RydWN0b3Ioc2NvcGU6IENvbnN0cnVjdCwgaWQ6IHN0cmluZywgY29uZmlnOiBFS1NTQVN0YWNrQ29uZmlnLCBla3NDbHVzdGVyOiBDbHVzdGVyLCBwcm9wcz86IFN0YWNrUHJvcHMpIHtcbiAgICBzdXBlcihzY29wZSwgaWQsIHByb3BzKTtcblxuICAgIHRoaXMuY29uZmlnID0gY29uZmlnO1xuICAgIHRoaXMuY3JlYXRlU2VydmljZUFjY291bnQoZWtzQ2x1c3RlcilcblxuICB9XG5cbiAgY3JlYXRlU2VydmljZUFjY291bnQoY2x1c3RlcjogQ2x1c3Rlcikge1xuICAgIFxuICAgIHRoaXMuY29uZmlnLnNlcnZpY2VBY2NvdW50cz8ubWFwKHNhID0+IHtcbiAgICAgICAvLyBDcmVhdGUgS3ViZXJuZXRlcyBTZXJ2aWNlQWNjb3VudFxuICAgIGxldCBzdmNBY2NvdW50ID0gY2x1c3Rlci5hZGRTZXJ2aWNlQWNjb3VudChzYS5uYW1lLnJlcGxhY2UoJy0nLCAnJyksIHtcbiAgICAgIG5hbWU6IHNhLm5hbWUsXG4gICAgICBuYW1lc3BhY2U6IHNhLm5hbWVzcGFjZSxcbiAgICB9KTtcblxuICAgIGNvbnN0IGlhbVBvbGljeURvY3VtZW50ID0gc2EucG9saWN5XG5cbiAgICBpZiAoaWFtUG9saWN5RG9jdW1lbnQgJiYgc2EucG9saWN5TmFtZSkge1xuICAgICAgLy8gQ3JlYXRlIElBTSBQb2xpY3lcbiAgICAgIGNvbnN0IGlhbVBvbGljeSA9IG5ldyBQb2xpY3kodGhpcywgc2EucG9saWN5TmFtZSwge1xuICAgICAgICBwb2xpY3lOYW1lOiBzYS5wb2xpY3lOYW1lLFxuICAgICAgICBkb2N1bWVudDogUG9saWN5RG9jdW1lbnQuZnJvbUpzb24oaWFtUG9saWN5RG9jdW1lbnQpLFxuICAgICAgfSlcblxuICAgICAgLy8gQXR0YWNoIElBTSByb2xlXG4gICAgICBzdmNBY2NvdW50LnJvbGUuYXR0YWNoSW5saW5lUG9saWN5KGlhbVBvbGljeSk7XG4gICAgfVxuXG5cbiAgICAvLyBDaGVjayBpZiB3ZSBoYXZlIGFueSByb2xlIGFuZCBpdHMgYmluZGluZ3MgLSBjcmVhdGUgcmVxdWlyZWQgbWFuaWZlc3RzXG4gICAgc2EuazhSb2xlQW5kQmluZGluZz8uZm9yRWFjaChyb2xlQW5kQmluZGluZyA9PiB7XG4gICAgICBjb25zdCByb2xlID0ge1xuICAgICAgICBhcGlWZXJzaW9uOiBcInJiYWMuYXV0aG9yaXphdGlvbi5rOHMuaW8vdjFcIixcbiAgICAgICAga2luZDogXCJSb2xlXCIsXG4gICAgICAgIG1ldGFkYXRhOiB7IG5hbWVzcGFjZTogc2EubmFtZXNwYWNlLCBuYW1lOiByb2xlQW5kQmluZGluZy5uYW1lIH0sXG4gICAgICAgIHJ1bGVzOiByb2xlQW5kQmluZGluZy5ydWxlc1xuICAgICAgfTtcblxuICAgICAgLy8gU29tZSBzdWJqZWN0cyBtYXkgaGF2ZSBjcm9zcyBuYW1lcHNhY2UgcmVxdWlyZW1lbnRzXG4gICAgICB2YXIgcmJTdWJqZWN0cyA9IGZhbHNlXG4gICAgICBpZiAocm9sZUFuZEJpbmRpbmcuc3ViamVjdHMpIHJiU3ViamVjdHMgPSB0cnVlXG4gICAgICBlbHNlIHJiU3ViamVjdHMgPSBmYWxzZVxuXG5cbiAgICAgIGNvbnN0IHJvbGVCaW5kaW5nID0ge1xuICAgICAgICBhcGlWZXJzaW9uOiBcInJiYWMuYXV0aG9yaXphdGlvbi5rOHMuaW8vdjFcIixcbiAgICAgICAga2luZDogXCJSb2xlQmluZGluZ1wiLFxuICAgICAgICBtZXRhZGF0YTogeyBuYW1lc3BhY2U6IHNhLm5hbWVzcGFjZSwgbmFtZTogYCR7cm9sZUFuZEJpbmRpbmcubmFtZX0tYmluZGluZ2AgfSxcbiAgICAgICAgc3ViamVjdHM6IHJiU3ViamVjdHMgPyByb2xlQW5kQmluZGluZy5zdWJqZWN0cyA6IFt7IGtpbmQ6IFwiU2VydmljZUFjY291bnRcIiwgbmFtZTogc2EubmFtZSwgbmFtZXNwYWNlOiBzYS5uYW1lc3BhY2UgfV0sXG4gICAgICAgIHJvbGVSZWY6IHtcbiAgICAgICAgICBraW5kOiBcIlJvbGVcIixcbiAgICAgICAgICBuYW1lOiByb2xlQW5kQmluZGluZy5uYW1lLFxuICAgICAgICAgIGFwaUdyb3VwOiBcInJiYWMuYXV0aG9yaXphdGlvbi5rOHMuaW9cIlxuICAgICAgICB9XG4gICAgICB9O1xuXG4gICAgICBuZXcgZWtzLkt1YmVybmV0ZXNNYW5pZmVzdCh0aGlzLCBgJHtzYS5uYW1lfVJvbGVBbmRCaW5kaW5nYCwge1xuICAgICAgICBjbHVzdGVyLFxuICAgICAgICBtYW5pZmVzdDogW3JvbGUsIHJvbGVCaW5kaW5nXSxcbiAgICAgIH0pO1xuXG4gICAgfSlcblxuICAgIH0pXG5cbiAgIFxuICB9XG5cbn1cblxuIl19
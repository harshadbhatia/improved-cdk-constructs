"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServiceAccountStack = void 0;
const eks = require("aws-cdk-lib/aws-eks");
const aws_cdk_lib_1 = require("aws-cdk-lib");
const aws_iam_1 = require("aws-cdk-lib/aws-iam");
class ServiceAccountStack extends aws_cdk_lib_1.NestedStack {
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
exports.ServiceAccountStack = ServiceAccountStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VydmljZWFjY291bnQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJzZXJ2aWNlYWNjb3VudC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSwyQ0FBNEM7QUFFNUMsNkNBQXNEO0FBRXRELGlEQUE2RDtBQUs3RCxNQUFhLG1CQUFvQixTQUFRLHlCQUFXO0lBS2xELFlBQVksS0FBZ0IsRUFBRSxFQUFVLEVBQUUsVUFBbUIsRUFBRSxjQUFpQyxFQUFFLEtBQWtCO1FBQ2xILEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFFakIsSUFBSSxDQUFDLE1BQU0sR0FBRyxjQUFjLENBQUM7UUFDN0IsSUFBSSxDQUFDLG9CQUFvQixDQUFDLFVBQVUsQ0FBQyxDQUFBO0lBRXZDLENBQUM7SUFFRCxvQkFBb0IsQ0FBQyxPQUFnQjs7UUFFbkMsbUNBQW1DO1FBQ25DLElBQUksVUFBVSxHQUFHLE9BQU8sQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxFQUFFO1lBQzVFLElBQUksRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUk7WUFDdEIsU0FBUyxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsU0FBUztTQUNqQyxDQUFDLENBQUM7UUFFSCxNQUFNLGlCQUFpQixHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFBO1FBRTVDLElBQUksaUJBQWlCLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxVQUFVLEVBQUU7WUFDL0Msb0JBQW9CO1lBQ3BCLE1BQU0sU0FBUyxHQUFHLElBQUksZ0JBQU0sQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxVQUFVLEVBQUU7Z0JBQ3pELFVBQVUsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLFVBQVU7Z0JBQ2xDLFFBQVEsRUFBRSx3QkFBYyxDQUFDLFFBQVEsQ0FBQyxpQkFBaUIsQ0FBQzthQUNyRCxDQUFDLENBQUE7WUFFRixrQkFBa0I7WUFDbEIsVUFBVSxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxTQUFTLENBQUMsQ0FBQztTQUMvQztRQUdELHlFQUF5RTtRQUN6RSxNQUFBLElBQUksQ0FBQyxNQUFNLENBQUMsZ0JBQWdCLDBDQUFFLE9BQU8sQ0FBQyxjQUFjLENBQUMsRUFBRTtZQUNyRCxNQUFNLElBQUksR0FBRztnQkFDWCxVQUFVLEVBQUUsOEJBQThCO2dCQUMxQyxJQUFJLEVBQUUsTUFBTTtnQkFDWixRQUFRLEVBQUUsRUFBRSxTQUFTLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxTQUFTLEVBQUUsSUFBSSxFQUFFLGNBQWMsQ0FBQyxJQUFJLEVBQUU7Z0JBQ3pFLEtBQUssRUFBRSxjQUFjLENBQUMsS0FBSzthQUM1QixDQUFDO1lBRUYsc0RBQXNEO1lBQ3RELElBQUksVUFBVSxHQUFHLEtBQUssQ0FBQTtZQUN0QixJQUFJLGNBQWMsQ0FBQyxRQUFRO2dCQUFFLFVBQVUsR0FBRyxJQUFJLENBQUE7O2dCQUN6QyxVQUFVLEdBQUcsS0FBSyxDQUFBO1lBR3ZCLE1BQU0sV0FBVyxHQUFHO2dCQUNsQixVQUFVLEVBQUUsOEJBQThCO2dCQUMxQyxJQUFJLEVBQUUsYUFBYTtnQkFDbkIsUUFBUSxFQUFFLEVBQUUsU0FBUyxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsU0FBUyxFQUFFLElBQUksRUFBRSxHQUFHLGNBQWMsQ0FBQyxJQUFJLFVBQVUsRUFBRTtnQkFDdEYsUUFBUSxFQUFFLFVBQVUsQ0FBQyxDQUFDLENBQUMsY0FBYyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksRUFBRSxnQkFBZ0IsRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsU0FBUyxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsU0FBUyxFQUFFLENBQUM7Z0JBQ3ZJLE9BQU8sRUFBRTtvQkFDUCxJQUFJLEVBQUUsTUFBTTtvQkFDWixJQUFJLEVBQUUsY0FBYyxDQUFDLElBQUk7b0JBQ3pCLFFBQVEsRUFBRSwyQkFBMkI7aUJBQ3RDO2FBQ0YsQ0FBQztZQUVGLElBQUksR0FBRyxDQUFDLGtCQUFrQixDQUFDLElBQUksRUFBRSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxnQkFBZ0IsRUFBRTtnQkFDcEUsT0FBTztnQkFDUCxRQUFRLEVBQUUsQ0FBQyxJQUFJLEVBQUUsV0FBVyxDQUFDO2FBQzlCLENBQUMsQ0FBQztRQUVMLENBQUMsRUFBQztJQUNKLENBQUM7Q0FFRjtBQXRFRCxrREFzRUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgZWtzID0gcmVxdWlyZSgnYXdzLWNkay1saWIvYXdzLWVrcycpO1xuXG5pbXBvcnQgeyBOZXN0ZWRTdGFjaywgU3RhY2tQcm9wcyB9IGZyb20gJ2F3cy1jZGstbGliJztcbmltcG9ydCB7IENsdXN0ZXIgfSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtZWtzJztcbmltcG9ydCB7IFBvbGljeSwgUG9saWN5RG9jdW1lbnQgfSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtaWFtJztcbmltcG9ydCB7IENvbnN0cnVjdCB9IGZyb20gXCJjb25zdHJ1Y3RzXCI7XG5pbXBvcnQgeyBTZXJ2aWNlQWNjb3VudENmZyB9IGZyb20gJy4uLy4uL2ludGVyZmFjZXMvbGliL2Vrcy9pbnRlcmZhY2VzJztcblxuXG5leHBvcnQgY2xhc3MgU2VydmljZUFjY291bnRTdGFjayBleHRlbmRzIE5lc3RlZFN0YWNrIHtcbiAgYm9keTogQ29uc3RydWN0O1xuICBib2RpZXM6IENvbnN0cnVjdFtdO1xuICBjb25maWc6IFNlcnZpY2VBY2NvdW50Q2ZnO1xuXG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcsIGVrc0NsdXN0ZXI6IENsdXN0ZXIsIHN2Y0FjY291bnRzQ2ZnOiBTZXJ2aWNlQWNjb3VudENmZywgcHJvcHM/OiBTdGFja1Byb3BzKSB7XG4gICAgc3VwZXIoc2NvcGUsIGlkKTtcblxuICAgIHRoaXMuY29uZmlnID0gc3ZjQWNjb3VudHNDZmc7XG4gICAgdGhpcy5jcmVhdGVTZXJ2aWNlQWNjb3VudChla3NDbHVzdGVyKVxuXG4gIH1cblxuICBjcmVhdGVTZXJ2aWNlQWNjb3VudChjbHVzdGVyOiBDbHVzdGVyKSB7XG5cbiAgICAvLyBDcmVhdGUgS3ViZXJuZXRlcyBTZXJ2aWNlQWNjb3VudFxuICAgIGxldCBzdmNBY2NvdW50ID0gY2x1c3Rlci5hZGRTZXJ2aWNlQWNjb3VudCh0aGlzLmNvbmZpZy5uYW1lLnJlcGxhY2UoJy0nLCAnJyksIHtcbiAgICAgIG5hbWU6IHRoaXMuY29uZmlnLm5hbWUsXG4gICAgICBuYW1lc3BhY2U6IHRoaXMuY29uZmlnLm5hbWVzcGFjZSxcbiAgICB9KTtcblxuICAgIGNvbnN0IGlhbVBvbGljeURvY3VtZW50ID0gdGhpcy5jb25maWcucG9saWN5XG5cbiAgICBpZiAoaWFtUG9saWN5RG9jdW1lbnQgJiYgdGhpcy5jb25maWcucG9saWN5TmFtZSkge1xuICAgICAgLy8gQ3JlYXRlIElBTSBQb2xpY3lcbiAgICAgIGNvbnN0IGlhbVBvbGljeSA9IG5ldyBQb2xpY3kodGhpcywgdGhpcy5jb25maWcucG9saWN5TmFtZSwge1xuICAgICAgICBwb2xpY3lOYW1lOiB0aGlzLmNvbmZpZy5wb2xpY3lOYW1lLFxuICAgICAgICBkb2N1bWVudDogUG9saWN5RG9jdW1lbnQuZnJvbUpzb24oaWFtUG9saWN5RG9jdW1lbnQpLFxuICAgICAgfSlcblxuICAgICAgLy8gQXR0YWNoIElBTSByb2xlXG4gICAgICBzdmNBY2NvdW50LnJvbGUuYXR0YWNoSW5saW5lUG9saWN5KGlhbVBvbGljeSk7XG4gICAgfVxuXG5cbiAgICAvLyBDaGVjayBpZiB3ZSBoYXZlIGFueSByb2xlIGFuZCBpdHMgYmluZGluZ3MgLSBjcmVhdGUgcmVxdWlyZWQgbWFuaWZlc3RzXG4gICAgdGhpcy5jb25maWcuazhSb2xlQW5kQmluZGluZz8uZm9yRWFjaChyb2xlQW5kQmluZGluZyA9PiB7XG4gICAgICBjb25zdCByb2xlID0ge1xuICAgICAgICBhcGlWZXJzaW9uOiBcInJiYWMuYXV0aG9yaXphdGlvbi5rOHMuaW8vdjFcIixcbiAgICAgICAga2luZDogXCJSb2xlXCIsXG4gICAgICAgIG1ldGFkYXRhOiB7IG5hbWVzcGFjZTogdGhpcy5jb25maWcubmFtZXNwYWNlLCBuYW1lOiByb2xlQW5kQmluZGluZy5uYW1lIH0sXG4gICAgICAgIHJ1bGVzOiByb2xlQW5kQmluZGluZy5ydWxlc1xuICAgICAgfTtcblxuICAgICAgLy8gU29tZSBzdWJqZWN0cyBtYXkgaGF2ZSBjcm9zcyBuYW1lcHNhY2UgcmVxdWlyZW1lbnRzXG4gICAgICB2YXIgcmJTdWJqZWN0cyA9IGZhbHNlXG4gICAgICBpZiAocm9sZUFuZEJpbmRpbmcuc3ViamVjdHMpIHJiU3ViamVjdHMgPSB0cnVlXG4gICAgICBlbHNlIHJiU3ViamVjdHMgPSBmYWxzZVxuXG5cbiAgICAgIGNvbnN0IHJvbGVCaW5kaW5nID0ge1xuICAgICAgICBhcGlWZXJzaW9uOiBcInJiYWMuYXV0aG9yaXphdGlvbi5rOHMuaW8vdjFcIixcbiAgICAgICAga2luZDogXCJSb2xlQmluZGluZ1wiLFxuICAgICAgICBtZXRhZGF0YTogeyBuYW1lc3BhY2U6IHRoaXMuY29uZmlnLm5hbWVzcGFjZSwgbmFtZTogYCR7cm9sZUFuZEJpbmRpbmcubmFtZX0tYmluZGluZ2AgfSxcbiAgICAgICAgc3ViamVjdHM6IHJiU3ViamVjdHMgPyByb2xlQW5kQmluZGluZy5zdWJqZWN0cyA6IFt7IGtpbmQ6IFwiU2VydmljZUFjY291bnRcIiwgbmFtZTogdGhpcy5jb25maWcubmFtZSwgbmFtZXNwYWNlOiB0aGlzLmNvbmZpZy5uYW1lc3BhY2UgfV0sXG4gICAgICAgIHJvbGVSZWY6IHtcbiAgICAgICAgICBraW5kOiBcIlJvbGVcIixcbiAgICAgICAgICBuYW1lOiByb2xlQW5kQmluZGluZy5uYW1lLFxuICAgICAgICAgIGFwaUdyb3VwOiBcInJiYWMuYXV0aG9yaXphdGlvbi5rOHMuaW9cIlxuICAgICAgICB9XG4gICAgICB9O1xuXG4gICAgICBuZXcgZWtzLkt1YmVybmV0ZXNNYW5pZmVzdCh0aGlzLCBgJHt0aGlzLmNvbmZpZy5uYW1lfVJvbGVBbmRCaW5kaW5nYCwge1xuICAgICAgICBjbHVzdGVyLFxuICAgICAgICBtYW5pZmVzdDogW3JvbGUsIHJvbGVCaW5kaW5nXSxcbiAgICAgIH0pO1xuXG4gICAgfSlcbiAgfVxuXG59XG5cbiJdfQ==
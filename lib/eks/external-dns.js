"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExternalDNSNested = void 0;
const aws_cdk_lib_1 = require("aws-cdk-lib");
const aws_iam_1 = require("aws-cdk-lib/aws-iam");
const fs = require("fs");
const yaml = require("js-yaml");
class ExternalDNSNested extends aws_cdk_lib_1.NestedStack {
    constructor(scope, id, eksCluster, externalDNSConfig, props) {
        super(scope, id);
        this.config = externalDNSConfig;
        // this.createDNSRole()
        this.deployManifest(eksCluster);
    }
    createDNSRole() {
        // When this is passed as role, EKS cluster successfully created(I think there is a bug in CDK). 
        const policyStatement = new aws_iam_1.PolicyStatement({
            sid: "AllowExternalDNSUpdates",
            actions: [
                "route53:ChangeResourceRecordSets",
            ],
            effect: aws_iam_1.Effect.ALLOW,
            resources: ["arn:aws:route53:::hostedzone/*"]
        });
        const policyStatement2 = new aws_iam_1.PolicyStatement({
            sid: "AllowExternalDNSUpdates2",
            actions: [
                "route53:ListHostedZones",
                "route53:ListResourceRecordSets"
            ],
            effect: aws_iam_1.Effect.ALLOW,
            resources: ["*"]
        });
        const policyDocument = new aws_iam_1.PolicyDocument({
            statements: [policyStatement, policyStatement2],
        });
        const externalDNSRole = new aws_iam_1.Role(this, `ExternalDNSRole`, {
            roleName: `${aws_cdk_lib_1.Aws.STACK_NAME}-ExternalDNSRole`,
            description: `Role for external dns to create entries`,
            assumedBy: new aws_iam_1.AccountRootPrincipal(),
            inlinePolicies: {
                'ExternalDNSPolicy': policyDocument
            }
        });
        return externalDNSRole;
    }
    deployManifest(cluster) {
        // yaml
        let dataResult = [];
        try {
            const path = require('path');
            let valuesYaml = fs.readFileSync(path.join(__dirname, `./manifests/external-dns.yaml`));
            // Replace Domain and load YAML
            let valuesParsed = yaml.loadAll(valuesYaml.toString().replace(new RegExp('{DOMAIN_FILTER}', 'gi'), this.config.domainFilter));
            if (typeof valuesParsed === 'object' && valuesParsed !== null) {
                dataResult = valuesParsed;
            }
        }
        catch (exception) {
            // pass
            console.error(" > Failed to load 'external-dns.yaml' for 'external-dns' deploy...");
            console.error(exception);
            return;
        }
        // Create Kubernetes ServiceAccount
        let svcAccount = cluster.addServiceAccount('external-dns', {
            name: 'external-dns',
            namespace: 'kube-system',
        });
        const iamPolicyDocument = JSON.parse(`{
      "Version": "2012-10-17",
      "Statement": [
        {
          "Effect": "Allow",
          "Action": [
            "route53:ChangeResourceRecordSets"
          ],
          "Resource": [
            "arn:aws:route53:::hostedzone/*"
          ]
        },
        {
          "Effect": "Allow",
          "Action": [
            "route53:ListHostedZones",
            "route53:ListResourceRecordSets"
          ],
          "Resource": [
            "*"
          ]
        }
      ]
    }`);
        // Create IAM Policy
        const iamPolicy = new aws_iam_1.Policy(this, 'AllowExternalDNSUpdatesIAMPolicy', {
            policyName: 'AllowExternalDNSUpdatesIAMPolicy',
            document: aws_iam_1.PolicyDocument.fromJson(iamPolicyDocument),
        });
        // Attach IAM role
        svcAccount.role.attachInlinePolicy(iamPolicy);
        let bodies = [];
        // Install External DNS
        dataResult.forEach(function (val, idx) {
            bodies.push(cluster.addManifest('external-dns-' + idx, val));
        });
        this.bodies = bodies;
    }
}
exports.ExternalDNSNested = ExternalDNSNested;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZXJuYWwtZG5zLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZXh0ZXJuYWwtZG5zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLDZDQUEyRDtBQUUzRCxpREFBa0g7QUFFbEgseUJBQXlCO0FBRXpCLGdDQUFnQztBQUdoQyxNQUFhLGlCQUFrQixTQUFRLHlCQUFXO0lBS2hELFlBQVksS0FBZ0IsRUFBRSxFQUFVLEVBQUUsVUFBbUIsRUFBRSxpQkFBb0MsRUFBRSxLQUFrQjtRQUNySCxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBRWpCLElBQUksQ0FBQyxNQUFNLEdBQUcsaUJBQWlCLENBQUM7UUFFaEMsdUJBQXVCO1FBQ3ZCLElBQUksQ0FBQyxjQUFjLENBQUMsVUFBVSxDQUFDLENBQUE7SUFFakMsQ0FBQztJQUVELGFBQWE7UUFDWCxpR0FBaUc7UUFDakcsTUFBTSxlQUFlLEdBQUcsSUFBSSx5QkFBZSxDQUFDO1lBQzFDLEdBQUcsRUFBRSx5QkFBeUI7WUFDOUIsT0FBTyxFQUFFO2dCQUNQLGtDQUFrQzthQUNuQztZQUNELE1BQU0sRUFBRSxnQkFBTSxDQUFDLEtBQUs7WUFDcEIsU0FBUyxFQUFFLENBQUMsZ0NBQWdDLENBQUM7U0FDOUMsQ0FBQyxDQUFBO1FBRUYsTUFBTSxnQkFBZ0IsR0FBRyxJQUFJLHlCQUFlLENBQUM7WUFDM0MsR0FBRyxFQUFFLDBCQUEwQjtZQUMvQixPQUFPLEVBQUU7Z0JBQ1AseUJBQXlCO2dCQUN6QixnQ0FBZ0M7YUFDakM7WUFDRCxNQUFNLEVBQUUsZ0JBQU0sQ0FBQyxLQUFLO1lBQ3BCLFNBQVMsRUFBRSxDQUFDLEdBQUcsQ0FBQztTQUNqQixDQUFDLENBQUE7UUFFRixNQUFNLGNBQWMsR0FBRyxJQUFJLHdCQUFjLENBQUM7WUFDeEMsVUFBVSxFQUFFLENBQUMsZUFBZSxFQUFFLGdCQUFnQixDQUFDO1NBQ2hELENBQUMsQ0FBQztRQUVILE1BQU0sZUFBZSxHQUFHLElBQUksY0FBSSxDQUFDLElBQUksRUFBRSxpQkFBaUIsRUFBRTtZQUN4RCxRQUFRLEVBQUUsR0FBRyxpQkFBRyxDQUFDLFVBQVUsa0JBQWtCO1lBQzdDLFdBQVcsRUFBRSx5Q0FBeUM7WUFDdEQsU0FBUyxFQUFFLElBQUksOEJBQW9CLEVBQUU7WUFDckMsY0FBYyxFQUFFO2dCQUNkLG1CQUFtQixFQUFFLGNBQWM7YUFDcEM7U0FDRixDQUFDLENBQUE7UUFFRixPQUFPLGVBQWUsQ0FBQTtJQUN4QixDQUFDO0lBRUQsY0FBYyxDQUFDLE9BQWdCO1FBRTdCLE9BQU87UUFDUCxJQUFJLFVBQVUsR0FBNkIsRUFBRSxDQUFDO1FBRTlDLElBQUk7WUFHRixNQUFNLElBQUksR0FBRyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUM7WUFFN0IsSUFBSSxVQUFVLEdBQUcsRUFBRSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSwrQkFBK0IsQ0FBQyxDQUFDLENBQUM7WUFDeEYsK0JBQStCO1lBQy9CLElBQUksWUFBWSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLFFBQVEsRUFBRSxDQUFDLE9BQU8sQ0FDM0QsSUFBSSxNQUFNLENBQUMsaUJBQWlCLEVBQUUsSUFBSSxDQUFDLEVBQ25DLElBQUksQ0FBQyxNQUFNLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQztZQUM3QixJQUFJLE9BQU8sWUFBWSxLQUFLLFFBQVEsSUFBSSxZQUFZLEtBQUssSUFBSSxFQUFFO2dCQUM3RCxVQUFVLEdBQUcsWUFBd0MsQ0FBQzthQUN2RDtTQUNGO1FBQUMsT0FBTyxTQUFTLEVBQUU7WUFDbEIsT0FBTztZQUNQLE9BQU8sQ0FBQyxLQUFLLENBQUMsb0VBQW9FLENBQUMsQ0FBQztZQUNwRixPQUFPLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDO1lBQ3pCLE9BQU87U0FDUjtRQUVELG1DQUFtQztRQUNuQyxJQUFJLFVBQVUsR0FBRyxPQUFPLENBQUMsaUJBQWlCLENBQUMsY0FBYyxFQUFFO1lBQ3pELElBQUksRUFBRSxjQUFjO1lBQ3BCLFNBQVMsRUFBRSxhQUFhO1NBQ3pCLENBQUMsQ0FBQztRQUVILE1BQU0saUJBQWlCLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7TUF1Qm5DLENBQUMsQ0FBQTtRQUVILG9CQUFvQjtRQUNwQixNQUFNLFNBQVMsR0FBRyxJQUFJLGdCQUFNLENBQUMsSUFBSSxFQUFFLGtDQUFrQyxFQUFFO1lBQ3JFLFVBQVUsRUFBRSxrQ0FBa0M7WUFDOUMsUUFBUSxFQUFFLHdCQUFjLENBQUMsUUFBUSxDQUFDLGlCQUFpQixDQUFDO1NBQ3JELENBQUMsQ0FBQTtRQUVGLGtCQUFrQjtRQUNsQixVQUFVLENBQUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBRTlDLElBQUksTUFBTSxHQUFnQixFQUFFLENBQUM7UUFFN0IsdUJBQXVCO1FBQ3ZCLFVBQVUsQ0FBQyxPQUFPLENBQUMsVUFBVSxHQUFHLEVBQUUsR0FBRztZQUNuQyxNQUFNLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsZUFBZSxHQUFHLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDO1FBQy9ELENBQUMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLE1BQU0sR0FBRyxNQUFNLENBQUM7SUFDekIsQ0FBQztDQUVBO0FBL0hELDhDQStIQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IEF3cywgTmVzdGVkU3RhY2ssIFN0YWNrUHJvcHMgfSBmcm9tICdhd3MtY2RrLWxpYic7XG5pbXBvcnQgeyBDbHVzdGVyIH0gZnJvbSAnYXdzLWNkay1saWIvYXdzLWVrcyc7XG5pbXBvcnQgeyBBY2NvdW50Um9vdFByaW5jaXBhbCwgRWZmZWN0LCBQb2xpY3ksIFBvbGljeURvY3VtZW50LCBQb2xpY3lTdGF0ZW1lbnQsIFJvbGUgfSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtaWFtJztcbmltcG9ydCB7IENvbnN0cnVjdCB9IGZyb20gXCJjb25zdHJ1Y3RzXCI7XG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcyc7XG5cbmltcG9ydCAqIGFzIHlhbWwgZnJvbSAnanMteWFtbCc7XG5pbXBvcnQgeyBFeHRlcm5hbEROU0NvbmZpZyB9IGZyb20gJy4uLy4uL2ludGVyZmFjZXMvbGliL2Vrcy9pbnRlcmZhY2VzJztcblxuZXhwb3J0IGNsYXNzIEV4dGVybmFsRE5TTmVzdGVkIGV4dGVuZHMgTmVzdGVkU3RhY2sge1xuICBib2R5OiBDb25zdHJ1Y3Q7XG4gIGJvZGllczogQ29uc3RydWN0W107XG4gIGNvbmZpZzogRXh0ZXJuYWxETlNDb25maWc7XG5cbiAgY29uc3RydWN0b3Ioc2NvcGU6IENvbnN0cnVjdCwgaWQ6IHN0cmluZywgZWtzQ2x1c3RlcjogQ2x1c3RlciwgZXh0ZXJuYWxETlNDb25maWc6IEV4dGVybmFsRE5TQ29uZmlnLCBwcm9wcz86IFN0YWNrUHJvcHMpIHtcbiAgICBzdXBlcihzY29wZSwgaWQpO1xuXG4gICAgdGhpcy5jb25maWcgPSBleHRlcm5hbEROU0NvbmZpZztcbiAgICBcbiAgICAvLyB0aGlzLmNyZWF0ZUROU1JvbGUoKVxuICAgIHRoaXMuZGVwbG95TWFuaWZlc3QoZWtzQ2x1c3RlcilcblxuICB9XG5cbiAgY3JlYXRlRE5TUm9sZSgpOiBSb2xlIHtcbiAgICAvLyBXaGVuIHRoaXMgaXMgcGFzc2VkIGFzIHJvbGUsIEVLUyBjbHVzdGVyIHN1Y2Nlc3NmdWxseSBjcmVhdGVkKEkgdGhpbmsgdGhlcmUgaXMgYSBidWcgaW4gQ0RLKS4gXG4gICAgY29uc3QgcG9saWN5U3RhdGVtZW50ID0gbmV3IFBvbGljeVN0YXRlbWVudCh7XG4gICAgICBzaWQ6IFwiQWxsb3dFeHRlcm5hbEROU1VwZGF0ZXNcIixcbiAgICAgIGFjdGlvbnM6IFtcbiAgICAgICAgXCJyb3V0ZTUzOkNoYW5nZVJlc291cmNlUmVjb3JkU2V0c1wiLFxuICAgICAgXSxcbiAgICAgIGVmZmVjdDogRWZmZWN0LkFMTE9XLFxuICAgICAgcmVzb3VyY2VzOiBbXCJhcm46YXdzOnJvdXRlNTM6Ojpob3N0ZWR6b25lLypcIl1cbiAgICB9KVxuXG4gICAgY29uc3QgcG9saWN5U3RhdGVtZW50MiA9IG5ldyBQb2xpY3lTdGF0ZW1lbnQoe1xuICAgICAgc2lkOiBcIkFsbG93RXh0ZXJuYWxETlNVcGRhdGVzMlwiLFxuICAgICAgYWN0aW9uczogW1xuICAgICAgICBcInJvdXRlNTM6TGlzdEhvc3RlZFpvbmVzXCIsXG4gICAgICAgIFwicm91dGU1MzpMaXN0UmVzb3VyY2VSZWNvcmRTZXRzXCJcbiAgICAgIF0sXG4gICAgICBlZmZlY3Q6IEVmZmVjdC5BTExPVyxcbiAgICAgIHJlc291cmNlczogW1wiKlwiXVxuICAgIH0pXG5cbiAgICBjb25zdCBwb2xpY3lEb2N1bWVudCA9IG5ldyBQb2xpY3lEb2N1bWVudCh7XG4gICAgICBzdGF0ZW1lbnRzOiBbcG9saWN5U3RhdGVtZW50LCBwb2xpY3lTdGF0ZW1lbnQyXSxcbiAgICB9KTtcblxuICAgIGNvbnN0IGV4dGVybmFsRE5TUm9sZSA9IG5ldyBSb2xlKHRoaXMsIGBFeHRlcm5hbEROU1JvbGVgLCB7XG4gICAgICByb2xlTmFtZTogYCR7QXdzLlNUQUNLX05BTUV9LUV4dGVybmFsRE5TUm9sZWAsXG4gICAgICBkZXNjcmlwdGlvbjogYFJvbGUgZm9yIGV4dGVybmFsIGRucyB0byBjcmVhdGUgZW50cmllc2AsXG4gICAgICBhc3N1bWVkQnk6IG5ldyBBY2NvdW50Um9vdFByaW5jaXBhbCgpLFxuICAgICAgaW5saW5lUG9saWNpZXM6IHtcbiAgICAgICAgJ0V4dGVybmFsRE5TUG9saWN5JzogcG9saWN5RG9jdW1lbnRcbiAgICAgIH1cbiAgICB9KVxuXG4gICAgcmV0dXJuIGV4dGVybmFsRE5TUm9sZVxuICB9XG5cbiAgZGVwbG95TWFuaWZlc3QoY2x1c3RlcjogQ2x1c3Rlcikge1xuXG4gICAgLy8geWFtbFxuICAgIGxldCBkYXRhUmVzdWx0OiBSZWNvcmQ8c3RyaW5nLCBvYmplY3Q+W10gPSBbXTtcblxuICAgIHRyeSB7XG5cblxuICAgICAgY29uc3QgcGF0aCA9IHJlcXVpcmUoJ3BhdGgnKTtcblxuICAgICAgbGV0IHZhbHVlc1lhbWwgPSBmcy5yZWFkRmlsZVN5bmMocGF0aC5qb2luKF9fZGlybmFtZSwgYC4vbWFuaWZlc3RzL2V4dGVybmFsLWRucy55YW1sYCkpO1xuICAgICAgLy8gUmVwbGFjZSBEb21haW4gYW5kIGxvYWQgWUFNTFxuICAgICAgbGV0IHZhbHVlc1BhcnNlZCA9IHlhbWwubG9hZEFsbCh2YWx1ZXNZYW1sLnRvU3RyaW5nKCkucmVwbGFjZShcbiAgICAgICAgbmV3IFJlZ0V4cCgne0RPTUFJTl9GSUxURVJ9JywgJ2dpJyksXG4gICAgICAgIHRoaXMuY29uZmlnLmRvbWFpbkZpbHRlcikpO1xuICAgICAgaWYgKHR5cGVvZiB2YWx1ZXNQYXJzZWQgPT09ICdvYmplY3QnICYmIHZhbHVlc1BhcnNlZCAhPT0gbnVsbCkge1xuICAgICAgICBkYXRhUmVzdWx0ID0gdmFsdWVzUGFyc2VkIGFzIFJlY29yZDxzdHJpbmcsIG9iamVjdD5bXTtcbiAgICAgIH1cbiAgICB9IGNhdGNoIChleGNlcHRpb24pIHtcbiAgICAgIC8vIHBhc3NcbiAgICAgIGNvbnNvbGUuZXJyb3IoXCIgPiBGYWlsZWQgdG8gbG9hZCAnZXh0ZXJuYWwtZG5zLnlhbWwnIGZvciAnZXh0ZXJuYWwtZG5zJyBkZXBsb3kuLi5cIik7XG4gICAgICBjb25zb2xlLmVycm9yKGV4Y2VwdGlvbik7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy8gQ3JlYXRlIEt1YmVybmV0ZXMgU2VydmljZUFjY291bnRcbiAgICBsZXQgc3ZjQWNjb3VudCA9IGNsdXN0ZXIuYWRkU2VydmljZUFjY291bnQoJ2V4dGVybmFsLWRucycsIHtcbiAgICAgIG5hbWU6ICdleHRlcm5hbC1kbnMnLFxuICAgICAgbmFtZXNwYWNlOiAna3ViZS1zeXN0ZW0nLFxuICAgIH0pO1xuXG4gICAgY29uc3QgaWFtUG9saWN5RG9jdW1lbnQgPSBKU09OLnBhcnNlKGB7XG4gICAgICBcIlZlcnNpb25cIjogXCIyMDEyLTEwLTE3XCIsXG4gICAgICBcIlN0YXRlbWVudFwiOiBbXG4gICAgICAgIHtcbiAgICAgICAgICBcIkVmZmVjdFwiOiBcIkFsbG93XCIsXG4gICAgICAgICAgXCJBY3Rpb25cIjogW1xuICAgICAgICAgICAgXCJyb3V0ZTUzOkNoYW5nZVJlc291cmNlUmVjb3JkU2V0c1wiXG4gICAgICAgICAgXSxcbiAgICAgICAgICBcIlJlc291cmNlXCI6IFtcbiAgICAgICAgICAgIFwiYXJuOmF3czpyb3V0ZTUzOjo6aG9zdGVkem9uZS8qXCJcbiAgICAgICAgICBdXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICBcIkVmZmVjdFwiOiBcIkFsbG93XCIsXG4gICAgICAgICAgXCJBY3Rpb25cIjogW1xuICAgICAgICAgICAgXCJyb3V0ZTUzOkxpc3RIb3N0ZWRab25lc1wiLFxuICAgICAgICAgICAgXCJyb3V0ZTUzOkxpc3RSZXNvdXJjZVJlY29yZFNldHNcIlxuICAgICAgICAgIF0sXG4gICAgICAgICAgXCJSZXNvdXJjZVwiOiBbXG4gICAgICAgICAgICBcIipcIlxuICAgICAgICAgIF1cbiAgICAgICAgfVxuICAgICAgXVxuICAgIH1gKVxuXG4gICAgLy8gQ3JlYXRlIElBTSBQb2xpY3lcbiAgICBjb25zdCBpYW1Qb2xpY3kgPSBuZXcgUG9saWN5KHRoaXMsICdBbGxvd0V4dGVybmFsRE5TVXBkYXRlc0lBTVBvbGljeScsIHtcbiAgICAgIHBvbGljeU5hbWU6ICdBbGxvd0V4dGVybmFsRE5TVXBkYXRlc0lBTVBvbGljeScsXG4gICAgICBkb2N1bWVudDogUG9saWN5RG9jdW1lbnQuZnJvbUpzb24oaWFtUG9saWN5RG9jdW1lbnQpLFxuICAgIH0pXG5cbiAgICAvLyBBdHRhY2ggSUFNIHJvbGVcbiAgICBzdmNBY2NvdW50LnJvbGUuYXR0YWNoSW5saW5lUG9saWN5KGlhbVBvbGljeSk7XG5cbiAgICBsZXQgYm9kaWVzOiBDb25zdHJ1Y3RbXSA9IFtdO1xuXG4gICAgLy8gSW5zdGFsbCBFeHRlcm5hbCBETlNcbiAgICBkYXRhUmVzdWx0LmZvckVhY2goZnVuY3Rpb24gKHZhbCwgaWR4KSB7XG4gICAgICBib2RpZXMucHVzaChjbHVzdGVyLmFkZE1hbmlmZXN0KCdleHRlcm5hbC1kbnMtJyArIGlkeCwgdmFsKSk7XG4gICAgfSk7XG5cbiAgICB0aGlzLmJvZGllcyA9IGJvZGllcztcbn1cblxufSJdfQ==
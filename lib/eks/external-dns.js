"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExternalDNS = void 0;
const aws_cdk_lib_1 = require("aws-cdk-lib");
const aws_iam_1 = require("aws-cdk-lib/aws-iam");
const fs = __importStar(require("fs"));
const yaml = __importStar(require("js-yaml"));
class ExternalDNS extends aws_cdk_lib_1.NestedStack {
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
        // get current time
        const timeNow = Date.now() / 1000;
        // yaml
        let dataResult = [];
        try {
            const path = require('path');
            let valuesYaml = fs.readFileSync(path.join(__dirname, `./manifests/external-dns.yaml`));
            // Replace Domain and load YAML
            let valuesParsed = yaml.loadAll(valuesYaml.toString()
                .replace(new RegExp('{DOMAIN_FILTER}', 'gi'), this.config.domainFilter)
                .replace(new RegExp('{OWNER_ID}', 'gi'), `cdk-${timeNow}`));
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
exports.ExternalDNS = ExternalDNS;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZXJuYWwtZG5zLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZXh0ZXJuYWwtZG5zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsNkNBQTJEO0FBRTNELGlEQUFrSDtBQUVsSCx1Q0FBeUI7QUFFekIsOENBQWdDO0FBR2hDLE1BQWEsV0FBWSxTQUFRLHlCQUFXO0lBSzFDLFlBQVksS0FBZ0IsRUFBRSxFQUFVLEVBQUUsVUFBbUIsRUFBRSxpQkFBb0MsRUFBRSxLQUFrQjtRQUNySCxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBRWpCLElBQUksQ0FBQyxNQUFNLEdBQUcsaUJBQWlCLENBQUM7UUFFaEMsdUJBQXVCO1FBQ3ZCLElBQUksQ0FBQyxjQUFjLENBQUMsVUFBVSxDQUFDLENBQUE7SUFFakMsQ0FBQztJQUVELGFBQWE7UUFDWCxnR0FBZ0c7UUFDaEcsTUFBTSxlQUFlLEdBQUcsSUFBSSx5QkFBZSxDQUFDO1lBQzFDLEdBQUcsRUFBRSx5QkFBeUI7WUFDOUIsT0FBTyxFQUFFO2dCQUNQLGtDQUFrQzthQUNuQztZQUNELE1BQU0sRUFBRSxnQkFBTSxDQUFDLEtBQUs7WUFDcEIsU0FBUyxFQUFFLENBQUMsZ0NBQWdDLENBQUM7U0FDOUMsQ0FBQyxDQUFBO1FBRUYsTUFBTSxnQkFBZ0IsR0FBRyxJQUFJLHlCQUFlLENBQUM7WUFDM0MsR0FBRyxFQUFFLDBCQUEwQjtZQUMvQixPQUFPLEVBQUU7Z0JBQ1AseUJBQXlCO2dCQUN6QixnQ0FBZ0M7YUFDakM7WUFDRCxNQUFNLEVBQUUsZ0JBQU0sQ0FBQyxLQUFLO1lBQ3BCLFNBQVMsRUFBRSxDQUFDLEdBQUcsQ0FBQztTQUNqQixDQUFDLENBQUE7UUFFRixNQUFNLGNBQWMsR0FBRyxJQUFJLHdCQUFjLENBQUM7WUFDeEMsVUFBVSxFQUFFLENBQUMsZUFBZSxFQUFFLGdCQUFnQixDQUFDO1NBQ2hELENBQUMsQ0FBQztRQUVILE1BQU0sZUFBZSxHQUFHLElBQUksY0FBSSxDQUFDLElBQUksRUFBRSxpQkFBaUIsRUFBRTtZQUN4RCxRQUFRLEVBQUUsR0FBRyxpQkFBRyxDQUFDLFVBQVUsa0JBQWtCO1lBQzdDLFdBQVcsRUFBRSx5Q0FBeUM7WUFDdEQsU0FBUyxFQUFFLElBQUksOEJBQW9CLEVBQUU7WUFDckMsY0FBYyxFQUFFO2dCQUNkLG1CQUFtQixFQUFFLGNBQWM7YUFDcEM7U0FDRixDQUFDLENBQUE7UUFFRixPQUFPLGVBQWUsQ0FBQTtJQUN4QixDQUFDO0lBRUQsY0FBYyxDQUFDLE9BQWdCO1FBRTdCLG1CQUFtQjtRQUNuQixNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsR0FBRyxFQUFFLEdBQUcsSUFBSSxDQUFDO1FBRWxDLE9BQU87UUFDUCxJQUFJLFVBQVUsR0FBNkIsRUFBRSxDQUFDO1FBRTlDLElBQUk7WUFHRixNQUFNLElBQUksR0FBRyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUM7WUFFN0IsSUFBSSxVQUFVLEdBQUcsRUFBRSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSwrQkFBK0IsQ0FBQyxDQUFDLENBQUM7WUFDeEYsK0JBQStCO1lBQy9CLElBQUksWUFBWSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLFFBQVEsRUFBRTtpQkFDbEQsT0FBTyxDQUFDLElBQUksTUFBTSxDQUFDLGlCQUFpQixFQUFFLElBQUksQ0FBQyxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsWUFBWSxDQUFDO2lCQUN0RSxPQUFPLENBQUMsSUFBSSxNQUFNLENBQUMsWUFBWSxFQUFFLElBQUksQ0FBQyxFQUFFLE9BQU8sT0FBTyxFQUFFLENBQUMsQ0FDM0QsQ0FBQztZQUNGLElBQUksT0FBTyxZQUFZLEtBQUssUUFBUSxJQUFJLFlBQVksS0FBSyxJQUFJLEVBQUU7Z0JBQzdELFVBQVUsR0FBRyxZQUF3QyxDQUFDO2FBQ3ZEO1NBQ0Y7UUFBQyxPQUFPLFNBQVMsRUFBRTtZQUNsQixPQUFPO1lBQ1AsT0FBTyxDQUFDLEtBQUssQ0FBQyxvRUFBb0UsQ0FBQyxDQUFDO1lBQ3BGLE9BQU8sQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLENBQUM7WUFDekIsT0FBTztTQUNSO1FBRUQsbUNBQW1DO1FBQ25DLElBQUksVUFBVSxHQUFHLE9BQU8sQ0FBQyxpQkFBaUIsQ0FBQyxjQUFjLEVBQUU7WUFDekQsSUFBSSxFQUFFLGNBQWM7WUFDcEIsU0FBUyxFQUFFLGFBQWE7U0FDekIsQ0FBQyxDQUFDO1FBRUgsTUFBTSxpQkFBaUIsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztNQXVCbkMsQ0FBQyxDQUFBO1FBRUgsb0JBQW9CO1FBQ3BCLE1BQU0sU0FBUyxHQUFHLElBQUksZ0JBQU0sQ0FBQyxJQUFJLEVBQUUsa0NBQWtDLEVBQUU7WUFDckUsVUFBVSxFQUFFLGtDQUFrQztZQUM5QyxRQUFRLEVBQUUsd0JBQWMsQ0FBQyxRQUFRLENBQUMsaUJBQWlCLENBQUM7U0FDckQsQ0FBQyxDQUFBO1FBRUYsa0JBQWtCO1FBQ2xCLFVBQVUsQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsU0FBUyxDQUFDLENBQUM7UUFFOUMsSUFBSSxNQUFNLEdBQWdCLEVBQUUsQ0FBQztRQUU3Qix1QkFBdUI7UUFDdkIsVUFBVSxDQUFDLE9BQU8sQ0FBQyxVQUFVLEdBQUcsRUFBRSxHQUFHO1lBQ25DLE1BQU0sQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxlQUFlLEdBQUcsR0FBRyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUM7UUFDL0QsQ0FBQyxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQztJQUN2QixDQUFDO0NBRUY7QUFuSUQsa0NBbUlDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQXdzLCBOZXN0ZWRTdGFjaywgU3RhY2tQcm9wcyB9IGZyb20gJ2F3cy1jZGstbGliJztcbmltcG9ydCB7IENsdXN0ZXIgfSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtZWtzJztcbmltcG9ydCB7IEFjY291bnRSb290UHJpbmNpcGFsLCBFZmZlY3QsIFBvbGljeSwgUG9saWN5RG9jdW1lbnQsIFBvbGljeVN0YXRlbWVudCwgUm9sZSB9IGZyb20gJ2F3cy1jZGstbGliL2F3cy1pYW0nO1xuaW1wb3J0IHsgQ29uc3RydWN0IH0gZnJvbSBcImNvbnN0cnVjdHNcIjtcbmltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzJztcblxuaW1wb3J0ICogYXMgeWFtbCBmcm9tICdqcy15YW1sJztcbmltcG9ydCB7IEV4dGVybmFsRE5TQ29uZmlnIH0gZnJvbSAnLi4vLi4vaW50ZXJmYWNlcy9saWIvZWtzL2ludGVyZmFjZXMnO1xuXG5leHBvcnQgY2xhc3MgRXh0ZXJuYWxETlMgZXh0ZW5kcyBOZXN0ZWRTdGFjayB7XG4gIGJvZHk6IENvbnN0cnVjdDtcbiAgYm9kaWVzOiBDb25zdHJ1Y3RbXTtcbiAgY29uZmlnOiBFeHRlcm5hbEROU0NvbmZpZztcblxuICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nLCBla3NDbHVzdGVyOiBDbHVzdGVyLCBleHRlcm5hbEROU0NvbmZpZzogRXh0ZXJuYWxETlNDb25maWcsIHByb3BzPzogU3RhY2tQcm9wcykge1xuICAgIHN1cGVyKHNjb3BlLCBpZCk7XG5cbiAgICB0aGlzLmNvbmZpZyA9IGV4dGVybmFsRE5TQ29uZmlnO1xuXG4gICAgLy8gdGhpcy5jcmVhdGVETlNSb2xlKClcbiAgICB0aGlzLmRlcGxveU1hbmlmZXN0KGVrc0NsdXN0ZXIpXG5cbiAgfVxuXG4gIGNyZWF0ZUROU1JvbGUoKTogUm9sZSB7XG4gICAgLy8gV2hlbiB0aGlzIGlzIHBhc3NlZCBhcyByb2xlLCBFS1MgY2x1c3RlciBzdWNjZXNzZnVsbHkgY3JlYXRlZChJIHRoaW5rIHRoZXJlIGlzIGEgYnVnIGluIENESykuXG4gICAgY29uc3QgcG9saWN5U3RhdGVtZW50ID0gbmV3IFBvbGljeVN0YXRlbWVudCh7XG4gICAgICBzaWQ6IFwiQWxsb3dFeHRlcm5hbEROU1VwZGF0ZXNcIixcbiAgICAgIGFjdGlvbnM6IFtcbiAgICAgICAgXCJyb3V0ZTUzOkNoYW5nZVJlc291cmNlUmVjb3JkU2V0c1wiLFxuICAgICAgXSxcbiAgICAgIGVmZmVjdDogRWZmZWN0LkFMTE9XLFxuICAgICAgcmVzb3VyY2VzOiBbXCJhcm46YXdzOnJvdXRlNTM6Ojpob3N0ZWR6b25lLypcIl1cbiAgICB9KVxuXG4gICAgY29uc3QgcG9saWN5U3RhdGVtZW50MiA9IG5ldyBQb2xpY3lTdGF0ZW1lbnQoe1xuICAgICAgc2lkOiBcIkFsbG93RXh0ZXJuYWxETlNVcGRhdGVzMlwiLFxuICAgICAgYWN0aW9uczogW1xuICAgICAgICBcInJvdXRlNTM6TGlzdEhvc3RlZFpvbmVzXCIsXG4gICAgICAgIFwicm91dGU1MzpMaXN0UmVzb3VyY2VSZWNvcmRTZXRzXCJcbiAgICAgIF0sXG4gICAgICBlZmZlY3Q6IEVmZmVjdC5BTExPVyxcbiAgICAgIHJlc291cmNlczogW1wiKlwiXVxuICAgIH0pXG5cbiAgICBjb25zdCBwb2xpY3lEb2N1bWVudCA9IG5ldyBQb2xpY3lEb2N1bWVudCh7XG4gICAgICBzdGF0ZW1lbnRzOiBbcG9saWN5U3RhdGVtZW50LCBwb2xpY3lTdGF0ZW1lbnQyXSxcbiAgICB9KTtcblxuICAgIGNvbnN0IGV4dGVybmFsRE5TUm9sZSA9IG5ldyBSb2xlKHRoaXMsIGBFeHRlcm5hbEROU1JvbGVgLCB7XG4gICAgICByb2xlTmFtZTogYCR7QXdzLlNUQUNLX05BTUV9LUV4dGVybmFsRE5TUm9sZWAsXG4gICAgICBkZXNjcmlwdGlvbjogYFJvbGUgZm9yIGV4dGVybmFsIGRucyB0byBjcmVhdGUgZW50cmllc2AsXG4gICAgICBhc3N1bWVkQnk6IG5ldyBBY2NvdW50Um9vdFByaW5jaXBhbCgpLFxuICAgICAgaW5saW5lUG9saWNpZXM6IHtcbiAgICAgICAgJ0V4dGVybmFsRE5TUG9saWN5JzogcG9saWN5RG9jdW1lbnRcbiAgICAgIH1cbiAgICB9KVxuXG4gICAgcmV0dXJuIGV4dGVybmFsRE5TUm9sZVxuICB9XG5cbiAgZGVwbG95TWFuaWZlc3QoY2x1c3RlcjogQ2x1c3Rlcikge1xuXG4gICAgLy8gZ2V0IGN1cnJlbnQgdGltZVxuICAgIGNvbnN0IHRpbWVOb3cgPSBEYXRlLm5vdygpIC8gMTAwMDtcblxuICAgIC8vIHlhbWxcbiAgICBsZXQgZGF0YVJlc3VsdDogUmVjb3JkPHN0cmluZywgb2JqZWN0PltdID0gW107XG5cbiAgICB0cnkge1xuXG5cbiAgICAgIGNvbnN0IHBhdGggPSByZXF1aXJlKCdwYXRoJyk7XG5cbiAgICAgIGxldCB2YWx1ZXNZYW1sID0gZnMucmVhZEZpbGVTeW5jKHBhdGguam9pbihfX2Rpcm5hbWUsIGAuL21hbmlmZXN0cy9leHRlcm5hbC1kbnMueWFtbGApKTtcbiAgICAgIC8vIFJlcGxhY2UgRG9tYWluIGFuZCBsb2FkIFlBTUxcbiAgICAgIGxldCB2YWx1ZXNQYXJzZWQgPSB5YW1sLmxvYWRBbGwodmFsdWVzWWFtbC50b1N0cmluZygpXG4gICAgICAgIC5yZXBsYWNlKG5ldyBSZWdFeHAoJ3tET01BSU5fRklMVEVSfScsICdnaScpLCB0aGlzLmNvbmZpZy5kb21haW5GaWx0ZXIpXG4gICAgICAgIC5yZXBsYWNlKG5ldyBSZWdFeHAoJ3tPV05FUl9JRH0nLCAnZ2knKSwgYGNkay0ke3RpbWVOb3d9YClcbiAgICAgICk7XG4gICAgICBpZiAodHlwZW9mIHZhbHVlc1BhcnNlZCA9PT0gJ29iamVjdCcgJiYgdmFsdWVzUGFyc2VkICE9PSBudWxsKSB7XG4gICAgICAgIGRhdGFSZXN1bHQgPSB2YWx1ZXNQYXJzZWQgYXMgUmVjb3JkPHN0cmluZywgb2JqZWN0PltdO1xuICAgICAgfVxuICAgIH0gY2F0Y2ggKGV4Y2VwdGlvbikge1xuICAgICAgLy8gcGFzc1xuICAgICAgY29uc29sZS5lcnJvcihcIiA+IEZhaWxlZCB0byBsb2FkICdleHRlcm5hbC1kbnMueWFtbCcgZm9yICdleHRlcm5hbC1kbnMnIGRlcGxveS4uLlwiKTtcbiAgICAgIGNvbnNvbGUuZXJyb3IoZXhjZXB0aW9uKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICAvLyBDcmVhdGUgS3ViZXJuZXRlcyBTZXJ2aWNlQWNjb3VudFxuICAgIGxldCBzdmNBY2NvdW50ID0gY2x1c3Rlci5hZGRTZXJ2aWNlQWNjb3VudCgnZXh0ZXJuYWwtZG5zJywge1xuICAgICAgbmFtZTogJ2V4dGVybmFsLWRucycsXG4gICAgICBuYW1lc3BhY2U6ICdrdWJlLXN5c3RlbScsXG4gICAgfSk7XG5cbiAgICBjb25zdCBpYW1Qb2xpY3lEb2N1bWVudCA9IEpTT04ucGFyc2UoYHtcbiAgICAgIFwiVmVyc2lvblwiOiBcIjIwMTItMTAtMTdcIixcbiAgICAgIFwiU3RhdGVtZW50XCI6IFtcbiAgICAgICAge1xuICAgICAgICAgIFwiRWZmZWN0XCI6IFwiQWxsb3dcIixcbiAgICAgICAgICBcIkFjdGlvblwiOiBbXG4gICAgICAgICAgICBcInJvdXRlNTM6Q2hhbmdlUmVzb3VyY2VSZWNvcmRTZXRzXCJcbiAgICAgICAgICBdLFxuICAgICAgICAgIFwiUmVzb3VyY2VcIjogW1xuICAgICAgICAgICAgXCJhcm46YXdzOnJvdXRlNTM6Ojpob3N0ZWR6b25lLypcIlxuICAgICAgICAgIF1cbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgIFwiRWZmZWN0XCI6IFwiQWxsb3dcIixcbiAgICAgICAgICBcIkFjdGlvblwiOiBbXG4gICAgICAgICAgICBcInJvdXRlNTM6TGlzdEhvc3RlZFpvbmVzXCIsXG4gICAgICAgICAgICBcInJvdXRlNTM6TGlzdFJlc291cmNlUmVjb3JkU2V0c1wiXG4gICAgICAgICAgXSxcbiAgICAgICAgICBcIlJlc291cmNlXCI6IFtcbiAgICAgICAgICAgIFwiKlwiXG4gICAgICAgICAgXVxuICAgICAgICB9XG4gICAgICBdXG4gICAgfWApXG5cbiAgICAvLyBDcmVhdGUgSUFNIFBvbGljeVxuICAgIGNvbnN0IGlhbVBvbGljeSA9IG5ldyBQb2xpY3kodGhpcywgJ0FsbG93RXh0ZXJuYWxETlNVcGRhdGVzSUFNUG9saWN5Jywge1xuICAgICAgcG9saWN5TmFtZTogJ0FsbG93RXh0ZXJuYWxETlNVcGRhdGVzSUFNUG9saWN5JyxcbiAgICAgIGRvY3VtZW50OiBQb2xpY3lEb2N1bWVudC5mcm9tSnNvbihpYW1Qb2xpY3lEb2N1bWVudCksXG4gICAgfSlcblxuICAgIC8vIEF0dGFjaCBJQU0gcm9sZVxuICAgIHN2Y0FjY291bnQucm9sZS5hdHRhY2hJbmxpbmVQb2xpY3koaWFtUG9saWN5KTtcblxuICAgIGxldCBib2RpZXM6IENvbnN0cnVjdFtdID0gW107XG5cbiAgICAvLyBJbnN0YWxsIEV4dGVybmFsIEROU1xuICAgIGRhdGFSZXN1bHQuZm9yRWFjaChmdW5jdGlvbiAodmFsLCBpZHgpIHtcbiAgICAgIGJvZGllcy5wdXNoKGNsdXN0ZXIuYWRkTWFuaWZlc3QoJ2V4dGVybmFsLWRucy0nICsgaWR4LCB2YWwpKTtcbiAgICB9KTtcblxuICAgIHRoaXMuYm9kaWVzID0gYm9kaWVzO1xuICB9XG5cbn0iXX0=
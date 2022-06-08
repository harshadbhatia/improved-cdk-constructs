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
exports.ExternalDNSNested = void 0;
const aws_cdk_lib_1 = require("aws-cdk-lib");
const aws_iam_1 = require("aws-cdk-lib/aws-iam");
const fs = __importStar(require("fs"));
const yaml = __importStar(require("js-yaml"));
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
exports.ExternalDNSNested = ExternalDNSNested;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZXJuYWwtZG5zLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZXh0ZXJuYWwtZG5zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsNkNBQTJEO0FBRTNELGlEQUFrSDtBQUVsSCx1Q0FBeUI7QUFFekIsOENBQWdDO0FBR2hDLE1BQWEsaUJBQWtCLFNBQVEseUJBQVc7SUFLaEQsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxVQUFtQixFQUFFLGlCQUFvQyxFQUFFLEtBQWtCO1FBQ3JILEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFFakIsSUFBSSxDQUFDLE1BQU0sR0FBRyxpQkFBaUIsQ0FBQztRQUVoQyx1QkFBdUI7UUFDdkIsSUFBSSxDQUFDLGNBQWMsQ0FBQyxVQUFVLENBQUMsQ0FBQTtJQUVqQyxDQUFDO0lBRUQsYUFBYTtRQUNYLGlHQUFpRztRQUNqRyxNQUFNLGVBQWUsR0FBRyxJQUFJLHlCQUFlLENBQUM7WUFDMUMsR0FBRyxFQUFFLHlCQUF5QjtZQUM5QixPQUFPLEVBQUU7Z0JBQ1Asa0NBQWtDO2FBQ25DO1lBQ0QsTUFBTSxFQUFFLGdCQUFNLENBQUMsS0FBSztZQUNwQixTQUFTLEVBQUUsQ0FBQyxnQ0FBZ0MsQ0FBQztTQUM5QyxDQUFDLENBQUE7UUFFRixNQUFNLGdCQUFnQixHQUFHLElBQUkseUJBQWUsQ0FBQztZQUMzQyxHQUFHLEVBQUUsMEJBQTBCO1lBQy9CLE9BQU8sRUFBRTtnQkFDUCx5QkFBeUI7Z0JBQ3pCLGdDQUFnQzthQUNqQztZQUNELE1BQU0sRUFBRSxnQkFBTSxDQUFDLEtBQUs7WUFDcEIsU0FBUyxFQUFFLENBQUMsR0FBRyxDQUFDO1NBQ2pCLENBQUMsQ0FBQTtRQUVGLE1BQU0sY0FBYyxHQUFHLElBQUksd0JBQWMsQ0FBQztZQUN4QyxVQUFVLEVBQUUsQ0FBQyxlQUFlLEVBQUUsZ0JBQWdCLENBQUM7U0FDaEQsQ0FBQyxDQUFDO1FBRUgsTUFBTSxlQUFlLEdBQUcsSUFBSSxjQUFJLENBQUMsSUFBSSxFQUFFLGlCQUFpQixFQUFFO1lBQ3hELFFBQVEsRUFBRSxHQUFHLGlCQUFHLENBQUMsVUFBVSxrQkFBa0I7WUFDN0MsV0FBVyxFQUFFLHlDQUF5QztZQUN0RCxTQUFTLEVBQUUsSUFBSSw4QkFBb0IsRUFBRTtZQUNyQyxjQUFjLEVBQUU7Z0JBQ2QsbUJBQW1CLEVBQUUsY0FBYzthQUNwQztTQUNGLENBQUMsQ0FBQTtRQUVGLE9BQU8sZUFBZSxDQUFBO0lBQ3hCLENBQUM7SUFFRCxjQUFjLENBQUMsT0FBZ0I7UUFFN0IsbUJBQW1CO1FBQ25CLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxHQUFHLEVBQUUsR0FBRyxJQUFJLENBQUM7UUFFbEMsT0FBTztRQUNQLElBQUksVUFBVSxHQUE2QixFQUFFLENBQUM7UUFFOUMsSUFBSTtZQUdGLE1BQU0sSUFBSSxHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUU3QixJQUFJLFVBQVUsR0FBRyxFQUFFLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLCtCQUErQixDQUFDLENBQUMsQ0FBQztZQUN4RiwrQkFBK0I7WUFDL0IsSUFBSSxZQUFZLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsUUFBUSxFQUFFO2lCQUNsRCxPQUFPLENBQUMsSUFBSSxNQUFNLENBQUMsaUJBQWlCLEVBQUUsSUFBSSxDQUFDLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxZQUFZLENBQUM7aUJBQ3RFLE9BQU8sQ0FBQyxJQUFJLE1BQU0sQ0FBQyxZQUFZLEVBQUUsSUFBSSxDQUFDLEVBQUUsT0FBTyxPQUFPLEVBQUUsQ0FBQyxDQUN6RCxDQUFDO1lBQ0osSUFBSSxPQUFPLFlBQVksS0FBSyxRQUFRLElBQUksWUFBWSxLQUFLLElBQUksRUFBRTtnQkFDN0QsVUFBVSxHQUFHLFlBQXdDLENBQUM7YUFDdkQ7U0FDRjtRQUFDLE9BQU8sU0FBUyxFQUFFO1lBQ2xCLE9BQU87WUFDUCxPQUFPLENBQUMsS0FBSyxDQUFDLG9FQUFvRSxDQUFDLENBQUM7WUFDcEYsT0FBTyxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQztZQUN6QixPQUFPO1NBQ1I7UUFFRCxtQ0FBbUM7UUFDbkMsSUFBSSxVQUFVLEdBQUcsT0FBTyxDQUFDLGlCQUFpQixDQUFDLGNBQWMsRUFBRTtZQUN6RCxJQUFJLEVBQUUsY0FBYztZQUNwQixTQUFTLEVBQUUsYUFBYTtTQUN6QixDQUFDLENBQUM7UUFFSCxNQUFNLGlCQUFpQixHQUFHLElBQUksQ0FBQyxLQUFLLENBQUM7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O01BdUJuQyxDQUFDLENBQUE7UUFFSCxvQkFBb0I7UUFDcEIsTUFBTSxTQUFTLEdBQUcsSUFBSSxnQkFBTSxDQUFDLElBQUksRUFBRSxrQ0FBa0MsRUFBRTtZQUNyRSxVQUFVLEVBQUUsa0NBQWtDO1lBQzlDLFFBQVEsRUFBRSx3QkFBYyxDQUFDLFFBQVEsQ0FBQyxpQkFBaUIsQ0FBQztTQUNyRCxDQUFDLENBQUE7UUFFRixrQkFBa0I7UUFDbEIsVUFBVSxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUU5QyxJQUFJLE1BQU0sR0FBZ0IsRUFBRSxDQUFDO1FBRTdCLHVCQUF1QjtRQUN2QixVQUFVLENBQUMsT0FBTyxDQUFDLFVBQVUsR0FBRyxFQUFFLEdBQUc7WUFDbkMsTUFBTSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDLGVBQWUsR0FBRyxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQztRQUMvRCxDQUFDLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFDO0lBQ3pCLENBQUM7Q0FFQTtBQW5JRCw4Q0FtSUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBBd3MsIE5lc3RlZFN0YWNrLCBTdGFja1Byb3BzIH0gZnJvbSAnYXdzLWNkay1saWInO1xuaW1wb3J0IHsgQ2x1c3RlciB9IGZyb20gJ2F3cy1jZGstbGliL2F3cy1la3MnO1xuaW1wb3J0IHsgQWNjb3VudFJvb3RQcmluY2lwYWwsIEVmZmVjdCwgUG9saWN5LCBQb2xpY3lEb2N1bWVudCwgUG9saWN5U3RhdGVtZW50LCBSb2xlIH0gZnJvbSAnYXdzLWNkay1saWIvYXdzLWlhbSc7XG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tIFwiY29uc3RydWN0c1wiO1xuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xuXG5pbXBvcnQgKiBhcyB5YW1sIGZyb20gJ2pzLXlhbWwnO1xuaW1wb3J0IHsgRXh0ZXJuYWxETlNDb25maWcgfSBmcm9tICcuLi8uLi9pbnRlcmZhY2VzL2xpYi9la3MvaW50ZXJmYWNlcyc7XG5cbmV4cG9ydCBjbGFzcyBFeHRlcm5hbEROU05lc3RlZCBleHRlbmRzIE5lc3RlZFN0YWNrIHtcbiAgYm9keTogQ29uc3RydWN0O1xuICBib2RpZXM6IENvbnN0cnVjdFtdO1xuICBjb25maWc6IEV4dGVybmFsRE5TQ29uZmlnO1xuXG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcsIGVrc0NsdXN0ZXI6IENsdXN0ZXIsIGV4dGVybmFsRE5TQ29uZmlnOiBFeHRlcm5hbEROU0NvbmZpZywgcHJvcHM/OiBTdGFja1Byb3BzKSB7XG4gICAgc3VwZXIoc2NvcGUsIGlkKTtcblxuICAgIHRoaXMuY29uZmlnID0gZXh0ZXJuYWxETlNDb25maWc7XG5cbiAgICAvLyB0aGlzLmNyZWF0ZUROU1JvbGUoKVxuICAgIHRoaXMuZGVwbG95TWFuaWZlc3QoZWtzQ2x1c3RlcilcblxuICB9XG5cbiAgY3JlYXRlRE5TUm9sZSgpOiBSb2xlIHtcbiAgICAvLyBXaGVuIHRoaXMgaXMgcGFzc2VkIGFzIHJvbGUsIEVLUyBjbHVzdGVyIHN1Y2Nlc3NmdWxseSBjcmVhdGVkKEkgdGhpbmsgdGhlcmUgaXMgYSBidWcgaW4gQ0RLKS4gXG4gICAgY29uc3QgcG9saWN5U3RhdGVtZW50ID0gbmV3IFBvbGljeVN0YXRlbWVudCh7XG4gICAgICBzaWQ6IFwiQWxsb3dFeHRlcm5hbEROU1VwZGF0ZXNcIixcbiAgICAgIGFjdGlvbnM6IFtcbiAgICAgICAgXCJyb3V0ZTUzOkNoYW5nZVJlc291cmNlUmVjb3JkU2V0c1wiLFxuICAgICAgXSxcbiAgICAgIGVmZmVjdDogRWZmZWN0LkFMTE9XLFxuICAgICAgcmVzb3VyY2VzOiBbXCJhcm46YXdzOnJvdXRlNTM6Ojpob3N0ZWR6b25lLypcIl1cbiAgICB9KVxuXG4gICAgY29uc3QgcG9saWN5U3RhdGVtZW50MiA9IG5ldyBQb2xpY3lTdGF0ZW1lbnQoe1xuICAgICAgc2lkOiBcIkFsbG93RXh0ZXJuYWxETlNVcGRhdGVzMlwiLFxuICAgICAgYWN0aW9uczogW1xuICAgICAgICBcInJvdXRlNTM6TGlzdEhvc3RlZFpvbmVzXCIsXG4gICAgICAgIFwicm91dGU1MzpMaXN0UmVzb3VyY2VSZWNvcmRTZXRzXCJcbiAgICAgIF0sXG4gICAgICBlZmZlY3Q6IEVmZmVjdC5BTExPVyxcbiAgICAgIHJlc291cmNlczogW1wiKlwiXVxuICAgIH0pXG5cbiAgICBjb25zdCBwb2xpY3lEb2N1bWVudCA9IG5ldyBQb2xpY3lEb2N1bWVudCh7XG4gICAgICBzdGF0ZW1lbnRzOiBbcG9saWN5U3RhdGVtZW50LCBwb2xpY3lTdGF0ZW1lbnQyXSxcbiAgICB9KTtcblxuICAgIGNvbnN0IGV4dGVybmFsRE5TUm9sZSA9IG5ldyBSb2xlKHRoaXMsIGBFeHRlcm5hbEROU1JvbGVgLCB7XG4gICAgICByb2xlTmFtZTogYCR7QXdzLlNUQUNLX05BTUV9LUV4dGVybmFsRE5TUm9sZWAsXG4gICAgICBkZXNjcmlwdGlvbjogYFJvbGUgZm9yIGV4dGVybmFsIGRucyB0byBjcmVhdGUgZW50cmllc2AsXG4gICAgICBhc3N1bWVkQnk6IG5ldyBBY2NvdW50Um9vdFByaW5jaXBhbCgpLFxuICAgICAgaW5saW5lUG9saWNpZXM6IHtcbiAgICAgICAgJ0V4dGVybmFsRE5TUG9saWN5JzogcG9saWN5RG9jdW1lbnRcbiAgICAgIH1cbiAgICB9KVxuXG4gICAgcmV0dXJuIGV4dGVybmFsRE5TUm9sZVxuICB9XG5cbiAgZGVwbG95TWFuaWZlc3QoY2x1c3RlcjogQ2x1c3Rlcikge1xuXG4gICAgLy8gZ2V0IGN1cnJlbnQgdGltZVxuICAgIGNvbnN0IHRpbWVOb3cgPSBEYXRlLm5vdygpIC8gMTAwMDtcblxuICAgIC8vIHlhbWxcbiAgICBsZXQgZGF0YVJlc3VsdDogUmVjb3JkPHN0cmluZywgb2JqZWN0PltdID0gW107XG5cbiAgICB0cnkge1xuXG5cbiAgICAgIGNvbnN0IHBhdGggPSByZXF1aXJlKCdwYXRoJyk7XG5cbiAgICAgIGxldCB2YWx1ZXNZYW1sID0gZnMucmVhZEZpbGVTeW5jKHBhdGguam9pbihfX2Rpcm5hbWUsIGAuL21hbmlmZXN0cy9leHRlcm5hbC1kbnMueWFtbGApKTtcbiAgICAgIC8vIFJlcGxhY2UgRG9tYWluIGFuZCBsb2FkIFlBTUxcbiAgICAgIGxldCB2YWx1ZXNQYXJzZWQgPSB5YW1sLmxvYWRBbGwodmFsdWVzWWFtbC50b1N0cmluZygpXG4gICAgICAgIC5yZXBsYWNlKG5ldyBSZWdFeHAoJ3tET01BSU5fRklMVEVSfScsICdnaScpLCB0aGlzLmNvbmZpZy5kb21haW5GaWx0ZXIpXG4gICAgICAgIC5yZXBsYWNlKG5ldyBSZWdFeHAoJ3tPV05FUl9JRH0nLCAnZ2knKSwgYGNkay0ke3RpbWVOb3d9YClcbiAgICAgICAgKTtcbiAgICAgIGlmICh0eXBlb2YgdmFsdWVzUGFyc2VkID09PSAnb2JqZWN0JyAmJiB2YWx1ZXNQYXJzZWQgIT09IG51bGwpIHtcbiAgICAgICAgZGF0YVJlc3VsdCA9IHZhbHVlc1BhcnNlZCBhcyBSZWNvcmQ8c3RyaW5nLCBvYmplY3Q+W107XG4gICAgICB9XG4gICAgfSBjYXRjaCAoZXhjZXB0aW9uKSB7XG4gICAgICAvLyBwYXNzXG4gICAgICBjb25zb2xlLmVycm9yKFwiID4gRmFpbGVkIHRvIGxvYWQgJ2V4dGVybmFsLWRucy55YW1sJyBmb3IgJ2V4dGVybmFsLWRucycgZGVwbG95Li4uXCIpO1xuICAgICAgY29uc29sZS5lcnJvcihleGNlcHRpb24pO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIENyZWF0ZSBLdWJlcm5ldGVzIFNlcnZpY2VBY2NvdW50XG4gICAgbGV0IHN2Y0FjY291bnQgPSBjbHVzdGVyLmFkZFNlcnZpY2VBY2NvdW50KCdleHRlcm5hbC1kbnMnLCB7XG4gICAgICBuYW1lOiAnZXh0ZXJuYWwtZG5zJyxcbiAgICAgIG5hbWVzcGFjZTogJ2t1YmUtc3lzdGVtJyxcbiAgICB9KTtcblxuICAgIGNvbnN0IGlhbVBvbGljeURvY3VtZW50ID0gSlNPTi5wYXJzZShge1xuICAgICAgXCJWZXJzaW9uXCI6IFwiMjAxMi0xMC0xN1wiLFxuICAgICAgXCJTdGF0ZW1lbnRcIjogW1xuICAgICAgICB7XG4gICAgICAgICAgXCJFZmZlY3RcIjogXCJBbGxvd1wiLFxuICAgICAgICAgIFwiQWN0aW9uXCI6IFtcbiAgICAgICAgICAgIFwicm91dGU1MzpDaGFuZ2VSZXNvdXJjZVJlY29yZFNldHNcIlxuICAgICAgICAgIF0sXG4gICAgICAgICAgXCJSZXNvdXJjZVwiOiBbXG4gICAgICAgICAgICBcImFybjphd3M6cm91dGU1Mzo6Omhvc3RlZHpvbmUvKlwiXG4gICAgICAgICAgXVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgXCJFZmZlY3RcIjogXCJBbGxvd1wiLFxuICAgICAgICAgIFwiQWN0aW9uXCI6IFtcbiAgICAgICAgICAgIFwicm91dGU1MzpMaXN0SG9zdGVkWm9uZXNcIixcbiAgICAgICAgICAgIFwicm91dGU1MzpMaXN0UmVzb3VyY2VSZWNvcmRTZXRzXCJcbiAgICAgICAgICBdLFxuICAgICAgICAgIFwiUmVzb3VyY2VcIjogW1xuICAgICAgICAgICAgXCIqXCJcbiAgICAgICAgICBdXG4gICAgICAgIH1cbiAgICAgIF1cbiAgICB9YClcblxuICAgIC8vIENyZWF0ZSBJQU0gUG9saWN5XG4gICAgY29uc3QgaWFtUG9saWN5ID0gbmV3IFBvbGljeSh0aGlzLCAnQWxsb3dFeHRlcm5hbEROU1VwZGF0ZXNJQU1Qb2xpY3knLCB7XG4gICAgICBwb2xpY3lOYW1lOiAnQWxsb3dFeHRlcm5hbEROU1VwZGF0ZXNJQU1Qb2xpY3knLFxuICAgICAgZG9jdW1lbnQ6IFBvbGljeURvY3VtZW50LmZyb21Kc29uKGlhbVBvbGljeURvY3VtZW50KSxcbiAgICB9KVxuXG4gICAgLy8gQXR0YWNoIElBTSByb2xlXG4gICAgc3ZjQWNjb3VudC5yb2xlLmF0dGFjaElubGluZVBvbGljeShpYW1Qb2xpY3kpO1xuXG4gICAgbGV0IGJvZGllczogQ29uc3RydWN0W10gPSBbXTtcblxuICAgIC8vIEluc3RhbGwgRXh0ZXJuYWwgRE5TXG4gICAgZGF0YVJlc3VsdC5mb3JFYWNoKGZ1bmN0aW9uICh2YWwsIGlkeCkge1xuICAgICAgYm9kaWVzLnB1c2goY2x1c3Rlci5hZGRNYW5pZmVzdCgnZXh0ZXJuYWwtZG5zLScgKyBpZHgsIHZhbCkpO1xuICAgIH0pO1xuXG4gICAgdGhpcy5ib2RpZXMgPSBib2RpZXM7XG59XG5cbn0iXX0=
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
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
    if (mod != null) for (var k in mod) if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZXJuYWwtZG5zLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZXh0ZXJuYWwtZG5zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSw2Q0FBMkQ7QUFFM0QsaURBQWtIO0FBRWxILHVDQUF5QjtBQUV6Qiw4Q0FBZ0M7QUFHaEMsTUFBYSxpQkFBa0IsU0FBUSx5QkFBVztJQUtoRCxZQUFZLEtBQWdCLEVBQUUsRUFBVSxFQUFFLFVBQW1CLEVBQUUsaUJBQW9DLEVBQUUsS0FBa0I7UUFDckgsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsQ0FBQztRQUVqQixJQUFJLENBQUMsTUFBTSxHQUFHLGlCQUFpQixDQUFDO1FBRWhDLHVCQUF1QjtRQUN2QixJQUFJLENBQUMsY0FBYyxDQUFDLFVBQVUsQ0FBQyxDQUFBO0lBRWpDLENBQUM7SUFFRCxhQUFhO1FBQ1gsaUdBQWlHO1FBQ2pHLE1BQU0sZUFBZSxHQUFHLElBQUkseUJBQWUsQ0FBQztZQUMxQyxHQUFHLEVBQUUseUJBQXlCO1lBQzlCLE9BQU8sRUFBRTtnQkFDUCxrQ0FBa0M7YUFDbkM7WUFDRCxNQUFNLEVBQUUsZ0JBQU0sQ0FBQyxLQUFLO1lBQ3BCLFNBQVMsRUFBRSxDQUFDLGdDQUFnQyxDQUFDO1NBQzlDLENBQUMsQ0FBQTtRQUVGLE1BQU0sZ0JBQWdCLEdBQUcsSUFBSSx5QkFBZSxDQUFDO1lBQzNDLEdBQUcsRUFBRSwwQkFBMEI7WUFDL0IsT0FBTyxFQUFFO2dCQUNQLHlCQUF5QjtnQkFDekIsZ0NBQWdDO2FBQ2pDO1lBQ0QsTUFBTSxFQUFFLGdCQUFNLENBQUMsS0FBSztZQUNwQixTQUFTLEVBQUUsQ0FBQyxHQUFHLENBQUM7U0FDakIsQ0FBQyxDQUFBO1FBRUYsTUFBTSxjQUFjLEdBQUcsSUFBSSx3QkFBYyxDQUFDO1lBQ3hDLFVBQVUsRUFBRSxDQUFDLGVBQWUsRUFBRSxnQkFBZ0IsQ0FBQztTQUNoRCxDQUFDLENBQUM7UUFFSCxNQUFNLGVBQWUsR0FBRyxJQUFJLGNBQUksQ0FBQyxJQUFJLEVBQUUsaUJBQWlCLEVBQUU7WUFDeEQsUUFBUSxFQUFFLEdBQUcsaUJBQUcsQ0FBQyxVQUFVLGtCQUFrQjtZQUM3QyxXQUFXLEVBQUUseUNBQXlDO1lBQ3RELFNBQVMsRUFBRSxJQUFJLDhCQUFvQixFQUFFO1lBQ3JDLGNBQWMsRUFBRTtnQkFDZCxtQkFBbUIsRUFBRSxjQUFjO2FBQ3BDO1NBQ0YsQ0FBQyxDQUFBO1FBRUYsT0FBTyxlQUFlLENBQUE7SUFDeEIsQ0FBQztJQUVELGNBQWMsQ0FBQyxPQUFnQjtRQUU3QixtQkFBbUI7UUFDbkIsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLEdBQUcsRUFBRSxHQUFHLElBQUksQ0FBQztRQUVsQyxPQUFPO1FBQ1AsSUFBSSxVQUFVLEdBQTZCLEVBQUUsQ0FBQztRQUU5QyxJQUFJO1lBR0YsTUFBTSxJQUFJLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBRTdCLElBQUksVUFBVSxHQUFHLEVBQUUsQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsK0JBQStCLENBQUMsQ0FBQyxDQUFDO1lBQ3hGLCtCQUErQjtZQUMvQixJQUFJLFlBQVksR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxRQUFRLEVBQUU7aUJBQ2xELE9BQU8sQ0FBQyxJQUFJLE1BQU0sQ0FBQyxpQkFBaUIsRUFBRSxJQUFJLENBQUMsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLFlBQVksQ0FBQztpQkFDdEUsT0FBTyxDQUFDLElBQUksTUFBTSxDQUFDLFlBQVksRUFBRSxJQUFJLENBQUMsRUFBRSxPQUFPLE9BQU8sRUFBRSxDQUFDLENBQ3pELENBQUM7WUFDSixJQUFJLE9BQU8sWUFBWSxLQUFLLFFBQVEsSUFBSSxZQUFZLEtBQUssSUFBSSxFQUFFO2dCQUM3RCxVQUFVLEdBQUcsWUFBd0MsQ0FBQzthQUN2RDtTQUNGO1FBQUMsT0FBTyxTQUFTLEVBQUU7WUFDbEIsT0FBTztZQUNQLE9BQU8sQ0FBQyxLQUFLLENBQUMsb0VBQW9FLENBQUMsQ0FBQztZQUNwRixPQUFPLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDO1lBQ3pCLE9BQU87U0FDUjtRQUVELG1DQUFtQztRQUNuQyxJQUFJLFVBQVUsR0FBRyxPQUFPLENBQUMsaUJBQWlCLENBQUMsY0FBYyxFQUFFO1lBQ3pELElBQUksRUFBRSxjQUFjO1lBQ3BCLFNBQVMsRUFBRSxhQUFhO1NBQ3pCLENBQUMsQ0FBQztRQUVILE1BQU0saUJBQWlCLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7TUF1Qm5DLENBQUMsQ0FBQTtRQUVILG9CQUFvQjtRQUNwQixNQUFNLFNBQVMsR0FBRyxJQUFJLGdCQUFNLENBQUMsSUFBSSxFQUFFLGtDQUFrQyxFQUFFO1lBQ3JFLFVBQVUsRUFBRSxrQ0FBa0M7WUFDOUMsUUFBUSxFQUFFLHdCQUFjLENBQUMsUUFBUSxDQUFDLGlCQUFpQixDQUFDO1NBQ3JELENBQUMsQ0FBQTtRQUVGLGtCQUFrQjtRQUNsQixVQUFVLENBQUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBRTlDLElBQUksTUFBTSxHQUFnQixFQUFFLENBQUM7UUFFN0IsdUJBQXVCO1FBQ3ZCLFVBQVUsQ0FBQyxPQUFPLENBQUMsVUFBVSxHQUFHLEVBQUUsR0FBRztZQUNuQyxNQUFNLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsZUFBZSxHQUFHLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDO1FBQy9ELENBQUMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLE1BQU0sR0FBRyxNQUFNLENBQUM7SUFDekIsQ0FBQztDQUVBO0FBbklELDhDQW1JQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IEF3cywgTmVzdGVkU3RhY2ssIFN0YWNrUHJvcHMgfSBmcm9tICdhd3MtY2RrLWxpYic7XG5pbXBvcnQgeyBDbHVzdGVyIH0gZnJvbSAnYXdzLWNkay1saWIvYXdzLWVrcyc7XG5pbXBvcnQgeyBBY2NvdW50Um9vdFByaW5jaXBhbCwgRWZmZWN0LCBQb2xpY3ksIFBvbGljeURvY3VtZW50LCBQb2xpY3lTdGF0ZW1lbnQsIFJvbGUgfSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtaWFtJztcbmltcG9ydCB7IENvbnN0cnVjdCB9IGZyb20gXCJjb25zdHJ1Y3RzXCI7XG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcyc7XG5cbmltcG9ydCAqIGFzIHlhbWwgZnJvbSAnanMteWFtbCc7XG5pbXBvcnQgeyBFeHRlcm5hbEROU0NvbmZpZyB9IGZyb20gJy4uLy4uL2ludGVyZmFjZXMvbGliL2Vrcy9pbnRlcmZhY2VzJztcblxuZXhwb3J0IGNsYXNzIEV4dGVybmFsRE5TTmVzdGVkIGV4dGVuZHMgTmVzdGVkU3RhY2sge1xuICBib2R5OiBDb25zdHJ1Y3Q7XG4gIGJvZGllczogQ29uc3RydWN0W107XG4gIGNvbmZpZzogRXh0ZXJuYWxETlNDb25maWc7XG5cbiAgY29uc3RydWN0b3Ioc2NvcGU6IENvbnN0cnVjdCwgaWQ6IHN0cmluZywgZWtzQ2x1c3RlcjogQ2x1c3RlciwgZXh0ZXJuYWxETlNDb25maWc6IEV4dGVybmFsRE5TQ29uZmlnLCBwcm9wcz86IFN0YWNrUHJvcHMpIHtcbiAgICBzdXBlcihzY29wZSwgaWQpO1xuXG4gICAgdGhpcy5jb25maWcgPSBleHRlcm5hbEROU0NvbmZpZztcblxuICAgIC8vIHRoaXMuY3JlYXRlRE5TUm9sZSgpXG4gICAgdGhpcy5kZXBsb3lNYW5pZmVzdChla3NDbHVzdGVyKVxuXG4gIH1cblxuICBjcmVhdGVETlNSb2xlKCk6IFJvbGUge1xuICAgIC8vIFdoZW4gdGhpcyBpcyBwYXNzZWQgYXMgcm9sZSwgRUtTIGNsdXN0ZXIgc3VjY2Vzc2Z1bGx5IGNyZWF0ZWQoSSB0aGluayB0aGVyZSBpcyBhIGJ1ZyBpbiBDREspLiBcbiAgICBjb25zdCBwb2xpY3lTdGF0ZW1lbnQgPSBuZXcgUG9saWN5U3RhdGVtZW50KHtcbiAgICAgIHNpZDogXCJBbGxvd0V4dGVybmFsRE5TVXBkYXRlc1wiLFxuICAgICAgYWN0aW9uczogW1xuICAgICAgICBcInJvdXRlNTM6Q2hhbmdlUmVzb3VyY2VSZWNvcmRTZXRzXCIsXG4gICAgICBdLFxuICAgICAgZWZmZWN0OiBFZmZlY3QuQUxMT1csXG4gICAgICByZXNvdXJjZXM6IFtcImFybjphd3M6cm91dGU1Mzo6Omhvc3RlZHpvbmUvKlwiXVxuICAgIH0pXG5cbiAgICBjb25zdCBwb2xpY3lTdGF0ZW1lbnQyID0gbmV3IFBvbGljeVN0YXRlbWVudCh7XG4gICAgICBzaWQ6IFwiQWxsb3dFeHRlcm5hbEROU1VwZGF0ZXMyXCIsXG4gICAgICBhY3Rpb25zOiBbXG4gICAgICAgIFwicm91dGU1MzpMaXN0SG9zdGVkWm9uZXNcIixcbiAgICAgICAgXCJyb3V0ZTUzOkxpc3RSZXNvdXJjZVJlY29yZFNldHNcIlxuICAgICAgXSxcbiAgICAgIGVmZmVjdDogRWZmZWN0LkFMTE9XLFxuICAgICAgcmVzb3VyY2VzOiBbXCIqXCJdXG4gICAgfSlcblxuICAgIGNvbnN0IHBvbGljeURvY3VtZW50ID0gbmV3IFBvbGljeURvY3VtZW50KHtcbiAgICAgIHN0YXRlbWVudHM6IFtwb2xpY3lTdGF0ZW1lbnQsIHBvbGljeVN0YXRlbWVudDJdLFxuICAgIH0pO1xuXG4gICAgY29uc3QgZXh0ZXJuYWxETlNSb2xlID0gbmV3IFJvbGUodGhpcywgYEV4dGVybmFsRE5TUm9sZWAsIHtcbiAgICAgIHJvbGVOYW1lOiBgJHtBd3MuU1RBQ0tfTkFNRX0tRXh0ZXJuYWxETlNSb2xlYCxcbiAgICAgIGRlc2NyaXB0aW9uOiBgUm9sZSBmb3IgZXh0ZXJuYWwgZG5zIHRvIGNyZWF0ZSBlbnRyaWVzYCxcbiAgICAgIGFzc3VtZWRCeTogbmV3IEFjY291bnRSb290UHJpbmNpcGFsKCksXG4gICAgICBpbmxpbmVQb2xpY2llczoge1xuICAgICAgICAnRXh0ZXJuYWxETlNQb2xpY3knOiBwb2xpY3lEb2N1bWVudFxuICAgICAgfVxuICAgIH0pXG5cbiAgICByZXR1cm4gZXh0ZXJuYWxETlNSb2xlXG4gIH1cblxuICBkZXBsb3lNYW5pZmVzdChjbHVzdGVyOiBDbHVzdGVyKSB7XG5cbiAgICAvLyBnZXQgY3VycmVudCB0aW1lXG4gICAgY29uc3QgdGltZU5vdyA9IERhdGUubm93KCkgLyAxMDAwO1xuXG4gICAgLy8geWFtbFxuICAgIGxldCBkYXRhUmVzdWx0OiBSZWNvcmQ8c3RyaW5nLCBvYmplY3Q+W10gPSBbXTtcblxuICAgIHRyeSB7XG5cblxuICAgICAgY29uc3QgcGF0aCA9IHJlcXVpcmUoJ3BhdGgnKTtcblxuICAgICAgbGV0IHZhbHVlc1lhbWwgPSBmcy5yZWFkRmlsZVN5bmMocGF0aC5qb2luKF9fZGlybmFtZSwgYC4vbWFuaWZlc3RzL2V4dGVybmFsLWRucy55YW1sYCkpO1xuICAgICAgLy8gUmVwbGFjZSBEb21haW4gYW5kIGxvYWQgWUFNTFxuICAgICAgbGV0IHZhbHVlc1BhcnNlZCA9IHlhbWwubG9hZEFsbCh2YWx1ZXNZYW1sLnRvU3RyaW5nKClcbiAgICAgICAgLnJlcGxhY2UobmV3IFJlZ0V4cCgne0RPTUFJTl9GSUxURVJ9JywgJ2dpJyksIHRoaXMuY29uZmlnLmRvbWFpbkZpbHRlcilcbiAgICAgICAgLnJlcGxhY2UobmV3IFJlZ0V4cCgne09XTkVSX0lEfScsICdnaScpLCBgY2RrLSR7dGltZU5vd31gKVxuICAgICAgICApO1xuICAgICAgaWYgKHR5cGVvZiB2YWx1ZXNQYXJzZWQgPT09ICdvYmplY3QnICYmIHZhbHVlc1BhcnNlZCAhPT0gbnVsbCkge1xuICAgICAgICBkYXRhUmVzdWx0ID0gdmFsdWVzUGFyc2VkIGFzIFJlY29yZDxzdHJpbmcsIG9iamVjdD5bXTtcbiAgICAgIH1cbiAgICB9IGNhdGNoIChleGNlcHRpb24pIHtcbiAgICAgIC8vIHBhc3NcbiAgICAgIGNvbnNvbGUuZXJyb3IoXCIgPiBGYWlsZWQgdG8gbG9hZCAnZXh0ZXJuYWwtZG5zLnlhbWwnIGZvciAnZXh0ZXJuYWwtZG5zJyBkZXBsb3kuLi5cIik7XG4gICAgICBjb25zb2xlLmVycm9yKGV4Y2VwdGlvbik7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy8gQ3JlYXRlIEt1YmVybmV0ZXMgU2VydmljZUFjY291bnRcbiAgICBsZXQgc3ZjQWNjb3VudCA9IGNsdXN0ZXIuYWRkU2VydmljZUFjY291bnQoJ2V4dGVybmFsLWRucycsIHtcbiAgICAgIG5hbWU6ICdleHRlcm5hbC1kbnMnLFxuICAgICAgbmFtZXNwYWNlOiAna3ViZS1zeXN0ZW0nLFxuICAgIH0pO1xuXG4gICAgY29uc3QgaWFtUG9saWN5RG9jdW1lbnQgPSBKU09OLnBhcnNlKGB7XG4gICAgICBcIlZlcnNpb25cIjogXCIyMDEyLTEwLTE3XCIsXG4gICAgICBcIlN0YXRlbWVudFwiOiBbXG4gICAgICAgIHtcbiAgICAgICAgICBcIkVmZmVjdFwiOiBcIkFsbG93XCIsXG4gICAgICAgICAgXCJBY3Rpb25cIjogW1xuICAgICAgICAgICAgXCJyb3V0ZTUzOkNoYW5nZVJlc291cmNlUmVjb3JkU2V0c1wiXG4gICAgICAgICAgXSxcbiAgICAgICAgICBcIlJlc291cmNlXCI6IFtcbiAgICAgICAgICAgIFwiYXJuOmF3czpyb3V0ZTUzOjo6aG9zdGVkem9uZS8qXCJcbiAgICAgICAgICBdXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICBcIkVmZmVjdFwiOiBcIkFsbG93XCIsXG4gICAgICAgICAgXCJBY3Rpb25cIjogW1xuICAgICAgICAgICAgXCJyb3V0ZTUzOkxpc3RIb3N0ZWRab25lc1wiLFxuICAgICAgICAgICAgXCJyb3V0ZTUzOkxpc3RSZXNvdXJjZVJlY29yZFNldHNcIlxuICAgICAgICAgIF0sXG4gICAgICAgICAgXCJSZXNvdXJjZVwiOiBbXG4gICAgICAgICAgICBcIipcIlxuICAgICAgICAgIF1cbiAgICAgICAgfVxuICAgICAgXVxuICAgIH1gKVxuXG4gICAgLy8gQ3JlYXRlIElBTSBQb2xpY3lcbiAgICBjb25zdCBpYW1Qb2xpY3kgPSBuZXcgUG9saWN5KHRoaXMsICdBbGxvd0V4dGVybmFsRE5TVXBkYXRlc0lBTVBvbGljeScsIHtcbiAgICAgIHBvbGljeU5hbWU6ICdBbGxvd0V4dGVybmFsRE5TVXBkYXRlc0lBTVBvbGljeScsXG4gICAgICBkb2N1bWVudDogUG9saWN5RG9jdW1lbnQuZnJvbUpzb24oaWFtUG9saWN5RG9jdW1lbnQpLFxuICAgIH0pXG5cbiAgICAvLyBBdHRhY2ggSUFNIHJvbGVcbiAgICBzdmNBY2NvdW50LnJvbGUuYXR0YWNoSW5saW5lUG9saWN5KGlhbVBvbGljeSk7XG5cbiAgICBsZXQgYm9kaWVzOiBDb25zdHJ1Y3RbXSA9IFtdO1xuXG4gICAgLy8gSW5zdGFsbCBFeHRlcm5hbCBETlNcbiAgICBkYXRhUmVzdWx0LmZvckVhY2goZnVuY3Rpb24gKHZhbCwgaWR4KSB7XG4gICAgICBib2RpZXMucHVzaChjbHVzdGVyLmFkZE1hbmlmZXN0KCdleHRlcm5hbC1kbnMtJyArIGlkeCwgdmFsKSk7XG4gICAgfSk7XG5cbiAgICB0aGlzLmJvZGllcyA9IGJvZGllcztcbn1cblxufSJdfQ==
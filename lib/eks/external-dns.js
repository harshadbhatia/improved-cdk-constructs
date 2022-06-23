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
    constructor(scope, id, props) {
        super(scope, id, props);
        this.config = props;
        this.deployManifest();
    }
    deployManifest() {
        /**
         * The OWNER_ID here is very important. The Controller uses that to update any records.
         * If ever you find records are not being update that is because owner has changed from previous to this run.
         */
        // yaml
        let dataResult = [];
        try {
            const path = require('path');
            let valuesYaml = fs.readFileSync(path.join(__dirname, `./manifests/external-dns.yaml`));
            // Replace Domain and load YAML
            let valuesParsed = yaml.loadAll(valuesYaml.toString()
                .replace(new RegExp('{DOMAIN_FILTER}', 'gi'), this.config.domainFilter)
                .replace(new RegExp('{OWNER_ID}', 'gi'), this.config.clusterName));
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
        let svcAccount = this.config.eksCluster.addServiceAccount('external-dns', {
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
        dataResult.forEach((val, idx) => {
            bodies.push(this.config.eksCluster.addManifest('external-dns-' + idx, val));
        });
        this.bodies = bodies;
    }
}
exports.ExternalDNS = ExternalDNS;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZXJuYWwtZG5zLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZXh0ZXJuYWwtZG5zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsNkNBQTREO0FBRTVELGlEQUE2RDtBQUU3RCx1Q0FBeUI7QUFFekIsOENBQWdDO0FBUWhDLE1BQWEsV0FBWSxTQUFRLHlCQUFXO0lBSzFDLFlBQVksS0FBZ0IsRUFBRSxFQUFVLEVBQUUsS0FBd0I7UUFDaEUsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFFeEIsSUFBSSxDQUFDLE1BQU0sR0FBRyxLQUFNLENBQUM7UUFFckIsSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFBO0lBRXZCLENBQUM7SUFFRCxjQUFjO1FBQ1o7OztXQUdHO1FBRUgsT0FBTztRQUNQLElBQUksVUFBVSxHQUE2QixFQUFFLENBQUM7UUFFOUMsSUFBSTtZQUVGLE1BQU0sSUFBSSxHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUU3QixJQUFJLFVBQVUsR0FBRyxFQUFFLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLCtCQUErQixDQUFDLENBQUMsQ0FBQztZQUN4RiwrQkFBK0I7WUFDL0IsSUFBSSxZQUFZLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsUUFBUSxFQUFFO2lCQUNsRCxPQUFPLENBQUMsSUFBSSxNQUFNLENBQUMsaUJBQWlCLEVBQUUsSUFBSSxDQUFDLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxZQUFZLENBQUM7aUJBQ3RFLE9BQU8sQ0FBQyxJQUFJLE1BQU0sQ0FBQyxZQUFZLEVBQUUsSUFBSSxDQUFDLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FDbEUsQ0FBQztZQUNGLElBQUksT0FBTyxZQUFZLEtBQUssUUFBUSxJQUFJLFlBQVksS0FBSyxJQUFJLEVBQUU7Z0JBQzdELFVBQVUsR0FBRyxZQUF3QyxDQUFDO2FBQ3ZEO1NBQ0Y7UUFBQyxPQUFPLFNBQVMsRUFBRTtZQUNsQixPQUFPO1lBQ1AsT0FBTyxDQUFDLEtBQUssQ0FBQyxvRUFBb0UsQ0FBQyxDQUFDO1lBQ3BGLE9BQU8sQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLENBQUM7WUFDekIsT0FBTztTQUNSO1FBRUQsbUNBQW1DO1FBQ25DLElBQUksVUFBVSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLGlCQUFpQixDQUFDLGNBQWMsRUFBRTtZQUN4RSxJQUFJLEVBQUUsY0FBYztZQUNwQixTQUFTLEVBQUUsYUFBYTtTQUN6QixDQUFDLENBQUM7UUFFSCxNQUFNLGlCQUFpQixHQUFHLElBQUksQ0FBQyxLQUFLLENBQUM7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O01BdUJuQyxDQUFDLENBQUE7UUFFSCxvQkFBb0I7UUFDcEIsTUFBTSxTQUFTLEdBQUcsSUFBSSxnQkFBTSxDQUFDLElBQUksRUFBRSxrQ0FBa0MsRUFBRTtZQUNyRSxVQUFVLEVBQUUsa0NBQWtDO1lBQzlDLFFBQVEsRUFBRSx3QkFBYyxDQUFDLFFBQVEsQ0FBQyxpQkFBaUIsQ0FBQztTQUNyRCxDQUFDLENBQUE7UUFFRixrQkFBa0I7UUFDbEIsVUFBVSxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUU5QyxJQUFJLE1BQU0sR0FBZ0IsRUFBRSxDQUFDO1FBRTdCLHVCQUF1QjtRQUN2QixVQUFVLENBQUMsT0FBTyxDQUFDLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxFQUFFO1lBQzlCLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUMsV0FBVyxDQUFDLGVBQWUsR0FBRyxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQztRQUM5RSxDQUFDLENBQUMsQ0FBQTtRQUVGLElBQUksQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFDO0lBQ3ZCLENBQUM7Q0FFRjtBQTdGRCxrQ0E2RkMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBOZXN0ZWRTdGFjaywgTmVzdGVkU3RhY2tQcm9wcyB9IGZyb20gJ2F3cy1jZGstbGliJztcbmltcG9ydCB7IENsdXN0ZXIgfSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtZWtzJztcbmltcG9ydCB7IFBvbGljeSwgUG9saWN5RG9jdW1lbnQgfSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtaWFtJztcbmltcG9ydCB7IENvbnN0cnVjdCB9IGZyb20gXCJjb25zdHJ1Y3RzXCI7XG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcyc7XG5cbmltcG9ydCAqIGFzIHlhbWwgZnJvbSAnanMteWFtbCc7XG5cbmV4cG9ydCBpbnRlcmZhY2UgRXh0ZXJuYWxETlNQcm9wcyBleHRlbmRzIE5lc3RlZFN0YWNrUHJvcHMge1xuICBla3NDbHVzdGVyOiBDbHVzdGVyXG4gIGRvbWFpbkZpbHRlcjogc3RyaW5nO1xuICBjbHVzdGVyTmFtZTogc3RyaW5nXG59XG5cbmV4cG9ydCBjbGFzcyBFeHRlcm5hbEROUyBleHRlbmRzIE5lc3RlZFN0YWNrIHtcbiAgYm9keTogQ29uc3RydWN0O1xuICBib2RpZXM6IENvbnN0cnVjdFtdO1xuICBjb25maWc6IEV4dGVybmFsRE5TUHJvcHM7XG5cbiAgY29uc3RydWN0b3Ioc2NvcGU6IENvbnN0cnVjdCwgaWQ6IHN0cmluZywgcHJvcHM/OiBFeHRlcm5hbEROU1Byb3BzKSB7XG4gICAgc3VwZXIoc2NvcGUsIGlkLCBwcm9wcyk7XG5cbiAgICB0aGlzLmNvbmZpZyA9IHByb3BzITtcblxuICAgIHRoaXMuZGVwbG95TWFuaWZlc3QoKVxuXG4gIH1cblxuICBkZXBsb3lNYW5pZmVzdCgpIHtcbiAgICAvKipcbiAgICAgKiBUaGUgT1dORVJfSUQgaGVyZSBpcyB2ZXJ5IGltcG9ydGFudC4gVGhlIENvbnRyb2xsZXIgdXNlcyB0aGF0IHRvIHVwZGF0ZSBhbnkgcmVjb3Jkcy5cbiAgICAgKiBJZiBldmVyIHlvdSBmaW5kIHJlY29yZHMgYXJlIG5vdCBiZWluZyB1cGRhdGUgdGhhdCBpcyBiZWNhdXNlIG93bmVyIGhhcyBjaGFuZ2VkIGZyb20gcHJldmlvdXMgdG8gdGhpcyBydW4uXG4gICAgICovXG5cbiAgICAvLyB5YW1sXG4gICAgbGV0IGRhdGFSZXN1bHQ6IFJlY29yZDxzdHJpbmcsIG9iamVjdD5bXSA9IFtdO1xuXG4gICAgdHJ5IHtcblxuICAgICAgY29uc3QgcGF0aCA9IHJlcXVpcmUoJ3BhdGgnKTtcblxuICAgICAgbGV0IHZhbHVlc1lhbWwgPSBmcy5yZWFkRmlsZVN5bmMocGF0aC5qb2luKF9fZGlybmFtZSwgYC4vbWFuaWZlc3RzL2V4dGVybmFsLWRucy55YW1sYCkpO1xuICAgICAgLy8gUmVwbGFjZSBEb21haW4gYW5kIGxvYWQgWUFNTFxuICAgICAgbGV0IHZhbHVlc1BhcnNlZCA9IHlhbWwubG9hZEFsbCh2YWx1ZXNZYW1sLnRvU3RyaW5nKClcbiAgICAgICAgLnJlcGxhY2UobmV3IFJlZ0V4cCgne0RPTUFJTl9GSUxURVJ9JywgJ2dpJyksIHRoaXMuY29uZmlnLmRvbWFpbkZpbHRlcilcbiAgICAgICAgLnJlcGxhY2UobmV3IFJlZ0V4cCgne09XTkVSX0lEfScsICdnaScpLCB0aGlzLmNvbmZpZy5jbHVzdGVyTmFtZSlcbiAgICAgICk7XG4gICAgICBpZiAodHlwZW9mIHZhbHVlc1BhcnNlZCA9PT0gJ29iamVjdCcgJiYgdmFsdWVzUGFyc2VkICE9PSBudWxsKSB7XG4gICAgICAgIGRhdGFSZXN1bHQgPSB2YWx1ZXNQYXJzZWQgYXMgUmVjb3JkPHN0cmluZywgb2JqZWN0PltdO1xuICAgICAgfVxuICAgIH0gY2F0Y2ggKGV4Y2VwdGlvbikge1xuICAgICAgLy8gcGFzc1xuICAgICAgY29uc29sZS5lcnJvcihcIiA+IEZhaWxlZCB0byBsb2FkICdleHRlcm5hbC1kbnMueWFtbCcgZm9yICdleHRlcm5hbC1kbnMnIGRlcGxveS4uLlwiKTtcbiAgICAgIGNvbnNvbGUuZXJyb3IoZXhjZXB0aW9uKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICAvLyBDcmVhdGUgS3ViZXJuZXRlcyBTZXJ2aWNlQWNjb3VudFxuICAgIGxldCBzdmNBY2NvdW50ID0gdGhpcy5jb25maWcuZWtzQ2x1c3Rlci5hZGRTZXJ2aWNlQWNjb3VudCgnZXh0ZXJuYWwtZG5zJywge1xuICAgICAgbmFtZTogJ2V4dGVybmFsLWRucycsXG4gICAgICBuYW1lc3BhY2U6ICdrdWJlLXN5c3RlbScsXG4gICAgfSk7XG5cbiAgICBjb25zdCBpYW1Qb2xpY3lEb2N1bWVudCA9IEpTT04ucGFyc2UoYHtcbiAgICAgIFwiVmVyc2lvblwiOiBcIjIwMTItMTAtMTdcIixcbiAgICAgIFwiU3RhdGVtZW50XCI6IFtcbiAgICAgICAge1xuICAgICAgICAgIFwiRWZmZWN0XCI6IFwiQWxsb3dcIixcbiAgICAgICAgICBcIkFjdGlvblwiOiBbXG4gICAgICAgICAgICBcInJvdXRlNTM6Q2hhbmdlUmVzb3VyY2VSZWNvcmRTZXRzXCJcbiAgICAgICAgICBdLFxuICAgICAgICAgIFwiUmVzb3VyY2VcIjogW1xuICAgICAgICAgICAgXCJhcm46YXdzOnJvdXRlNTM6Ojpob3N0ZWR6b25lLypcIlxuICAgICAgICAgIF1cbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgIFwiRWZmZWN0XCI6IFwiQWxsb3dcIixcbiAgICAgICAgICBcIkFjdGlvblwiOiBbXG4gICAgICAgICAgICBcInJvdXRlNTM6TGlzdEhvc3RlZFpvbmVzXCIsXG4gICAgICAgICAgICBcInJvdXRlNTM6TGlzdFJlc291cmNlUmVjb3JkU2V0c1wiXG4gICAgICAgICAgXSxcbiAgICAgICAgICBcIlJlc291cmNlXCI6IFtcbiAgICAgICAgICAgIFwiKlwiXG4gICAgICAgICAgXVxuICAgICAgICB9XG4gICAgICBdXG4gICAgfWApXG5cbiAgICAvLyBDcmVhdGUgSUFNIFBvbGljeVxuICAgIGNvbnN0IGlhbVBvbGljeSA9IG5ldyBQb2xpY3kodGhpcywgJ0FsbG93RXh0ZXJuYWxETlNVcGRhdGVzSUFNUG9saWN5Jywge1xuICAgICAgcG9saWN5TmFtZTogJ0FsbG93RXh0ZXJuYWxETlNVcGRhdGVzSUFNUG9saWN5JyxcbiAgICAgIGRvY3VtZW50OiBQb2xpY3lEb2N1bWVudC5mcm9tSnNvbihpYW1Qb2xpY3lEb2N1bWVudCksXG4gICAgfSlcblxuICAgIC8vIEF0dGFjaCBJQU0gcm9sZVxuICAgIHN2Y0FjY291bnQucm9sZS5hdHRhY2hJbmxpbmVQb2xpY3koaWFtUG9saWN5KTtcblxuICAgIGxldCBib2RpZXM6IENvbnN0cnVjdFtdID0gW107XG5cbiAgICAvLyBJbnN0YWxsIEV4dGVybmFsIEROU1xuICAgIGRhdGFSZXN1bHQuZm9yRWFjaCgodmFsLCBpZHgpID0+IHtcbiAgICAgIGJvZGllcy5wdXNoKHRoaXMuY29uZmlnLmVrc0NsdXN0ZXIuYWRkTWFuaWZlc3QoJ2V4dGVybmFsLWRucy0nICsgaWR4LCB2YWwpKTtcbiAgICB9KVxuXG4gICAgdGhpcy5ib2RpZXMgPSBib2RpZXM7XG4gIH1cblxufSJdfQ==
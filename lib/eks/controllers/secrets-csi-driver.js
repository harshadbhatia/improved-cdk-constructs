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
exports.AwsSecretsCSIDriverNested = void 0;
const aws_cdk_lib_1 = require("aws-cdk-lib");
const fs = __importStar(require("fs"));
const yaml = __importStar(require("js-yaml"));
class AwsSecretsCSIDriverNested extends aws_cdk_lib_1.NestedStack {
    constructor(scope, id, cluster) {
        super(scope, id);
        // Install Secrets Store CSI Driver
        // https://docs.aws.amazon.com/eks/latest/userguide/add-ons-images.html
        cluster.addHelmChart('secrets-store-csi-driver', {
            release: 'secrets-store-csi-driver',
            repository: 'https://kubernetes-sigs.github.io/secrets-store-csi-driver/charts/',
            chart: 'secrets-store-csi-driver',
            namespace: 'kube-system',
            version: '1.0.1',
            values: {
                'syncSecret': {
                    'enabled': true,
                }
            }
        });
        // Once the chart is installed - We need to install the provider
        let dataResult = [];
        try {
            const path = require('path');
            let valuesYaml = fs.readFileSync(path.join(__dirname, `../manifests/secret-store-aws-provider.yaml`));
            // Replace Domain and load YAML
            let valuesParsed = yaml.loadAll(valuesYaml.toString());
            if (typeof valuesParsed === 'object' && valuesParsed !== null) {
                dataResult = valuesParsed;
            }
        }
        catch (exception) {
            // pass
            console.error(" > Failed to load 'Secrets Store AWS Provider'  deploy...");
            console.error(exception);
        }
        // Install manifest by iterating over all charts
        dataResult.forEach((val, idx) => {
            cluster.addManifest('secret-store-aws-provider' + idx, val);
        });
    }
}
exports.AwsSecretsCSIDriverNested = AwsSecretsCSIDriverNested;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VjcmV0cy1jc2ktZHJpdmVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsic2VjcmV0cy1jc2ktZHJpdmVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsNkNBQTBDO0FBSTFDLHVDQUF5QjtBQUN6Qiw4Q0FBZ0M7QUFFaEMsTUFBYSx5QkFBMEIsU0FBUSx5QkFBVztJQUd0RCxZQUFZLEtBQWdCLEVBQUUsRUFBVSxFQUFFLE9BQWdCO1FBQ3RELEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFFakIsbUNBQW1DO1FBQ25DLHVFQUF1RTtRQUN2RSxPQUFPLENBQUMsWUFBWSxDQUFDLDBCQUEwQixFQUFFO1lBQzdDLE9BQU8sRUFBRSwwQkFBMEI7WUFDbkMsVUFBVSxFQUFFLG9FQUFvRTtZQUNoRixLQUFLLEVBQUUsMEJBQTBCO1lBQ2pDLFNBQVMsRUFBRSxhQUFhO1lBQ3hCLE9BQU8sRUFBRSxPQUFPO1lBQ2hCLE1BQU0sRUFBRTtnQkFDSixZQUFZLEVBQUU7b0JBQ1YsU0FBUyxFQUFFLElBQUk7aUJBQ2xCO2FBQ0o7U0FDSixDQUFDLENBQUE7UUFFRixnRUFBZ0U7UUFDaEUsSUFBSSxVQUFVLEdBQTZCLEVBQUUsQ0FBQztRQUM5QyxJQUFJO1lBQ0EsTUFBTSxJQUFJLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBRTdCLElBQUksVUFBVSxHQUFHLEVBQUUsQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsNkNBQTZDLENBQUMsQ0FBQyxDQUFDO1lBRXRHLCtCQUErQjtZQUMvQixJQUFJLFlBQVksR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDO1lBQ3ZELElBQUksT0FBTyxZQUFZLEtBQUssUUFBUSxJQUFJLFlBQVksS0FBSyxJQUFJLEVBQUU7Z0JBQzNELFVBQVUsR0FBRyxZQUF3QyxDQUFDO2FBQ3pEO1NBQ0o7UUFBQyxPQUFPLFNBQVMsRUFBRTtZQUNoQixPQUFPO1lBQ1AsT0FBTyxDQUFDLEtBQUssQ0FBQywyREFBMkQsQ0FBQyxDQUFDO1lBQzNFLE9BQU8sQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLENBQUM7U0FDNUI7UUFFRCxnREFBZ0Q7UUFDaEQsVUFBVSxDQUFDLE9BQU8sQ0FBQyxDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsRUFBRTtZQUM1QixPQUFPLENBQUMsV0FBVyxDQUFDLDJCQUEyQixHQUFHLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQztRQUNoRSxDQUFDLENBQUMsQ0FBQztJQUVQLENBQUM7Q0FDSjtBQTdDRCw4REE2Q0MiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBOZXN0ZWRTdGFjayB9IGZyb20gJ2F3cy1jZGstbGliJztcbmltcG9ydCB7IENsdXN0ZXIgfSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtZWtzJztcbmltcG9ydCB7IENvbnN0cnVjdCB9IGZyb20gXCJjb25zdHJ1Y3RzXCI7XG5pbXBvcnQgaWFtID0gcmVxdWlyZSgnYXdzLWNkay1saWIvYXdzLWlhbScpO1xuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xuaW1wb3J0ICogYXMgeWFtbCBmcm9tICdqcy15YW1sJztcblxuZXhwb3J0IGNsYXNzIEF3c1NlY3JldHNDU0lEcml2ZXJOZXN0ZWQgZXh0ZW5kcyBOZXN0ZWRTdGFjayB7XG4gICAgYm9keTogQ29uc3RydWN0O1xuXG4gICAgY29uc3RydWN0b3Ioc2NvcGU6IENvbnN0cnVjdCwgaWQ6IHN0cmluZywgY2x1c3RlcjogQ2x1c3Rlcikge1xuICAgICAgICBzdXBlcihzY29wZSwgaWQpO1xuXG4gICAgICAgIC8vIEluc3RhbGwgU2VjcmV0cyBTdG9yZSBDU0kgRHJpdmVyXG4gICAgICAgIC8vIGh0dHBzOi8vZG9jcy5hd3MuYW1hem9uLmNvbS9la3MvbGF0ZXN0L3VzZXJndWlkZS9hZGQtb25zLWltYWdlcy5odG1sXG4gICAgICAgIGNsdXN0ZXIuYWRkSGVsbUNoYXJ0KCdzZWNyZXRzLXN0b3JlLWNzaS1kcml2ZXInLCB7XG4gICAgICAgICAgICByZWxlYXNlOiAnc2VjcmV0cy1zdG9yZS1jc2ktZHJpdmVyJyxcbiAgICAgICAgICAgIHJlcG9zaXRvcnk6ICdodHRwczovL2t1YmVybmV0ZXMtc2lncy5naXRodWIuaW8vc2VjcmV0cy1zdG9yZS1jc2ktZHJpdmVyL2NoYXJ0cy8nLFxuICAgICAgICAgICAgY2hhcnQ6ICdzZWNyZXRzLXN0b3JlLWNzaS1kcml2ZXInLFxuICAgICAgICAgICAgbmFtZXNwYWNlOiAna3ViZS1zeXN0ZW0nLFxuICAgICAgICAgICAgdmVyc2lvbjogJzEuMC4xJyxcbiAgICAgICAgICAgIHZhbHVlczoge1xuICAgICAgICAgICAgICAgICdzeW5jU2VjcmV0Jzoge1xuICAgICAgICAgICAgICAgICAgICAnZW5hYmxlZCc6IHRydWUsXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KVxuXG4gICAgICAgIC8vIE9uY2UgdGhlIGNoYXJ0IGlzIGluc3RhbGxlZCAtIFdlIG5lZWQgdG8gaW5zdGFsbCB0aGUgcHJvdmlkZXJcbiAgICAgICAgbGV0IGRhdGFSZXN1bHQ6IFJlY29yZDxzdHJpbmcsIG9iamVjdD5bXSA9IFtdO1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgcGF0aCA9IHJlcXVpcmUoJ3BhdGgnKTtcblxuICAgICAgICAgICAgbGV0IHZhbHVlc1lhbWwgPSBmcy5yZWFkRmlsZVN5bmMocGF0aC5qb2luKF9fZGlybmFtZSwgYC4uL21hbmlmZXN0cy9zZWNyZXQtc3RvcmUtYXdzLXByb3ZpZGVyLnlhbWxgKSk7XG5cbiAgICAgICAgICAgIC8vIFJlcGxhY2UgRG9tYWluIGFuZCBsb2FkIFlBTUxcbiAgICAgICAgICAgIGxldCB2YWx1ZXNQYXJzZWQgPSB5YW1sLmxvYWRBbGwodmFsdWVzWWFtbC50b1N0cmluZygpKTtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgdmFsdWVzUGFyc2VkID09PSAnb2JqZWN0JyAmJiB2YWx1ZXNQYXJzZWQgIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICBkYXRhUmVzdWx0ID0gdmFsdWVzUGFyc2VkIGFzIFJlY29yZDxzdHJpbmcsIG9iamVjdD5bXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBjYXRjaCAoZXhjZXB0aW9uKSB7XG4gICAgICAgICAgICAvLyBwYXNzXG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKFwiID4gRmFpbGVkIHRvIGxvYWQgJ1NlY3JldHMgU3RvcmUgQVdTIFByb3ZpZGVyJyAgZGVwbG95Li4uXCIpO1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcihleGNlcHRpb24pO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gSW5zdGFsbCBtYW5pZmVzdCBieSBpdGVyYXRpbmcgb3ZlciBhbGwgY2hhcnRzXG4gICAgICAgIGRhdGFSZXN1bHQuZm9yRWFjaCgodmFsLCBpZHgpID0+IHtcbiAgICAgICAgICAgIGNsdXN0ZXIuYWRkTWFuaWZlc3QoJ3NlY3JldC1zdG9yZS1hd3MtcHJvdmlkZXInICsgaWR4LCB2YWwpO1xuICAgICAgICB9KTtcblxuICAgIH1cbn0iXX0=
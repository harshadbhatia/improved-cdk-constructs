"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AwsSecretsCSIDriverNested = void 0;
const aws_cdk_lib_1 = require("aws-cdk-lib");
const fs = require("fs");
const yaml = require("js-yaml");
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VjcmV0cy1jc2ktZHJpdmVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsic2VjcmV0cy1jc2ktZHJpdmVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLDZDQUEwQztBQUkxQyx5QkFBeUI7QUFDekIsZ0NBQWdDO0FBRWhDLE1BQWEseUJBQTBCLFNBQVEseUJBQVc7SUFHdEQsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxPQUFnQjtRQUN0RCxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBRWpCLG1DQUFtQztRQUNuQyx1RUFBdUU7UUFDdkUsT0FBTyxDQUFDLFlBQVksQ0FBQywwQkFBMEIsRUFBRTtZQUM3QyxPQUFPLEVBQUUsMEJBQTBCO1lBQ25DLFVBQVUsRUFBRSxvRUFBb0U7WUFDaEYsS0FBSyxFQUFFLDBCQUEwQjtZQUNqQyxTQUFTLEVBQUUsYUFBYTtZQUN4QixPQUFPLEVBQUUsT0FBTztZQUNoQixNQUFNLEVBQUU7Z0JBQ0osWUFBWSxFQUFFO29CQUNWLFNBQVMsRUFBRSxJQUFJO2lCQUNsQjthQUNKO1NBQ0osQ0FBQyxDQUFBO1FBRUYsZ0VBQWdFO1FBQ2hFLElBQUksVUFBVSxHQUE2QixFQUFFLENBQUM7UUFDOUMsSUFBSTtZQUNBLE1BQU0sSUFBSSxHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUU3QixJQUFJLFVBQVUsR0FBRyxFQUFFLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLDZDQUE2QyxDQUFDLENBQUMsQ0FBQztZQUV0RywrQkFBK0I7WUFDL0IsSUFBSSxZQUFZLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQztZQUN2RCxJQUFJLE9BQU8sWUFBWSxLQUFLLFFBQVEsSUFBSSxZQUFZLEtBQUssSUFBSSxFQUFFO2dCQUMzRCxVQUFVLEdBQUcsWUFBd0MsQ0FBQzthQUN6RDtTQUNKO1FBQUMsT0FBTyxTQUFTLEVBQUU7WUFDaEIsT0FBTztZQUNQLE9BQU8sQ0FBQyxLQUFLLENBQUMsMkRBQTJELENBQUMsQ0FBQztZQUMzRSxPQUFPLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDO1NBQzVCO1FBRUQsZ0RBQWdEO1FBQ2hELFVBQVUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLEVBQUU7WUFDNUIsT0FBTyxDQUFDLFdBQVcsQ0FBQywyQkFBMkIsR0FBRyxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFDaEUsQ0FBQyxDQUFDLENBQUM7SUFFUCxDQUFDO0NBQ0o7QUE3Q0QsOERBNkNDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgTmVzdGVkU3RhY2sgfSBmcm9tICdhd3MtY2RrLWxpYic7XG5pbXBvcnQgeyBDbHVzdGVyIH0gZnJvbSAnYXdzLWNkay1saWIvYXdzLWVrcyc7XG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tIFwiY29uc3RydWN0c1wiO1xuaW1wb3J0IGlhbSA9IHJlcXVpcmUoJ2F3cy1jZGstbGliL2F3cy1pYW0nKTtcbmltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzJztcbmltcG9ydCAqIGFzIHlhbWwgZnJvbSAnanMteWFtbCc7XG5cbmV4cG9ydCBjbGFzcyBBd3NTZWNyZXRzQ1NJRHJpdmVyTmVzdGVkIGV4dGVuZHMgTmVzdGVkU3RhY2sge1xuICAgIGJvZHk6IENvbnN0cnVjdDtcblxuICAgIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcsIGNsdXN0ZXI6IENsdXN0ZXIpIHtcbiAgICAgICAgc3VwZXIoc2NvcGUsIGlkKTtcblxuICAgICAgICAvLyBJbnN0YWxsIFNlY3JldHMgU3RvcmUgQ1NJIERyaXZlclxuICAgICAgICAvLyBodHRwczovL2RvY3MuYXdzLmFtYXpvbi5jb20vZWtzL2xhdGVzdC91c2VyZ3VpZGUvYWRkLW9ucy1pbWFnZXMuaHRtbFxuICAgICAgICBjbHVzdGVyLmFkZEhlbG1DaGFydCgnc2VjcmV0cy1zdG9yZS1jc2ktZHJpdmVyJywge1xuICAgICAgICAgICAgcmVsZWFzZTogJ3NlY3JldHMtc3RvcmUtY3NpLWRyaXZlcicsXG4gICAgICAgICAgICByZXBvc2l0b3J5OiAnaHR0cHM6Ly9rdWJlcm5ldGVzLXNpZ3MuZ2l0aHViLmlvL3NlY3JldHMtc3RvcmUtY3NpLWRyaXZlci9jaGFydHMvJyxcbiAgICAgICAgICAgIGNoYXJ0OiAnc2VjcmV0cy1zdG9yZS1jc2ktZHJpdmVyJyxcbiAgICAgICAgICAgIG5hbWVzcGFjZTogJ2t1YmUtc3lzdGVtJyxcbiAgICAgICAgICAgIHZlcnNpb246ICcxLjAuMScsXG4gICAgICAgICAgICB2YWx1ZXM6IHtcbiAgICAgICAgICAgICAgICAnc3luY1NlY3JldCc6IHtcbiAgICAgICAgICAgICAgICAgICAgJ2VuYWJsZWQnOiB0cnVlLFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSlcblxuICAgICAgICAvLyBPbmNlIHRoZSBjaGFydCBpcyBpbnN0YWxsZWQgLSBXZSBuZWVkIHRvIGluc3RhbGwgdGhlIHByb3ZpZGVyXG4gICAgICAgIGxldCBkYXRhUmVzdWx0OiBSZWNvcmQ8c3RyaW5nLCBvYmplY3Q+W10gPSBbXTtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IHBhdGggPSByZXF1aXJlKCdwYXRoJyk7XG5cbiAgICAgICAgICAgIGxldCB2YWx1ZXNZYW1sID0gZnMucmVhZEZpbGVTeW5jKHBhdGguam9pbihfX2Rpcm5hbWUsIGAuLi9tYW5pZmVzdHMvc2VjcmV0LXN0b3JlLWF3cy1wcm92aWRlci55YW1sYCkpO1xuXG4gICAgICAgICAgICAvLyBSZXBsYWNlIERvbWFpbiBhbmQgbG9hZCBZQU1MXG4gICAgICAgICAgICBsZXQgdmFsdWVzUGFyc2VkID0geWFtbC5sb2FkQWxsKHZhbHVlc1lhbWwudG9TdHJpbmcoKSk7XG4gICAgICAgICAgICBpZiAodHlwZW9mIHZhbHVlc1BhcnNlZCA9PT0gJ29iamVjdCcgJiYgdmFsdWVzUGFyc2VkICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgZGF0YVJlc3VsdCA9IHZhbHVlc1BhcnNlZCBhcyBSZWNvcmQ8c3RyaW5nLCBvYmplY3Q+W107XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gY2F0Y2ggKGV4Y2VwdGlvbikge1xuICAgICAgICAgICAgLy8gcGFzc1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcihcIiA+IEZhaWxlZCB0byBsb2FkICdTZWNyZXRzIFN0b3JlIEFXUyBQcm92aWRlcicgIGRlcGxveS4uLlwiKTtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoZXhjZXB0aW9uKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEluc3RhbGwgbWFuaWZlc3QgYnkgaXRlcmF0aW5nIG92ZXIgYWxsIGNoYXJ0c1xuICAgICAgICBkYXRhUmVzdWx0LmZvckVhY2goKHZhbCwgaWR4KSA9PiB7XG4gICAgICAgICAgICBjbHVzdGVyLmFkZE1hbmlmZXN0KCdzZWNyZXQtc3RvcmUtYXdzLXByb3ZpZGVyJyArIGlkeCwgdmFsKTtcbiAgICAgICAgfSk7XG5cbiAgICB9XG59Il19
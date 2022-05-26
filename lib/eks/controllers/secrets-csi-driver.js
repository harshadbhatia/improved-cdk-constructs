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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VjcmV0cy1jc2ktZHJpdmVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsic2VjcmV0cy1jc2ktZHJpdmVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSw2Q0FBMEM7QUFJMUMsdUNBQXlCO0FBQ3pCLDhDQUFnQztBQUVoQyxNQUFhLHlCQUEwQixTQUFRLHlCQUFXO0lBR3RELFlBQVksS0FBZ0IsRUFBRSxFQUFVLEVBQUUsT0FBZ0I7UUFDdEQsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsQ0FBQztRQUVqQixtQ0FBbUM7UUFDbkMsdUVBQXVFO1FBQ3ZFLE9BQU8sQ0FBQyxZQUFZLENBQUMsMEJBQTBCLEVBQUU7WUFDN0MsT0FBTyxFQUFFLDBCQUEwQjtZQUNuQyxVQUFVLEVBQUUsb0VBQW9FO1lBQ2hGLEtBQUssRUFBRSwwQkFBMEI7WUFDakMsU0FBUyxFQUFFLGFBQWE7WUFDeEIsT0FBTyxFQUFFLE9BQU87WUFDaEIsTUFBTSxFQUFFO2dCQUNKLFlBQVksRUFBRTtvQkFDVixTQUFTLEVBQUUsSUFBSTtpQkFDbEI7YUFDSjtTQUNKLENBQUMsQ0FBQTtRQUVGLGdFQUFnRTtRQUNoRSxJQUFJLFVBQVUsR0FBNkIsRUFBRSxDQUFDO1FBQzlDLElBQUk7WUFDQSxNQUFNLElBQUksR0FBRyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUM7WUFFN0IsSUFBSSxVQUFVLEdBQUcsRUFBRSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSw2Q0FBNkMsQ0FBQyxDQUFDLENBQUM7WUFFdEcsK0JBQStCO1lBQy9CLElBQUksWUFBWSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUM7WUFDdkQsSUFBSSxPQUFPLFlBQVksS0FBSyxRQUFRLElBQUksWUFBWSxLQUFLLElBQUksRUFBRTtnQkFDM0QsVUFBVSxHQUFHLFlBQXdDLENBQUM7YUFDekQ7U0FDSjtRQUFDLE9BQU8sU0FBUyxFQUFFO1lBQ2hCLE9BQU87WUFDUCxPQUFPLENBQUMsS0FBSyxDQUFDLDJEQUEyRCxDQUFDLENBQUM7WUFDM0UsT0FBTyxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQztTQUM1QjtRQUVELGdEQUFnRDtRQUNoRCxVQUFVLENBQUMsT0FBTyxDQUFDLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxFQUFFO1lBQzVCLE9BQU8sQ0FBQyxXQUFXLENBQUMsMkJBQTJCLEdBQUcsR0FBRyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBQ2hFLENBQUMsQ0FBQyxDQUFDO0lBRVAsQ0FBQztDQUNKO0FBN0NELDhEQTZDQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IE5lc3RlZFN0YWNrIH0gZnJvbSAnYXdzLWNkay1saWInO1xuaW1wb3J0IHsgQ2x1c3RlciB9IGZyb20gJ2F3cy1jZGstbGliL2F3cy1la3MnO1xuaW1wb3J0IHsgQ29uc3RydWN0IH0gZnJvbSBcImNvbnN0cnVjdHNcIjtcbmltcG9ydCBpYW0gPSByZXF1aXJlKCdhd3MtY2RrLWxpYi9hd3MtaWFtJyk7XG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcyc7XG5pbXBvcnQgKiBhcyB5YW1sIGZyb20gJ2pzLXlhbWwnO1xuXG5leHBvcnQgY2xhc3MgQXdzU2VjcmV0c0NTSURyaXZlck5lc3RlZCBleHRlbmRzIE5lc3RlZFN0YWNrIHtcbiAgICBib2R5OiBDb25zdHJ1Y3Q7XG5cbiAgICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nLCBjbHVzdGVyOiBDbHVzdGVyKSB7XG4gICAgICAgIHN1cGVyKHNjb3BlLCBpZCk7XG5cbiAgICAgICAgLy8gSW5zdGFsbCBTZWNyZXRzIFN0b3JlIENTSSBEcml2ZXJcbiAgICAgICAgLy8gaHR0cHM6Ly9kb2NzLmF3cy5hbWF6b24uY29tL2Vrcy9sYXRlc3QvdXNlcmd1aWRlL2FkZC1vbnMtaW1hZ2VzLmh0bWxcbiAgICAgICAgY2x1c3Rlci5hZGRIZWxtQ2hhcnQoJ3NlY3JldHMtc3RvcmUtY3NpLWRyaXZlcicsIHtcbiAgICAgICAgICAgIHJlbGVhc2U6ICdzZWNyZXRzLXN0b3JlLWNzaS1kcml2ZXInLFxuICAgICAgICAgICAgcmVwb3NpdG9yeTogJ2h0dHBzOi8va3ViZXJuZXRlcy1zaWdzLmdpdGh1Yi5pby9zZWNyZXRzLXN0b3JlLWNzaS1kcml2ZXIvY2hhcnRzLycsXG4gICAgICAgICAgICBjaGFydDogJ3NlY3JldHMtc3RvcmUtY3NpLWRyaXZlcicsXG4gICAgICAgICAgICBuYW1lc3BhY2U6ICdrdWJlLXN5c3RlbScsXG4gICAgICAgICAgICB2ZXJzaW9uOiAnMS4wLjEnLFxuICAgICAgICAgICAgdmFsdWVzOiB7XG4gICAgICAgICAgICAgICAgJ3N5bmNTZWNyZXQnOiB7XG4gICAgICAgICAgICAgICAgICAgICdlbmFibGVkJzogdHJ1ZSxcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pXG5cbiAgICAgICAgLy8gT25jZSB0aGUgY2hhcnQgaXMgaW5zdGFsbGVkIC0gV2UgbmVlZCB0byBpbnN0YWxsIHRoZSBwcm92aWRlclxuICAgICAgICBsZXQgZGF0YVJlc3VsdDogUmVjb3JkPHN0cmluZywgb2JqZWN0PltdID0gW107XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCBwYXRoID0gcmVxdWlyZSgncGF0aCcpO1xuXG4gICAgICAgICAgICBsZXQgdmFsdWVzWWFtbCA9IGZzLnJlYWRGaWxlU3luYyhwYXRoLmpvaW4oX19kaXJuYW1lLCBgLi4vbWFuaWZlc3RzL3NlY3JldC1zdG9yZS1hd3MtcHJvdmlkZXIueWFtbGApKTtcblxuICAgICAgICAgICAgLy8gUmVwbGFjZSBEb21haW4gYW5kIGxvYWQgWUFNTFxuICAgICAgICAgICAgbGV0IHZhbHVlc1BhcnNlZCA9IHlhbWwubG9hZEFsbCh2YWx1ZXNZYW1sLnRvU3RyaW5nKCkpO1xuICAgICAgICAgICAgaWYgKHR5cGVvZiB2YWx1ZXNQYXJzZWQgPT09ICdvYmplY3QnICYmIHZhbHVlc1BhcnNlZCAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIGRhdGFSZXN1bHQgPSB2YWx1ZXNQYXJzZWQgYXMgUmVjb3JkPHN0cmluZywgb2JqZWN0PltdO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGNhdGNoIChleGNlcHRpb24pIHtcbiAgICAgICAgICAgIC8vIHBhc3NcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoXCIgPiBGYWlsZWQgdG8gbG9hZCAnU2VjcmV0cyBTdG9yZSBBV1MgUHJvdmlkZXInICBkZXBsb3kuLi5cIik7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKGV4Y2VwdGlvbik7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBJbnN0YWxsIG1hbmlmZXN0IGJ5IGl0ZXJhdGluZyBvdmVyIGFsbCBjaGFydHNcbiAgICAgICAgZGF0YVJlc3VsdC5mb3JFYWNoKCh2YWwsIGlkeCkgPT4ge1xuICAgICAgICAgICAgY2x1c3Rlci5hZGRNYW5pZmVzdCgnc2VjcmV0LXN0b3JlLWF3cy1wcm92aWRlcicgKyBpZHgsIHZhbCk7XG4gICAgICAgIH0pO1xuXG4gICAgfVxufSJdfQ==
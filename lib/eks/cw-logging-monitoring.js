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
exports.CloudwatchLogging = void 0;
const aws_cdk_lib_1 = require("aws-cdk-lib");
const fs = __importStar(require("fs"));
const yaml = __importStar(require("js-yaml"));
class CloudwatchLogging extends aws_cdk_lib_1.NestedStack {
    constructor(scope, id, eksCluster, props) {
        super(scope, id);
        this.eksCluster = eksCluster;
        this.deployLogging();
        this.deployMonitoring();
    }
    deployLogging() {
        // yaml
        let dataResult = [];
        // create namespace
        const namespace = this.eksCluster.addManifest('amazon-cloudwatch', {
            apiVersion: 'v1',
            kind: 'Namespace',
            metadata: {
                name: 'amazon-cloudwatch',
                labels: {
                    'name': 'amazon-cloudwatch',
                }
            },
        });
        try {
            const path = require('path');
            let valuesYaml = fs.readFileSync(path.join(__dirname, `./manifests/cloudwatch-logging.yaml`));
            // Replace Domain and load YAML
            let valuesParsed = yaml.loadAll(valuesYaml.toString()
                .replace(new RegExp('{CLUSTER_NAME}', 'gi'), this.eksCluster.clusterName)
                .replace(new RegExp('{CLUSTER_REGION}', 'gi'), aws_cdk_lib_1.Aws.REGION));
            if (typeof valuesParsed === 'object' && valuesParsed !== null) {
                dataResult = valuesParsed;
            }
        }
        catch (exception) {
            // pass
            console.error(" > Failed to load 'cloudwatch-logging.yaml' for 'cloudwatch-logging' deploy...");
            console.error(exception);
        }
        // Install manifest by iterating over all charts
        dataResult.forEach((val, idx) => {
            this.eksCluster.addManifest('cloudwatch-logging-' + idx, val).node.addDependency(namespace);
        });
    }
    deployMonitoring() {
        // yaml
        let dataResult = [];
        // create namespace
        const namespace = this.eksCluster.addManifest('aws-otel-eks', {
            apiVersion: 'v1',
            kind: 'Namespace',
            metadata: {
                name: 'aws-otel-eks',
                labels: {
                    'name': 'aws-otel-eks',
                }
            },
        });
        try {
            const path = require('path');
            let valuesYaml = fs.readFileSync(path.join(__dirname, `./manifests/cloudwatch-monitoring.yaml`));
            // Replace Domain and load YAML
            let valuesParsed = yaml.loadAll(valuesYaml.toString()
            // .replace(new RegExp('{CLUSTER_NAME}', 'gi'), this.eksCluster.clusterName)
            // .replace(new RegExp('{CLUSTER_REGION}', 'gi'), Aws.REGION),
            );
            if (typeof valuesParsed === 'object' && valuesParsed !== null) {
                dataResult = valuesParsed;
            }
        }
        catch (exception) {
            // pass
            console.error(" > Failed to load 'cloudwatch-monitoring.yaml' for 'cloudwatch-monitoring' deploy...");
            console.error(exception);
        }
        // Install manifest by iterating over all charts
        dataResult.forEach((val, idx) => {
            this.eksCluster.addManifest('cloudwatch-monitoring-' + idx, val).node.addDependency(namespace);
        });
    }
}
exports.CloudwatchLogging = CloudwatchLogging;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3ctbG9nZ2luZy1tb25pdG9yaW5nLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiY3ctbG9nZ2luZy1tb25pdG9yaW5nLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsNkNBQTJEO0FBRzNELHVDQUF5QjtBQUN6Qiw4Q0FBZ0M7QUFHaEMsTUFBYSxpQkFBa0IsU0FBUSx5QkFBVztJQU1oRCxZQUFZLEtBQWdCLEVBQUUsRUFBVSxFQUFFLFVBQW1CLEVBQUUsS0FBa0I7UUFDL0UsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsQ0FBQztRQUVqQixJQUFJLENBQUMsVUFBVSxHQUFHLFVBQVUsQ0FBQztRQUM3QixJQUFJLENBQUMsYUFBYSxFQUFFLENBQUE7UUFDcEIsSUFBSSxDQUFDLGdCQUFnQixFQUFFLENBQUE7SUFFekIsQ0FBQztJQUVELGFBQWE7UUFFWCxPQUFPO1FBQ1AsSUFBSSxVQUFVLEdBQTZCLEVBQUUsQ0FBQztRQUM5QyxtQkFBbUI7UUFDbkIsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxXQUFXLENBQUMsbUJBQW1CLEVBQUU7WUFDakUsVUFBVSxFQUFFLElBQUk7WUFDaEIsSUFBSSxFQUFFLFdBQVc7WUFDakIsUUFBUSxFQUFFO2dCQUNSLElBQUksRUFBRSxtQkFBbUI7Z0JBQ3pCLE1BQU0sRUFBRTtvQkFDTixNQUFNLEVBQUUsbUJBQW1CO2lCQUM1QjthQUNGO1NBQ0YsQ0FBQyxDQUFDO1FBRUgsSUFBSTtZQUNGLE1BQU0sSUFBSSxHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUU3QixJQUFJLFVBQVUsR0FBRyxFQUFFLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLHFDQUFxQyxDQUFDLENBQUMsQ0FBQztZQUM5RiwrQkFBK0I7WUFDL0IsSUFBSSxZQUFZLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FDN0IsVUFBVSxDQUFDLFFBQVEsRUFBRTtpQkFDbEIsT0FBTyxDQUFDLElBQUksTUFBTSxDQUFDLGdCQUFnQixFQUFFLElBQUksQ0FBQyxFQUFFLElBQUksQ0FBQyxVQUFVLENBQUMsV0FBVyxDQUFDO2lCQUN4RSxPQUFPLENBQUMsSUFBSSxNQUFNLENBQUMsa0JBQWtCLEVBQUUsSUFBSSxDQUFDLEVBQUUsaUJBQUcsQ0FBQyxNQUFNLENBQUMsQ0FDN0QsQ0FBQztZQUNGLElBQUksT0FBTyxZQUFZLEtBQUssUUFBUSxJQUFJLFlBQVksS0FBSyxJQUFJLEVBQUU7Z0JBQzdELFVBQVUsR0FBRyxZQUF3QyxDQUFDO2FBQ3ZEO1NBQ0Y7UUFBQyxPQUFPLFNBQVMsRUFBRTtZQUNsQixPQUFPO1lBQ1AsT0FBTyxDQUFDLEtBQUssQ0FBQyxnRkFBZ0YsQ0FBQyxDQUFDO1lBQ2hHLE9BQU8sQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLENBQUM7U0FDMUI7UUFFRCxnREFBZ0Q7UUFDaEQsVUFBVSxDQUFDLE9BQU8sQ0FBQyxDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsRUFBRTtZQUM5QixJQUFJLENBQUMsVUFBVSxDQUFDLFdBQVcsQ0FBQyxxQkFBcUIsR0FBRyxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUM5RixDQUFDLENBQUMsQ0FBQztJQUdMLENBQUM7SUFFRCxnQkFBZ0I7UUFFZCxPQUFPO1FBQ1AsSUFBSSxVQUFVLEdBQTZCLEVBQUUsQ0FBQztRQUM5QyxtQkFBbUI7UUFDbkIsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxXQUFXLENBQUMsY0FBYyxFQUFFO1lBQzVELFVBQVUsRUFBRSxJQUFJO1lBQ2hCLElBQUksRUFBRSxXQUFXO1lBQ2pCLFFBQVEsRUFBRTtnQkFDUixJQUFJLEVBQUUsY0FBYztnQkFDcEIsTUFBTSxFQUFFO29CQUNOLE1BQU0sRUFBRSxjQUFjO2lCQUN2QjthQUNGO1NBQ0YsQ0FBQyxDQUFDO1FBRUgsSUFBSTtZQUNGLE1BQU0sSUFBSSxHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUU3QixJQUFJLFVBQVUsR0FBRyxFQUFFLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLHdDQUF3QyxDQUFDLENBQUMsQ0FBQztZQUNqRywrQkFBK0I7WUFDL0IsSUFBSSxZQUFZLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FDN0IsVUFBVSxDQUFDLFFBQVEsRUFBRTtZQUNyQiw0RUFBNEU7WUFDNUUsOERBQThEO2FBQy9ELENBQUM7WUFDRixJQUFJLE9BQU8sWUFBWSxLQUFLLFFBQVEsSUFBSSxZQUFZLEtBQUssSUFBSSxFQUFFO2dCQUM3RCxVQUFVLEdBQUcsWUFBd0MsQ0FBQzthQUN2RDtTQUNGO1FBQUMsT0FBTyxTQUFTLEVBQUU7WUFDbEIsT0FBTztZQUNQLE9BQU8sQ0FBQyxLQUFLLENBQUMsc0ZBQXNGLENBQUMsQ0FBQztZQUN0RyxPQUFPLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDO1NBQzFCO1FBRUQsZ0RBQWdEO1FBQ2hELFVBQVUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLEVBQUU7WUFDOUIsSUFBSSxDQUFDLFVBQVUsQ0FBQyxXQUFXLENBQUMsd0JBQXdCLEdBQUcsR0FBRyxFQUFFLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDakcsQ0FBQyxDQUFDLENBQUM7SUFHTCxDQUFDO0NBRUY7QUFyR0QsOENBcUdDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQXdzLCBOZXN0ZWRTdGFjaywgU3RhY2tQcm9wcyB9IGZyb20gJ2F3cy1jZGstbGliJztcbmltcG9ydCB7IENsdXN0ZXIgfSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtZWtzJztcbmltcG9ydCB7IENvbnN0cnVjdCB9IGZyb20gXCJjb25zdHJ1Y3RzXCI7XG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcyc7XG5pbXBvcnQgKiBhcyB5YW1sIGZyb20gJ2pzLXlhbWwnO1xuXG5cbmV4cG9ydCBjbGFzcyBDbG91ZHdhdGNoTG9nZ2luZyBleHRlbmRzIE5lc3RlZFN0YWNrIHtcbiAgYm9keTogQ29uc3RydWN0O1xuICBib2RpZXM6IENvbnN0cnVjdFtdO1xuXG4gIGVrc0NsdXN0ZXI6IENsdXN0ZXI7XG5cbiAgY29uc3RydWN0b3Ioc2NvcGU6IENvbnN0cnVjdCwgaWQ6IHN0cmluZywgZWtzQ2x1c3RlcjogQ2x1c3RlciwgcHJvcHM/OiBTdGFja1Byb3BzKSB7XG4gICAgc3VwZXIoc2NvcGUsIGlkKTtcblxuICAgIHRoaXMuZWtzQ2x1c3RlciA9IGVrc0NsdXN0ZXI7XG4gICAgdGhpcy5kZXBsb3lMb2dnaW5nKClcbiAgICB0aGlzLmRlcGxveU1vbml0b3JpbmcoKVxuXG4gIH1cblxuICBkZXBsb3lMb2dnaW5nKCkge1xuXG4gICAgLy8geWFtbFxuICAgIGxldCBkYXRhUmVzdWx0OiBSZWNvcmQ8c3RyaW5nLCBvYmplY3Q+W10gPSBbXTtcbiAgICAvLyBjcmVhdGUgbmFtZXNwYWNlXG4gICAgY29uc3QgbmFtZXNwYWNlID0gdGhpcy5la3NDbHVzdGVyLmFkZE1hbmlmZXN0KCdhbWF6b24tY2xvdWR3YXRjaCcsIHtcbiAgICAgIGFwaVZlcnNpb246ICd2MScsXG4gICAgICBraW5kOiAnTmFtZXNwYWNlJyxcbiAgICAgIG1ldGFkYXRhOiB7XG4gICAgICAgIG5hbWU6ICdhbWF6b24tY2xvdWR3YXRjaCcsXG4gICAgICAgIGxhYmVsczoge1xuICAgICAgICAgICduYW1lJzogJ2FtYXpvbi1jbG91ZHdhdGNoJyxcbiAgICAgICAgfVxuICAgICAgfSxcbiAgICB9KTtcblxuICAgIHRyeSB7XG4gICAgICBjb25zdCBwYXRoID0gcmVxdWlyZSgncGF0aCcpO1xuXG4gICAgICBsZXQgdmFsdWVzWWFtbCA9IGZzLnJlYWRGaWxlU3luYyhwYXRoLmpvaW4oX19kaXJuYW1lLCBgLi9tYW5pZmVzdHMvY2xvdWR3YXRjaC1sb2dnaW5nLnlhbWxgKSk7XG4gICAgICAvLyBSZXBsYWNlIERvbWFpbiBhbmQgbG9hZCBZQU1MXG4gICAgICBsZXQgdmFsdWVzUGFyc2VkID0geWFtbC5sb2FkQWxsKFxuICAgICAgICB2YWx1ZXNZYW1sLnRvU3RyaW5nKClcbiAgICAgICAgICAucmVwbGFjZShuZXcgUmVnRXhwKCd7Q0xVU1RFUl9OQU1FfScsICdnaScpLCB0aGlzLmVrc0NsdXN0ZXIuY2x1c3Rlck5hbWUpXG4gICAgICAgICAgLnJlcGxhY2UobmV3IFJlZ0V4cCgne0NMVVNURVJfUkVHSU9OfScsICdnaScpLCBBd3MuUkVHSU9OKSxcbiAgICAgICk7XG4gICAgICBpZiAodHlwZW9mIHZhbHVlc1BhcnNlZCA9PT0gJ29iamVjdCcgJiYgdmFsdWVzUGFyc2VkICE9PSBudWxsKSB7XG4gICAgICAgIGRhdGFSZXN1bHQgPSB2YWx1ZXNQYXJzZWQgYXMgUmVjb3JkPHN0cmluZywgb2JqZWN0PltdO1xuICAgICAgfVxuICAgIH0gY2F0Y2ggKGV4Y2VwdGlvbikge1xuICAgICAgLy8gcGFzc1xuICAgICAgY29uc29sZS5lcnJvcihcIiA+IEZhaWxlZCB0byBsb2FkICdjbG91ZHdhdGNoLWxvZ2dpbmcueWFtbCcgZm9yICdjbG91ZHdhdGNoLWxvZ2dpbmcnIGRlcGxveS4uLlwiKTtcbiAgICAgIGNvbnNvbGUuZXJyb3IoZXhjZXB0aW9uKTtcbiAgICB9XG5cbiAgICAvLyBJbnN0YWxsIG1hbmlmZXN0IGJ5IGl0ZXJhdGluZyBvdmVyIGFsbCBjaGFydHNcbiAgICBkYXRhUmVzdWx0LmZvckVhY2goKHZhbCwgaWR4KSA9PiB7XG4gICAgICB0aGlzLmVrc0NsdXN0ZXIuYWRkTWFuaWZlc3QoJ2Nsb3Vkd2F0Y2gtbG9nZ2luZy0nICsgaWR4LCB2YWwpLm5vZGUuYWRkRGVwZW5kZW5jeShuYW1lc3BhY2UpO1xuICAgIH0pO1xuXG5cbiAgfVxuXG4gIGRlcGxveU1vbml0b3JpbmcoKSB7XG5cbiAgICAvLyB5YW1sXG4gICAgbGV0IGRhdGFSZXN1bHQ6IFJlY29yZDxzdHJpbmcsIG9iamVjdD5bXSA9IFtdO1xuICAgIC8vIGNyZWF0ZSBuYW1lc3BhY2VcbiAgICBjb25zdCBuYW1lc3BhY2UgPSB0aGlzLmVrc0NsdXN0ZXIuYWRkTWFuaWZlc3QoJ2F3cy1vdGVsLWVrcycsIHtcbiAgICAgIGFwaVZlcnNpb246ICd2MScsXG4gICAgICBraW5kOiAnTmFtZXNwYWNlJyxcbiAgICAgIG1ldGFkYXRhOiB7XG4gICAgICAgIG5hbWU6ICdhd3Mtb3RlbC1la3MnLFxuICAgICAgICBsYWJlbHM6IHtcbiAgICAgICAgICAnbmFtZSc6ICdhd3Mtb3RlbC1la3MnLFxuICAgICAgICB9XG4gICAgICB9LFxuICAgIH0pO1xuXG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHBhdGggPSByZXF1aXJlKCdwYXRoJyk7XG5cbiAgICAgIGxldCB2YWx1ZXNZYW1sID0gZnMucmVhZEZpbGVTeW5jKHBhdGguam9pbihfX2Rpcm5hbWUsIGAuL21hbmlmZXN0cy9jbG91ZHdhdGNoLW1vbml0b3JpbmcueWFtbGApKTtcbiAgICAgIC8vIFJlcGxhY2UgRG9tYWluIGFuZCBsb2FkIFlBTUxcbiAgICAgIGxldCB2YWx1ZXNQYXJzZWQgPSB5YW1sLmxvYWRBbGwoXG4gICAgICAgIHZhbHVlc1lhbWwudG9TdHJpbmcoKVxuICAgICAgICAvLyAucmVwbGFjZShuZXcgUmVnRXhwKCd7Q0xVU1RFUl9OQU1FfScsICdnaScpLCB0aGlzLmVrc0NsdXN0ZXIuY2x1c3Rlck5hbWUpXG4gICAgICAgIC8vIC5yZXBsYWNlKG5ldyBSZWdFeHAoJ3tDTFVTVEVSX1JFR0lPTn0nLCAnZ2knKSwgQXdzLlJFR0lPTiksXG4gICAgICApO1xuICAgICAgaWYgKHR5cGVvZiB2YWx1ZXNQYXJzZWQgPT09ICdvYmplY3QnICYmIHZhbHVlc1BhcnNlZCAhPT0gbnVsbCkge1xuICAgICAgICBkYXRhUmVzdWx0ID0gdmFsdWVzUGFyc2VkIGFzIFJlY29yZDxzdHJpbmcsIG9iamVjdD5bXTtcbiAgICAgIH1cbiAgICB9IGNhdGNoIChleGNlcHRpb24pIHtcbiAgICAgIC8vIHBhc3NcbiAgICAgIGNvbnNvbGUuZXJyb3IoXCIgPiBGYWlsZWQgdG8gbG9hZCAnY2xvdWR3YXRjaC1tb25pdG9yaW5nLnlhbWwnIGZvciAnY2xvdWR3YXRjaC1tb25pdG9yaW5nJyBkZXBsb3kuLi5cIik7XG4gICAgICBjb25zb2xlLmVycm9yKGV4Y2VwdGlvbik7XG4gICAgfVxuXG4gICAgLy8gSW5zdGFsbCBtYW5pZmVzdCBieSBpdGVyYXRpbmcgb3ZlciBhbGwgY2hhcnRzXG4gICAgZGF0YVJlc3VsdC5mb3JFYWNoKCh2YWwsIGlkeCkgPT4ge1xuICAgICAgdGhpcy5la3NDbHVzdGVyLmFkZE1hbmlmZXN0KCdjbG91ZHdhdGNoLW1vbml0b3JpbmctJyArIGlkeCwgdmFsKS5ub2RlLmFkZERlcGVuZGVuY3kobmFtZXNwYWNlKTtcbiAgICB9KTtcblxuXG4gIH1cblxufSJdfQ==
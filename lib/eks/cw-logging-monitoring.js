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
exports.CloudwatchLoggingNested = void 0;
const aws_cdk_lib_1 = require("aws-cdk-lib");
const fs = __importStar(require("fs"));
const yaml = __importStar(require("js-yaml"));
class CloudwatchLoggingNested extends aws_cdk_lib_1.NestedStack {
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
exports.CloudwatchLoggingNested = CloudwatchLoggingNested;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3ctbG9nZ2luZy1tb25pdG9yaW5nLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiY3ctbG9nZ2luZy1tb25pdG9yaW5nLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSw2Q0FBMkQ7QUFHM0QsdUNBQXlCO0FBQ3pCLDhDQUFnQztBQUdoQyxNQUFhLHVCQUF3QixTQUFRLHlCQUFXO0lBTXRELFlBQVksS0FBZ0IsRUFBRSxFQUFVLEVBQUUsVUFBbUIsRUFBRSxLQUFrQjtRQUMvRSxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBRWpCLElBQUksQ0FBQyxVQUFVLEdBQUcsVUFBVSxDQUFDO1FBQzdCLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQTtRQUNwQixJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQTtJQUV6QixDQUFDO0lBRUQsYUFBYTtRQUVYLE9BQU87UUFDUCxJQUFJLFVBQVUsR0FBNkIsRUFBRSxDQUFDO1FBQzlDLG1CQUFtQjtRQUNuQixNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLFdBQVcsQ0FBQyxtQkFBbUIsRUFBRTtZQUNqRSxVQUFVLEVBQUUsSUFBSTtZQUNoQixJQUFJLEVBQUUsV0FBVztZQUNqQixRQUFRLEVBQUU7Z0JBQ1IsSUFBSSxFQUFFLG1CQUFtQjtnQkFDekIsTUFBTSxFQUFFO29CQUNOLE1BQU0sRUFBRSxtQkFBbUI7aUJBQzVCO2FBQ0Y7U0FDRixDQUFDLENBQUM7UUFFSCxJQUFJO1lBQ0YsTUFBTSxJQUFJLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBRTdCLElBQUksVUFBVSxHQUFHLEVBQUUsQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUscUNBQXFDLENBQUMsQ0FBQyxDQUFDO1lBQzlGLCtCQUErQjtZQUMvQixJQUFJLFlBQVksR0FBRyxJQUFJLENBQUMsT0FBTyxDQUM3QixVQUFVLENBQUMsUUFBUSxFQUFFO2lCQUNsQixPQUFPLENBQUMsSUFBSSxNQUFNLENBQUMsZ0JBQWdCLEVBQUUsSUFBSSxDQUFDLEVBQUUsSUFBSSxDQUFDLFVBQVUsQ0FBQyxXQUFXLENBQUM7aUJBQ3hFLE9BQU8sQ0FBQyxJQUFJLE1BQU0sQ0FBQyxrQkFBa0IsRUFBRSxJQUFJLENBQUMsRUFBRSxpQkFBRyxDQUFDLE1BQU0sQ0FBQyxDQUM3RCxDQUFDO1lBQ0YsSUFBSSxPQUFPLFlBQVksS0FBSyxRQUFRLElBQUksWUFBWSxLQUFLLElBQUksRUFBRTtnQkFDN0QsVUFBVSxHQUFHLFlBQXdDLENBQUM7YUFDdkQ7U0FDRjtRQUFDLE9BQU8sU0FBUyxFQUFFO1lBQ2xCLE9BQU87WUFDUCxPQUFPLENBQUMsS0FBSyxDQUFDLGdGQUFnRixDQUFDLENBQUM7WUFDaEcsT0FBTyxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQztTQUMxQjtRQUVELGdEQUFnRDtRQUNoRCxVQUFVLENBQUMsT0FBTyxDQUFDLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxFQUFFO1lBQzlCLElBQUksQ0FBQyxVQUFVLENBQUMsV0FBVyxDQUFDLHFCQUFxQixHQUFHLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQzlGLENBQUMsQ0FBQyxDQUFDO0lBR0wsQ0FBQztJQUVELGdCQUFnQjtRQUVkLE9BQU87UUFDUCxJQUFJLFVBQVUsR0FBNkIsRUFBRSxDQUFDO1FBQzlDLG1CQUFtQjtRQUNuQixNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLFdBQVcsQ0FBQyxjQUFjLEVBQUU7WUFDNUQsVUFBVSxFQUFFLElBQUk7WUFDaEIsSUFBSSxFQUFFLFdBQVc7WUFDakIsUUFBUSxFQUFFO2dCQUNSLElBQUksRUFBRSxjQUFjO2dCQUNwQixNQUFNLEVBQUU7b0JBQ04sTUFBTSxFQUFFLGNBQWM7aUJBQ3ZCO2FBQ0Y7U0FDRixDQUFDLENBQUM7UUFFSCxJQUFJO1lBQ0YsTUFBTSxJQUFJLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBRTdCLElBQUksVUFBVSxHQUFHLEVBQUUsQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsd0NBQXdDLENBQUMsQ0FBQyxDQUFDO1lBQ2pHLCtCQUErQjtZQUMvQixJQUFJLFlBQVksR0FBRyxJQUFJLENBQUMsT0FBTyxDQUM3QixVQUFVLENBQUMsUUFBUSxFQUFFO1lBQ3JCLDRFQUE0RTtZQUM1RSw4REFBOEQ7YUFDL0QsQ0FBQztZQUNGLElBQUksT0FBTyxZQUFZLEtBQUssUUFBUSxJQUFJLFlBQVksS0FBSyxJQUFJLEVBQUU7Z0JBQzdELFVBQVUsR0FBRyxZQUF3QyxDQUFDO2FBQ3ZEO1NBQ0Y7UUFBQyxPQUFPLFNBQVMsRUFBRTtZQUNsQixPQUFPO1lBQ1AsT0FBTyxDQUFDLEtBQUssQ0FBQyxzRkFBc0YsQ0FBQyxDQUFDO1lBQ3RHLE9BQU8sQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLENBQUM7U0FDMUI7UUFFRCxnREFBZ0Q7UUFDaEQsVUFBVSxDQUFDLE9BQU8sQ0FBQyxDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsRUFBRTtZQUM5QixJQUFJLENBQUMsVUFBVSxDQUFDLFdBQVcsQ0FBQyx3QkFBd0IsR0FBRyxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUNqRyxDQUFDLENBQUMsQ0FBQztJQUdMLENBQUM7Q0FFRjtBQXJHRCwwREFxR0MiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBBd3MsIE5lc3RlZFN0YWNrLCBTdGFja1Byb3BzIH0gZnJvbSAnYXdzLWNkay1saWInO1xuaW1wb3J0IHsgQ2x1c3RlciB9IGZyb20gJ2F3cy1jZGstbGliL2F3cy1la3MnO1xuaW1wb3J0IHsgQ29uc3RydWN0IH0gZnJvbSBcImNvbnN0cnVjdHNcIjtcbmltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzJztcbmltcG9ydCAqIGFzIHlhbWwgZnJvbSAnanMteWFtbCc7XG5cblxuZXhwb3J0IGNsYXNzIENsb3Vkd2F0Y2hMb2dnaW5nTmVzdGVkIGV4dGVuZHMgTmVzdGVkU3RhY2sge1xuICBib2R5OiBDb25zdHJ1Y3Q7XG4gIGJvZGllczogQ29uc3RydWN0W107XG5cbiAgZWtzQ2x1c3RlcjogQ2x1c3RlcjtcblxuICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nLCBla3NDbHVzdGVyOiBDbHVzdGVyLCBwcm9wcz86IFN0YWNrUHJvcHMpIHtcbiAgICBzdXBlcihzY29wZSwgaWQpO1xuXG4gICAgdGhpcy5la3NDbHVzdGVyID0gZWtzQ2x1c3RlcjtcbiAgICB0aGlzLmRlcGxveUxvZ2dpbmcoKVxuICAgIHRoaXMuZGVwbG95TW9uaXRvcmluZygpXG5cbiAgfVxuXG4gIGRlcGxveUxvZ2dpbmcoKSB7XG5cbiAgICAvLyB5YW1sXG4gICAgbGV0IGRhdGFSZXN1bHQ6IFJlY29yZDxzdHJpbmcsIG9iamVjdD5bXSA9IFtdO1xuICAgIC8vIGNyZWF0ZSBuYW1lc3BhY2VcbiAgICBjb25zdCBuYW1lc3BhY2UgPSB0aGlzLmVrc0NsdXN0ZXIuYWRkTWFuaWZlc3QoJ2FtYXpvbi1jbG91ZHdhdGNoJywge1xuICAgICAgYXBpVmVyc2lvbjogJ3YxJyxcbiAgICAgIGtpbmQ6ICdOYW1lc3BhY2UnLFxuICAgICAgbWV0YWRhdGE6IHtcbiAgICAgICAgbmFtZTogJ2FtYXpvbi1jbG91ZHdhdGNoJyxcbiAgICAgICAgbGFiZWxzOiB7XG4gICAgICAgICAgJ25hbWUnOiAnYW1hem9uLWNsb3Vkd2F0Y2gnLFxuICAgICAgICB9XG4gICAgICB9LFxuICAgIH0pO1xuXG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHBhdGggPSByZXF1aXJlKCdwYXRoJyk7XG5cbiAgICAgIGxldCB2YWx1ZXNZYW1sID0gZnMucmVhZEZpbGVTeW5jKHBhdGguam9pbihfX2Rpcm5hbWUsIGAuL21hbmlmZXN0cy9jbG91ZHdhdGNoLWxvZ2dpbmcueWFtbGApKTtcbiAgICAgIC8vIFJlcGxhY2UgRG9tYWluIGFuZCBsb2FkIFlBTUxcbiAgICAgIGxldCB2YWx1ZXNQYXJzZWQgPSB5YW1sLmxvYWRBbGwoXG4gICAgICAgIHZhbHVlc1lhbWwudG9TdHJpbmcoKVxuICAgICAgICAgIC5yZXBsYWNlKG5ldyBSZWdFeHAoJ3tDTFVTVEVSX05BTUV9JywgJ2dpJyksIHRoaXMuZWtzQ2x1c3Rlci5jbHVzdGVyTmFtZSlcbiAgICAgICAgICAucmVwbGFjZShuZXcgUmVnRXhwKCd7Q0xVU1RFUl9SRUdJT059JywgJ2dpJyksIEF3cy5SRUdJT04pLFxuICAgICAgKTtcbiAgICAgIGlmICh0eXBlb2YgdmFsdWVzUGFyc2VkID09PSAnb2JqZWN0JyAmJiB2YWx1ZXNQYXJzZWQgIT09IG51bGwpIHtcbiAgICAgICAgZGF0YVJlc3VsdCA9IHZhbHVlc1BhcnNlZCBhcyBSZWNvcmQ8c3RyaW5nLCBvYmplY3Q+W107XG4gICAgICB9XG4gICAgfSBjYXRjaCAoZXhjZXB0aW9uKSB7XG4gICAgICAvLyBwYXNzXG4gICAgICBjb25zb2xlLmVycm9yKFwiID4gRmFpbGVkIHRvIGxvYWQgJ2Nsb3Vkd2F0Y2gtbG9nZ2luZy55YW1sJyBmb3IgJ2Nsb3Vkd2F0Y2gtbG9nZ2luZycgZGVwbG95Li4uXCIpO1xuICAgICAgY29uc29sZS5lcnJvcihleGNlcHRpb24pO1xuICAgIH1cblxuICAgIC8vIEluc3RhbGwgbWFuaWZlc3QgYnkgaXRlcmF0aW5nIG92ZXIgYWxsIGNoYXJ0c1xuICAgIGRhdGFSZXN1bHQuZm9yRWFjaCgodmFsLCBpZHgpID0+IHtcbiAgICAgIHRoaXMuZWtzQ2x1c3Rlci5hZGRNYW5pZmVzdCgnY2xvdWR3YXRjaC1sb2dnaW5nLScgKyBpZHgsIHZhbCkubm9kZS5hZGREZXBlbmRlbmN5KG5hbWVzcGFjZSk7XG4gICAgfSk7XG5cblxuICB9XG5cbiAgZGVwbG95TW9uaXRvcmluZygpIHtcblxuICAgIC8vIHlhbWxcbiAgICBsZXQgZGF0YVJlc3VsdDogUmVjb3JkPHN0cmluZywgb2JqZWN0PltdID0gW107XG4gICAgLy8gY3JlYXRlIG5hbWVzcGFjZVxuICAgIGNvbnN0IG5hbWVzcGFjZSA9IHRoaXMuZWtzQ2x1c3Rlci5hZGRNYW5pZmVzdCgnYXdzLW90ZWwtZWtzJywge1xuICAgICAgYXBpVmVyc2lvbjogJ3YxJyxcbiAgICAgIGtpbmQ6ICdOYW1lc3BhY2UnLFxuICAgICAgbWV0YWRhdGE6IHtcbiAgICAgICAgbmFtZTogJ2F3cy1vdGVsLWVrcycsXG4gICAgICAgIGxhYmVsczoge1xuICAgICAgICAgICduYW1lJzogJ2F3cy1vdGVsLWVrcycsXG4gICAgICAgIH1cbiAgICAgIH0sXG4gICAgfSk7XG5cbiAgICB0cnkge1xuICAgICAgY29uc3QgcGF0aCA9IHJlcXVpcmUoJ3BhdGgnKTtcblxuICAgICAgbGV0IHZhbHVlc1lhbWwgPSBmcy5yZWFkRmlsZVN5bmMocGF0aC5qb2luKF9fZGlybmFtZSwgYC4vbWFuaWZlc3RzL2Nsb3Vkd2F0Y2gtbW9uaXRvcmluZy55YW1sYCkpO1xuICAgICAgLy8gUmVwbGFjZSBEb21haW4gYW5kIGxvYWQgWUFNTFxuICAgICAgbGV0IHZhbHVlc1BhcnNlZCA9IHlhbWwubG9hZEFsbChcbiAgICAgICAgdmFsdWVzWWFtbC50b1N0cmluZygpXG4gICAgICAgIC8vIC5yZXBsYWNlKG5ldyBSZWdFeHAoJ3tDTFVTVEVSX05BTUV9JywgJ2dpJyksIHRoaXMuZWtzQ2x1c3Rlci5jbHVzdGVyTmFtZSlcbiAgICAgICAgLy8gLnJlcGxhY2UobmV3IFJlZ0V4cCgne0NMVVNURVJfUkVHSU9OfScsICdnaScpLCBBd3MuUkVHSU9OKSxcbiAgICAgICk7XG4gICAgICBpZiAodHlwZW9mIHZhbHVlc1BhcnNlZCA9PT0gJ29iamVjdCcgJiYgdmFsdWVzUGFyc2VkICE9PSBudWxsKSB7XG4gICAgICAgIGRhdGFSZXN1bHQgPSB2YWx1ZXNQYXJzZWQgYXMgUmVjb3JkPHN0cmluZywgb2JqZWN0PltdO1xuICAgICAgfVxuICAgIH0gY2F0Y2ggKGV4Y2VwdGlvbikge1xuICAgICAgLy8gcGFzc1xuICAgICAgY29uc29sZS5lcnJvcihcIiA+IEZhaWxlZCB0byBsb2FkICdjbG91ZHdhdGNoLW1vbml0b3JpbmcueWFtbCcgZm9yICdjbG91ZHdhdGNoLW1vbml0b3JpbmcnIGRlcGxveS4uLlwiKTtcbiAgICAgIGNvbnNvbGUuZXJyb3IoZXhjZXB0aW9uKTtcbiAgICB9XG5cbiAgICAvLyBJbnN0YWxsIG1hbmlmZXN0IGJ5IGl0ZXJhdGluZyBvdmVyIGFsbCBjaGFydHNcbiAgICBkYXRhUmVzdWx0LmZvckVhY2goKHZhbCwgaWR4KSA9PiB7XG4gICAgICB0aGlzLmVrc0NsdXN0ZXIuYWRkTWFuaWZlc3QoJ2Nsb3Vkd2F0Y2gtbW9uaXRvcmluZy0nICsgaWR4LCB2YWwpLm5vZGUuYWRkRGVwZW5kZW5jeShuYW1lc3BhY2UpO1xuICAgIH0pO1xuXG5cbiAgfVxuXG59Il19
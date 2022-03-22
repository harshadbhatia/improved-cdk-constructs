"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CloudwatchLoggingNested = void 0;
const aws_cdk_lib_1 = require("aws-cdk-lib");
const fs = require("fs");
const yaml = require("js-yaml");
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3ctbG9nZ2luZy1tb25pdG9yaW5nLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiY3ctbG9nZ2luZy1tb25pdG9yaW5nLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLDZDQUEyRDtBQUczRCx5QkFBeUI7QUFDekIsZ0NBQWdDO0FBR2hDLE1BQWEsdUJBQXdCLFNBQVEseUJBQVc7SUFNdEQsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxVQUFtQixFQUFFLEtBQWtCO1FBQy9FLEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFFakIsSUFBSSxDQUFDLFVBQVUsR0FBRyxVQUFVLENBQUM7UUFDN0IsSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFBO1FBQ3BCLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxDQUFBO0lBRXpCLENBQUM7SUFFRCxhQUFhO1FBRVgsT0FBTztRQUNQLElBQUksVUFBVSxHQUE2QixFQUFFLENBQUM7UUFDOUMsbUJBQW1CO1FBQ25CLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsV0FBVyxDQUFDLG1CQUFtQixFQUFFO1lBQ2pFLFVBQVUsRUFBRSxJQUFJO1lBQ2hCLElBQUksRUFBRSxXQUFXO1lBQ2pCLFFBQVEsRUFBRTtnQkFDUixJQUFJLEVBQUUsbUJBQW1CO2dCQUN6QixNQUFNLEVBQUU7b0JBQ04sTUFBTSxFQUFFLG1CQUFtQjtpQkFDNUI7YUFDRjtTQUNGLENBQUMsQ0FBQztRQUVILElBQUk7WUFDRixNQUFNLElBQUksR0FBRyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUM7WUFFN0IsSUFBSSxVQUFVLEdBQUcsRUFBRSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxxQ0FBcUMsQ0FBQyxDQUFDLENBQUM7WUFDOUYsK0JBQStCO1lBQy9CLElBQUksWUFBWSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQzdCLFVBQVUsQ0FBQyxRQUFRLEVBQUU7aUJBQ2xCLE9BQU8sQ0FBQyxJQUFJLE1BQU0sQ0FBQyxnQkFBZ0IsRUFBRSxJQUFJLENBQUMsRUFBRSxJQUFJLENBQUMsVUFBVSxDQUFDLFdBQVcsQ0FBQztpQkFDeEUsT0FBTyxDQUFDLElBQUksTUFBTSxDQUFDLGtCQUFrQixFQUFFLElBQUksQ0FBQyxFQUFFLGlCQUFHLENBQUMsTUFBTSxDQUFDLENBQzdELENBQUM7WUFDRixJQUFJLE9BQU8sWUFBWSxLQUFLLFFBQVEsSUFBSSxZQUFZLEtBQUssSUFBSSxFQUFFO2dCQUM3RCxVQUFVLEdBQUcsWUFBd0MsQ0FBQzthQUN2RDtTQUNGO1FBQUMsT0FBTyxTQUFTLEVBQUU7WUFDbEIsT0FBTztZQUNQLE9BQU8sQ0FBQyxLQUFLLENBQUMsZ0ZBQWdGLENBQUMsQ0FBQztZQUNoRyxPQUFPLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDO1NBQzFCO1FBRUQsZ0RBQWdEO1FBQ2hELFVBQVUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLEVBQUU7WUFDOUIsSUFBSSxDQUFDLFVBQVUsQ0FBQyxXQUFXLENBQUMscUJBQXFCLEdBQUcsR0FBRyxFQUFFLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDOUYsQ0FBQyxDQUFDLENBQUM7SUFHTCxDQUFDO0lBRUQsZ0JBQWdCO1FBRWQsT0FBTztRQUNQLElBQUksVUFBVSxHQUE2QixFQUFFLENBQUM7UUFDOUMsbUJBQW1CO1FBQ25CLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsV0FBVyxDQUFDLGNBQWMsRUFBRTtZQUM1RCxVQUFVLEVBQUUsSUFBSTtZQUNoQixJQUFJLEVBQUUsV0FBVztZQUNqQixRQUFRLEVBQUU7Z0JBQ1IsSUFBSSxFQUFFLGNBQWM7Z0JBQ3BCLE1BQU0sRUFBRTtvQkFDTixNQUFNLEVBQUUsY0FBYztpQkFDdkI7YUFDRjtTQUNGLENBQUMsQ0FBQztRQUVILElBQUk7WUFDRixNQUFNLElBQUksR0FBRyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUM7WUFFN0IsSUFBSSxVQUFVLEdBQUcsRUFBRSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSx3Q0FBd0MsQ0FBQyxDQUFDLENBQUM7WUFDakcsK0JBQStCO1lBQy9CLElBQUksWUFBWSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQzdCLFVBQVUsQ0FBQyxRQUFRLEVBQUU7WUFDckIsNEVBQTRFO1lBQzVFLDhEQUE4RDthQUMvRCxDQUFDO1lBQ0YsSUFBSSxPQUFPLFlBQVksS0FBSyxRQUFRLElBQUksWUFBWSxLQUFLLElBQUksRUFBRTtnQkFDN0QsVUFBVSxHQUFHLFlBQXdDLENBQUM7YUFDdkQ7U0FDRjtRQUFDLE9BQU8sU0FBUyxFQUFFO1lBQ2xCLE9BQU87WUFDUCxPQUFPLENBQUMsS0FBSyxDQUFDLHNGQUFzRixDQUFDLENBQUM7WUFDdEcsT0FBTyxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQztTQUMxQjtRQUVELGdEQUFnRDtRQUNoRCxVQUFVLENBQUMsT0FBTyxDQUFDLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxFQUFFO1lBQzlCLElBQUksQ0FBQyxVQUFVLENBQUMsV0FBVyxDQUFDLHdCQUF3QixHQUFHLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQ2pHLENBQUMsQ0FBQyxDQUFDO0lBR0wsQ0FBQztDQUVGO0FBckdELDBEQXFHQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IEF3cywgTmVzdGVkU3RhY2ssIFN0YWNrUHJvcHMgfSBmcm9tICdhd3MtY2RrLWxpYic7XG5pbXBvcnQgeyBDbHVzdGVyIH0gZnJvbSAnYXdzLWNkay1saWIvYXdzLWVrcyc7XG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tIFwiY29uc3RydWN0c1wiO1xuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xuaW1wb3J0ICogYXMgeWFtbCBmcm9tICdqcy15YW1sJztcblxuXG5leHBvcnQgY2xhc3MgQ2xvdWR3YXRjaExvZ2dpbmdOZXN0ZWQgZXh0ZW5kcyBOZXN0ZWRTdGFjayB7XG4gIGJvZHk6IENvbnN0cnVjdDtcbiAgYm9kaWVzOiBDb25zdHJ1Y3RbXTtcblxuICBla3NDbHVzdGVyOiBDbHVzdGVyO1xuXG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcsIGVrc0NsdXN0ZXI6IENsdXN0ZXIsIHByb3BzPzogU3RhY2tQcm9wcykge1xuICAgIHN1cGVyKHNjb3BlLCBpZCk7XG5cbiAgICB0aGlzLmVrc0NsdXN0ZXIgPSBla3NDbHVzdGVyO1xuICAgIHRoaXMuZGVwbG95TG9nZ2luZygpXG4gICAgdGhpcy5kZXBsb3lNb25pdG9yaW5nKClcblxuICB9XG5cbiAgZGVwbG95TG9nZ2luZygpIHtcblxuICAgIC8vIHlhbWxcbiAgICBsZXQgZGF0YVJlc3VsdDogUmVjb3JkPHN0cmluZywgb2JqZWN0PltdID0gW107XG4gICAgLy8gY3JlYXRlIG5hbWVzcGFjZVxuICAgIGNvbnN0IG5hbWVzcGFjZSA9IHRoaXMuZWtzQ2x1c3Rlci5hZGRNYW5pZmVzdCgnYW1hem9uLWNsb3Vkd2F0Y2gnLCB7XG4gICAgICBhcGlWZXJzaW9uOiAndjEnLFxuICAgICAga2luZDogJ05hbWVzcGFjZScsXG4gICAgICBtZXRhZGF0YToge1xuICAgICAgICBuYW1lOiAnYW1hem9uLWNsb3Vkd2F0Y2gnLFxuICAgICAgICBsYWJlbHM6IHtcbiAgICAgICAgICAnbmFtZSc6ICdhbWF6b24tY2xvdWR3YXRjaCcsXG4gICAgICAgIH1cbiAgICAgIH0sXG4gICAgfSk7XG5cbiAgICB0cnkge1xuICAgICAgY29uc3QgcGF0aCA9IHJlcXVpcmUoJ3BhdGgnKTtcblxuICAgICAgbGV0IHZhbHVlc1lhbWwgPSBmcy5yZWFkRmlsZVN5bmMocGF0aC5qb2luKF9fZGlybmFtZSwgYC4vbWFuaWZlc3RzL2Nsb3Vkd2F0Y2gtbG9nZ2luZy55YW1sYCkpO1xuICAgICAgLy8gUmVwbGFjZSBEb21haW4gYW5kIGxvYWQgWUFNTFxuICAgICAgbGV0IHZhbHVlc1BhcnNlZCA9IHlhbWwubG9hZEFsbChcbiAgICAgICAgdmFsdWVzWWFtbC50b1N0cmluZygpXG4gICAgICAgICAgLnJlcGxhY2UobmV3IFJlZ0V4cCgne0NMVVNURVJfTkFNRX0nLCAnZ2knKSwgdGhpcy5la3NDbHVzdGVyLmNsdXN0ZXJOYW1lKVxuICAgICAgICAgIC5yZXBsYWNlKG5ldyBSZWdFeHAoJ3tDTFVTVEVSX1JFR0lPTn0nLCAnZ2knKSwgQXdzLlJFR0lPTiksXG4gICAgICApO1xuICAgICAgaWYgKHR5cGVvZiB2YWx1ZXNQYXJzZWQgPT09ICdvYmplY3QnICYmIHZhbHVlc1BhcnNlZCAhPT0gbnVsbCkge1xuICAgICAgICBkYXRhUmVzdWx0ID0gdmFsdWVzUGFyc2VkIGFzIFJlY29yZDxzdHJpbmcsIG9iamVjdD5bXTtcbiAgICAgIH1cbiAgICB9IGNhdGNoIChleGNlcHRpb24pIHtcbiAgICAgIC8vIHBhc3NcbiAgICAgIGNvbnNvbGUuZXJyb3IoXCIgPiBGYWlsZWQgdG8gbG9hZCAnY2xvdWR3YXRjaC1sb2dnaW5nLnlhbWwnIGZvciAnY2xvdWR3YXRjaC1sb2dnaW5nJyBkZXBsb3kuLi5cIik7XG4gICAgICBjb25zb2xlLmVycm9yKGV4Y2VwdGlvbik7XG4gICAgfVxuXG4gICAgLy8gSW5zdGFsbCBtYW5pZmVzdCBieSBpdGVyYXRpbmcgb3ZlciBhbGwgY2hhcnRzXG4gICAgZGF0YVJlc3VsdC5mb3JFYWNoKCh2YWwsIGlkeCkgPT4ge1xuICAgICAgdGhpcy5la3NDbHVzdGVyLmFkZE1hbmlmZXN0KCdjbG91ZHdhdGNoLWxvZ2dpbmctJyArIGlkeCwgdmFsKS5ub2RlLmFkZERlcGVuZGVuY3kobmFtZXNwYWNlKTtcbiAgICB9KTtcblxuXG4gIH1cblxuICBkZXBsb3lNb25pdG9yaW5nKCkge1xuXG4gICAgLy8geWFtbFxuICAgIGxldCBkYXRhUmVzdWx0OiBSZWNvcmQ8c3RyaW5nLCBvYmplY3Q+W10gPSBbXTtcbiAgICAvLyBjcmVhdGUgbmFtZXNwYWNlXG4gICAgY29uc3QgbmFtZXNwYWNlID0gdGhpcy5la3NDbHVzdGVyLmFkZE1hbmlmZXN0KCdhd3Mtb3RlbC1la3MnLCB7XG4gICAgICBhcGlWZXJzaW9uOiAndjEnLFxuICAgICAga2luZDogJ05hbWVzcGFjZScsXG4gICAgICBtZXRhZGF0YToge1xuICAgICAgICBuYW1lOiAnYXdzLW90ZWwtZWtzJyxcbiAgICAgICAgbGFiZWxzOiB7XG4gICAgICAgICAgJ25hbWUnOiAnYXdzLW90ZWwtZWtzJyxcbiAgICAgICAgfVxuICAgICAgfSxcbiAgICB9KTtcblxuICAgIHRyeSB7XG4gICAgICBjb25zdCBwYXRoID0gcmVxdWlyZSgncGF0aCcpO1xuXG4gICAgICBsZXQgdmFsdWVzWWFtbCA9IGZzLnJlYWRGaWxlU3luYyhwYXRoLmpvaW4oX19kaXJuYW1lLCBgLi9tYW5pZmVzdHMvY2xvdWR3YXRjaC1tb25pdG9yaW5nLnlhbWxgKSk7XG4gICAgICAvLyBSZXBsYWNlIERvbWFpbiBhbmQgbG9hZCBZQU1MXG4gICAgICBsZXQgdmFsdWVzUGFyc2VkID0geWFtbC5sb2FkQWxsKFxuICAgICAgICB2YWx1ZXNZYW1sLnRvU3RyaW5nKClcbiAgICAgICAgLy8gLnJlcGxhY2UobmV3IFJlZ0V4cCgne0NMVVNURVJfTkFNRX0nLCAnZ2knKSwgdGhpcy5la3NDbHVzdGVyLmNsdXN0ZXJOYW1lKVxuICAgICAgICAvLyAucmVwbGFjZShuZXcgUmVnRXhwKCd7Q0xVU1RFUl9SRUdJT059JywgJ2dpJyksIEF3cy5SRUdJT04pLFxuICAgICAgKTtcbiAgICAgIGlmICh0eXBlb2YgdmFsdWVzUGFyc2VkID09PSAnb2JqZWN0JyAmJiB2YWx1ZXNQYXJzZWQgIT09IG51bGwpIHtcbiAgICAgICAgZGF0YVJlc3VsdCA9IHZhbHVlc1BhcnNlZCBhcyBSZWNvcmQ8c3RyaW5nLCBvYmplY3Q+W107XG4gICAgICB9XG4gICAgfSBjYXRjaCAoZXhjZXB0aW9uKSB7XG4gICAgICAvLyBwYXNzXG4gICAgICBjb25zb2xlLmVycm9yKFwiID4gRmFpbGVkIHRvIGxvYWQgJ2Nsb3Vkd2F0Y2gtbW9uaXRvcmluZy55YW1sJyBmb3IgJ2Nsb3Vkd2F0Y2gtbW9uaXRvcmluZycgZGVwbG95Li4uXCIpO1xuICAgICAgY29uc29sZS5lcnJvcihleGNlcHRpb24pO1xuICAgIH1cblxuICAgIC8vIEluc3RhbGwgbWFuaWZlc3QgYnkgaXRlcmF0aW5nIG92ZXIgYWxsIGNoYXJ0c1xuICAgIGRhdGFSZXN1bHQuZm9yRWFjaCgodmFsLCBpZHgpID0+IHtcbiAgICAgIHRoaXMuZWtzQ2x1c3Rlci5hZGRNYW5pZmVzdCgnY2xvdWR3YXRjaC1tb25pdG9yaW5nLScgKyBpZHgsIHZhbCkubm9kZS5hZGREZXBlbmRlbmN5KG5hbWVzcGFjZSk7XG4gICAgfSk7XG5cblxuICB9XG5cbn0iXX0=
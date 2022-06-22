"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HelmChartStack = void 0;
const eks = require("aws-cdk-lib/aws-eks");
const cdk = require("aws-cdk-lib");
const ssm = require("aws-cdk-lib/aws-ssm");
class HelmChartStack extends cdk.Stack {
    constructor(scope, id, props) {
        super(scope, id, props);
        this.installHelmChart();
    }
    installHelmChart() {
        let role = "";
        if (this.config.kubectlRoleSSM) {
            let role = ssm.StringParameter.valueFromLookup(this, this.config.kubectlRoleSSM);
        }
        else {
            role = this.config.kubectlRoleArn;
        }
        const cluster = eks.Cluster.fromClusterAttributes(this, `${this.config.clusterName}Ref`, {
            clusterName: this.config.clusterName,
            kubectlRoleArn: role
        });
        cluster.addHelmChart(this.config.chart.name, {
            chart: this.config.chart.chart,
            namespace: this.config.chart.namespace,
            repository: this.config.chart.repository,
            values: this.config.chart.values,
            release: this.config.chart.release,
            version: this.config.chart.version,
            createNamespace: this.config.chart.createNamespace,
        });
    }
}
exports.HelmChartStack = HelmChartStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaGVsbS1jaGFydC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImhlbG0tY2hhcnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsMkNBQTRDO0FBQzVDLG1DQUFvQztBQUNwQywyQ0FBNEM7QUFLNUMsTUFBYSxjQUFlLFNBQVEsR0FBRyxDQUFDLEtBQUs7SUFJM0MsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxLQUFzQjtRQUM5RCxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUV4QixJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztJQUMxQixDQUFDO0lBRUQsZ0JBQWdCO1FBRWQsSUFBSSxJQUFJLEdBQUcsRUFBRSxDQUFBO1FBRWIsSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLGNBQWMsRUFBRTtZQUM5QixJQUFJLElBQUksR0FBRyxHQUFHLENBQUMsZUFBZSxDQUFDLGVBQWUsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxjQUFlLENBQUMsQ0FBQTtTQUNsRjthQUFNO1lBQ0wsSUFBSSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsY0FBZSxDQUFBO1NBQ25DO1FBRUQsTUFBTSxPQUFPLEdBQUcsR0FBRyxDQUFDLE9BQU8sQ0FBQyxxQkFBcUIsQ0FBQyxJQUFJLEVBQUUsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLFdBQVcsS0FBSyxFQUFFO1lBQ3ZGLFdBQVcsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLFdBQVc7WUFDcEMsY0FBYyxFQUFFLElBQUk7U0FDckIsQ0FBQyxDQUFBO1FBRUYsT0FBTyxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUU7WUFDM0MsS0FBSyxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLEtBQUs7WUFDOUIsU0FBUyxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLFNBQVM7WUFDdEMsVUFBVSxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLFVBQVU7WUFDeEMsTUFBTSxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLE1BQU07WUFDaEMsT0FBTyxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLE9BQU87WUFDbEMsT0FBTyxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLE9BQU87WUFDbEMsZUFBZSxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLGVBQWU7U0FDbkQsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztDQUNGO0FBbkNELHdDQW1DQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBla3MgPSByZXF1aXJlKCdhd3MtY2RrLWxpYi9hd3MtZWtzJyk7XG5pbXBvcnQgY2RrID0gcmVxdWlyZSgnYXdzLWNkay1saWInKTtcbmltcG9ydCBzc20gPSByZXF1aXJlKCdhd3MtY2RrLWxpYi9hd3Mtc3NtJyk7XG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tICdjb25zdHJ1Y3RzJztcbmltcG9ydCB7IEhlbG1TdGFja1Byb3BzIH0gZnJvbSAnLi4vLi4vaW50ZXJmYWNlcy9saWIvZWtzL2ludGVyZmFjZXMnO1xuXG5cbmV4cG9ydCBjbGFzcyBIZWxtQ2hhcnRTdGFjayBleHRlbmRzIGNkay5TdGFjayB7XG5cbiAgY29uZmlnOiBIZWxtU3RhY2tQcm9wc1xuXG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcsIHByb3BzPzogY2RrLlN0YWNrUHJvcHMpIHtcbiAgICBzdXBlcihzY29wZSwgaWQsIHByb3BzKTtcblxuICAgIHRoaXMuaW5zdGFsbEhlbG1DaGFydCgpO1xuICB9XG5cbiAgaW5zdGFsbEhlbG1DaGFydCgpIHtcblxuICAgIGxldCByb2xlID0gXCJcIlxuXG4gICAgaWYgKHRoaXMuY29uZmlnLmt1YmVjdGxSb2xlU1NNKSB7XG4gICAgICBsZXQgcm9sZSA9IHNzbS5TdHJpbmdQYXJhbWV0ZXIudmFsdWVGcm9tTG9va3VwKHRoaXMsIHRoaXMuY29uZmlnLmt1YmVjdGxSb2xlU1NNISlcbiAgICB9IGVsc2Uge1xuICAgICAgcm9sZSA9IHRoaXMuY29uZmlnLmt1YmVjdGxSb2xlQXJuIVxuICAgIH1cblxuICAgIGNvbnN0IGNsdXN0ZXIgPSBla3MuQ2x1c3Rlci5mcm9tQ2x1c3RlckF0dHJpYnV0ZXModGhpcywgYCR7dGhpcy5jb25maWcuY2x1c3Rlck5hbWV9UmVmYCwge1xuICAgICAgY2x1c3Rlck5hbWU6IHRoaXMuY29uZmlnLmNsdXN0ZXJOYW1lLFxuICAgICAga3ViZWN0bFJvbGVBcm46IHJvbGVcbiAgICB9KVxuXG4gICAgY2x1c3Rlci5hZGRIZWxtQ2hhcnQodGhpcy5jb25maWcuY2hhcnQubmFtZSwge1xuICAgICAgY2hhcnQ6IHRoaXMuY29uZmlnLmNoYXJ0LmNoYXJ0LFxuICAgICAgbmFtZXNwYWNlOiB0aGlzLmNvbmZpZy5jaGFydC5uYW1lc3BhY2UsXG4gICAgICByZXBvc2l0b3J5OiB0aGlzLmNvbmZpZy5jaGFydC5yZXBvc2l0b3J5LFxuICAgICAgdmFsdWVzOiB0aGlzLmNvbmZpZy5jaGFydC52YWx1ZXMsXG4gICAgICByZWxlYXNlOiB0aGlzLmNvbmZpZy5jaGFydC5yZWxlYXNlLFxuICAgICAgdmVyc2lvbjogdGhpcy5jb25maWcuY2hhcnQudmVyc2lvbixcbiAgICAgIGNyZWF0ZU5hbWVzcGFjZTogdGhpcy5jb25maWcuY2hhcnQuY3JlYXRlTmFtZXNwYWNlLFxuICAgIH0pO1xuICB9XG59XG4iXX0=
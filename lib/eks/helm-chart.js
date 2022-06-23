"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HelmChartStack = void 0;
const eks = require("aws-cdk-lib/aws-eks");
const cdk = require("aws-cdk-lib");
const ssm = require("aws-cdk-lib/aws-ssm");
class HelmChartStack extends cdk.Stack {
    constructor(scope, id, props) {
        super(scope, id, props);
        this.config = props;
        this.installHelmChart();
    }
    installHelmChart() {
        // Get role from ssm if specificed or use arn instead
        let role = "";
        if (this.config.kubectlRoleSSM) {
            role = ssm.StringParameter.valueForStringParameter(this, this.config.kubectlRoleSSM);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaGVsbS1jaGFydC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImhlbG0tY2hhcnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsMkNBQTRDO0FBQzVDLG1DQUFvQztBQUNwQywyQ0FBNEM7QUFNNUMsTUFBYSxjQUFlLFNBQVEsR0FBRyxDQUFDLEtBQUs7SUFJM0MsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxLQUFzQjtRQUM5RCxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUV4QixJQUFJLENBQUMsTUFBTSxHQUFHLEtBQU0sQ0FBQTtRQUNwQixJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztJQUMxQixDQUFDO0lBRUQsZ0JBQWdCO1FBQ2QscURBQXFEO1FBQ3JELElBQUksSUFBSSxHQUFHLEVBQUUsQ0FBQTtRQUViLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxjQUFjLEVBQUU7WUFDOUIsSUFBSSxHQUFHLEdBQUcsQ0FBQyxlQUFlLENBQUMsdUJBQXVCLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsY0FBZSxDQUFDLENBQUE7U0FDdEY7YUFBTTtZQUNMLElBQUksR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLGNBQWUsQ0FBQTtTQUNuQztRQUVELE1BQU0sT0FBTyxHQUFHLEdBQUcsQ0FBQyxPQUFPLENBQUMscUJBQXFCLENBQUMsSUFBSSxFQUFFLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxXQUFXLEtBQUssRUFBRTtZQUN2RixXQUFXLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxXQUFXO1lBQ3BDLGNBQWMsRUFBRSxJQUFJO1NBQ3JCLENBQUMsQ0FBQTtRQUVGLE9BQU8sQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFO1lBQzNDLEtBQUssRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxLQUFLO1lBQzlCLFNBQVMsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxTQUFTO1lBQ3RDLFVBQVUsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxVQUFVO1lBQ3hDLE1BQU0sRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxNQUFNO1lBQ2hDLE9BQU8sRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxPQUFPO1lBQ2xDLE9BQU8sRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxPQUFPO1lBQ2xDLGVBQWUsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxlQUFlO1NBQ25ELENBQUMsQ0FBQztJQUNMLENBQUM7Q0FDRjtBQXBDRCx3Q0FvQ0MiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgZWtzID0gcmVxdWlyZSgnYXdzLWNkay1saWIvYXdzLWVrcycpO1xuaW1wb3J0IGNkayA9IHJlcXVpcmUoJ2F3cy1jZGstbGliJyk7XG5pbXBvcnQgc3NtID0gcmVxdWlyZSgnYXdzLWNkay1saWIvYXdzLXNzbScpO1xuaW1wb3J0IHsgQ29uc3RydWN0IH0gZnJvbSAnY29uc3RydWN0cyc7XG5pbXBvcnQgeyBIZWxtU3RhY2tQcm9wcyB9IGZyb20gJy4uLy4uL2ludGVyZmFjZXMvbGliL2Vrcy9pbnRlcmZhY2VzJztcbmltcG9ydCB7IFNlY3JldFZhbHVlIH0gZnJvbSAnYXdzLWNkay1saWInO1xuXG5cbmV4cG9ydCBjbGFzcyBIZWxtQ2hhcnRTdGFjayBleHRlbmRzIGNkay5TdGFjayB7XG5cbiAgY29uZmlnOiBIZWxtU3RhY2tQcm9wc1xuXG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcsIHByb3BzPzogSGVsbVN0YWNrUHJvcHMpIHtcbiAgICBzdXBlcihzY29wZSwgaWQsIHByb3BzKTtcblxuICAgIHRoaXMuY29uZmlnID0gcHJvcHMhXG4gICAgdGhpcy5pbnN0YWxsSGVsbUNoYXJ0KCk7XG4gIH1cblxuICBpbnN0YWxsSGVsbUNoYXJ0KCkge1xuICAgIC8vIEdldCByb2xlIGZyb20gc3NtIGlmIHNwZWNpZmljZWQgb3IgdXNlIGFybiBpbnN0ZWFkXG4gICAgbGV0IHJvbGUgPSBcIlwiXG5cbiAgICBpZiAodGhpcy5jb25maWcua3ViZWN0bFJvbGVTU00pIHtcbiAgICAgIHJvbGUgPSBzc20uU3RyaW5nUGFyYW1ldGVyLnZhbHVlRm9yU3RyaW5nUGFyYW1ldGVyKHRoaXMsIHRoaXMuY29uZmlnLmt1YmVjdGxSb2xlU1NNISlcbiAgICB9IGVsc2Uge1xuICAgICAgcm9sZSA9IHRoaXMuY29uZmlnLmt1YmVjdGxSb2xlQXJuIVxuICAgIH1cblxuICAgIGNvbnN0IGNsdXN0ZXIgPSBla3MuQ2x1c3Rlci5mcm9tQ2x1c3RlckF0dHJpYnV0ZXModGhpcywgYCR7dGhpcy5jb25maWcuY2x1c3Rlck5hbWV9UmVmYCwge1xuICAgICAgY2x1c3Rlck5hbWU6IHRoaXMuY29uZmlnLmNsdXN0ZXJOYW1lLFxuICAgICAga3ViZWN0bFJvbGVBcm46IHJvbGVcbiAgICB9KVxuXG4gICAgY2x1c3Rlci5hZGRIZWxtQ2hhcnQodGhpcy5jb25maWcuY2hhcnQubmFtZSwge1xuICAgICAgY2hhcnQ6IHRoaXMuY29uZmlnLmNoYXJ0LmNoYXJ0LFxuICAgICAgbmFtZXNwYWNlOiB0aGlzLmNvbmZpZy5jaGFydC5uYW1lc3BhY2UsXG4gICAgICByZXBvc2l0b3J5OiB0aGlzLmNvbmZpZy5jaGFydC5yZXBvc2l0b3J5LFxuICAgICAgdmFsdWVzOiB0aGlzLmNvbmZpZy5jaGFydC52YWx1ZXMsXG4gICAgICByZWxlYXNlOiB0aGlzLmNvbmZpZy5jaGFydC5yZWxlYXNlLFxuICAgICAgdmVyc2lvbjogdGhpcy5jb25maWcuY2hhcnQudmVyc2lvbixcbiAgICAgIGNyZWF0ZU5hbWVzcGFjZTogdGhpcy5jb25maWcuY2hhcnQuY3JlYXRlTmFtZXNwYWNlLFxuICAgIH0pO1xuICB9XG59XG4iXX0=
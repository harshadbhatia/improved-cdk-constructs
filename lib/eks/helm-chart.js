"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HelmChartStack = void 0;
const eks = require("aws-cdk-lib/aws-eks");
const cdk = require("aws-cdk-lib");
const aws_eks_1 = require("aws-cdk-lib/aws-eks");
class HelmChartStack extends cdk.Stack {
    constructor(scope, id, chart, clusterName, kubectlRoleArn, props) {
        super(scope, id, props);
        this.chart = chart;
        this.installHelmChart(clusterName, kubectlRoleArn);
    }
    installHelmChart(clusterName, kubectlRoleArn) {
        const cluster = eks.Cluster.fromClusterAttributes(this, `${clusterName}Ref`, {
            clusterName: clusterName,
            kubectlRoleArn: kubectlRoleArn
        });
        const helmChart = new aws_eks_1.HelmChart(this, this.chart.name, {
            chart: this.chart.chart,
            cluster: cluster,
            namespace: this.chart.namespace,
            repository: this.chart.repository,
            values: this.chart.values,
            release: this.chart.release,
            version: this.chart.version,
            createNamespace: this.chart.createNamespace,
        });
    }
}
exports.HelmChartStack = HelmChartStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaGVsbS1jaGFydC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImhlbG0tY2hhcnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsMkNBQTRDO0FBQzVDLG1DQUFvQztBQUNwQyxpREFBZ0Q7QUFJaEQsTUFBYSxjQUFlLFNBQVEsR0FBRyxDQUFDLEtBQUs7SUFHM0MsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxLQUFlLEVBQUUsV0FBbUIsRUFBRSxjQUFzQixFQUFFLEtBQXNCO1FBQzVILEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBRXhCLElBQUksQ0FBQyxLQUFLLEdBQUcsS0FBSyxDQUFDO1FBQ25CLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxXQUFXLEVBQUUsY0FBYyxDQUFDLENBQUM7SUFDckQsQ0FBQztJQUVELGdCQUFnQixDQUFDLFdBQW1CLEVBQUUsY0FBc0I7UUFFMUQsTUFBTSxPQUFPLEdBQUcsR0FBRyxDQUFDLE9BQU8sQ0FBQyxxQkFBcUIsQ0FBQyxJQUFJLEVBQUUsR0FBRyxXQUFXLEtBQUssRUFBRTtZQUMzRSxXQUFXLEVBQUUsV0FBVztZQUN4QixjQUFjLEVBQUUsY0FBYztTQUMvQixDQUFDLENBQUE7UUFFRixNQUFNLFNBQVMsR0FBRyxJQUFJLG1CQUFTLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFO1lBQ3JELEtBQUssRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUs7WUFDdkIsT0FBTyxFQUFFLE9BQU87WUFDaEIsU0FBUyxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsU0FBUztZQUMvQixVQUFVLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxVQUFVO1lBQ2pDLE1BQU0sRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU07WUFDekIsT0FBTyxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTztZQUMzQixPQUFPLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPO1lBQzNCLGVBQWUsRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLGVBQWU7U0FDNUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztDQUNGO0FBNUJELHdDQTRCQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBla3MgPSByZXF1aXJlKCdhd3MtY2RrLWxpYi9hd3MtZWtzJyk7XG5pbXBvcnQgY2RrID0gcmVxdWlyZSgnYXdzLWNkay1saWInKTtcbmltcG9ydCB7IEhlbG1DaGFydCB9IGZyb20gJ2F3cy1jZGstbGliL2F3cy1la3MnO1xuaW1wb3J0IHsgQ29uc3RydWN0IH0gZnJvbSAnY29uc3RydWN0cyc7XG5pbXBvcnQgeyBFS1NDaGFydCB9IGZyb20gJy4uLy4uL2ludGVyZmFjZXMvbGliL2Vrcy9pbnRlcmZhY2VzJztcblxuZXhwb3J0IGNsYXNzIEhlbG1DaGFydFN0YWNrIGV4dGVuZHMgY2RrLlN0YWNrIHtcbiAgY2hhcnQ6IEVLU0NoYXJ0O1xuXG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcsIGNoYXJ0OiBFS1NDaGFydCwgY2x1c3Rlck5hbWU6IHN0cmluZywga3ViZWN0bFJvbGVBcm46IHN0cmluZywgcHJvcHM/OiBjZGsuU3RhY2tQcm9wcykge1xuICAgIHN1cGVyKHNjb3BlLCBpZCwgcHJvcHMpO1xuXG4gICAgdGhpcy5jaGFydCA9IGNoYXJ0O1xuICAgIHRoaXMuaW5zdGFsbEhlbG1DaGFydChjbHVzdGVyTmFtZSwga3ViZWN0bFJvbGVBcm4pO1xuICB9XG5cbiAgaW5zdGFsbEhlbG1DaGFydChjbHVzdGVyTmFtZTogc3RyaW5nLCBrdWJlY3RsUm9sZUFybjogc3RyaW5nKSB7XG5cbiAgICBjb25zdCBjbHVzdGVyID0gZWtzLkNsdXN0ZXIuZnJvbUNsdXN0ZXJBdHRyaWJ1dGVzKHRoaXMsIGAke2NsdXN0ZXJOYW1lfVJlZmAsIHtcbiAgICAgIGNsdXN0ZXJOYW1lOiBjbHVzdGVyTmFtZSxcbiAgICAgIGt1YmVjdGxSb2xlQXJuOiBrdWJlY3RsUm9sZUFyblxuICAgIH0pXG5cbiAgICBjb25zdCBoZWxtQ2hhcnQgPSBuZXcgSGVsbUNoYXJ0KHRoaXMsIHRoaXMuY2hhcnQubmFtZSwge1xuICAgICAgY2hhcnQ6IHRoaXMuY2hhcnQuY2hhcnQsXG4gICAgICBjbHVzdGVyOiBjbHVzdGVyLFxuICAgICAgbmFtZXNwYWNlOiB0aGlzLmNoYXJ0Lm5hbWVzcGFjZSxcbiAgICAgIHJlcG9zaXRvcnk6IHRoaXMuY2hhcnQucmVwb3NpdG9yeSxcbiAgICAgIHZhbHVlczogdGhpcy5jaGFydC52YWx1ZXMsXG4gICAgICByZWxlYXNlOiB0aGlzLmNoYXJ0LnJlbGVhc2UsXG4gICAgICB2ZXJzaW9uOiB0aGlzLmNoYXJ0LnZlcnNpb24sXG4gICAgICBjcmVhdGVOYW1lc3BhY2U6IHRoaXMuY2hhcnQuY3JlYXRlTmFtZXNwYWNlLFxuICAgIH0pO1xuICB9XG59XG4iXX0=
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AwsLoadBalancerController = void 0;
const iam = require("aws-cdk-lib/aws-iam");
const aws_cdk_lib_1 = require("aws-cdk-lib");
const aws_load_balancer_controller_2_4_2_json_1 = __importDefault(require("../policies/aws-load-balancer-controller-2.4.2.json"));
class AwsLoadBalancerController extends aws_cdk_lib_1.Stack {
    constructor(scope, id, cluster, props) {
        super(scope, id, props);
        if (props === null || props === void 0 ? void 0 : props.installIAM) {
            this.createPolicyAndSA(scope, cluster);
        }
        if (props === null || props === void 0 ? void 0 : props.installHelm) {
            this.installHelmChart(cluster);
        }
    }
    createPolicyAndSA(scope, cluster) {
        let svcAccount = cluster.addServiceAccount('aws-load-balancer-controller', {
            name: 'aws-load-balancer-controller',
            namespace: 'kube-system',
        });
        const iamPolicy = new iam.Policy(scope, 'AWSLoadBalancerControllerIAMPolicy', {
            policyName: 'AwsLoadBalancerControllerIAMPolicy',
            document: iam.PolicyDocument.fromJson(aws_load_balancer_controller_2_4_2_json_1.default),
        });
        svcAccount.role.attachInlinePolicy(iamPolicy);
    }
    installHelmChart(cluster) {
        // Install Load Balancer Controller
        cluster.addHelmChart('aws-load-balancer-controller', {
            release: 'aws-load-balancer-controller',
            repository: 'https://aws.github.io/eks-charts',
            chart: 'aws-load-balancer-controller',
            namespace: 'kube-system',
            version: '1.4.3',
            values: {
                'clusterName': cluster.clusterName,
                'serviceAccount': {
                    'create': false,
                    'name': 'aws-load-balancer-controller',
                }
            },
        });
    }
}
exports.AwsLoadBalancerController = AwsLoadBalancerController;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9hZC1iYWxhbmNlci1jb250cm9sbGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsibG9hZC1iYWxhbmNlci1jb250cm9sbGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7OztBQUVBLDJDQUE0QztBQUM1Qyw2Q0FBZ0Q7QUFFaEQsa0lBQW1FO0FBUW5FLE1BQWEseUJBQTBCLFNBQVEsbUJBQUs7SUFHbEQsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxPQUFnQixFQUFFLEtBQXNDO1FBQ2hHLEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBRXhCLElBQUksS0FBSyxhQUFMLEtBQUssdUJBQUwsS0FBSyxDQUFFLFVBQVUsRUFBRTtZQUNyQixJQUFJLENBQUMsaUJBQWlCLENBQUMsS0FBSyxFQUFFLE9BQU8sQ0FBQyxDQUFDO1NBQ3hDO1FBRUQsSUFBSSxLQUFLLGFBQUwsS0FBSyx1QkFBTCxLQUFLLENBQUUsV0FBVyxFQUFFO1lBQ3RCLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxPQUFPLENBQUMsQ0FBQztTQUNoQztJQUVILENBQUM7SUFFRCxpQkFBaUIsQ0FBQyxLQUFnQixFQUFFLE9BQWdCO1FBQ2xELElBQUksVUFBVSxHQUFHLE9BQU8sQ0FBQyxpQkFBaUIsQ0FBQyw4QkFBOEIsRUFBRTtZQUN6RSxJQUFJLEVBQUUsOEJBQThCO1lBQ3BDLFNBQVMsRUFBRSxhQUFhO1NBQ3pCLENBQUMsQ0FBQztRQUdILE1BQU0sU0FBUyxHQUFHLElBQUksR0FBRyxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUUsb0NBQW9DLEVBQUU7WUFDNUUsVUFBVSxFQUFFLG9DQUFvQztZQUNoRCxRQUFRLEVBQUUsR0FBRyxDQUFDLGNBQWMsQ0FBQyxRQUFRLENBQUMsaURBQUMsQ0FBQztTQUN6QyxDQUFDLENBQUM7UUFFSCxVQUFVLENBQUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLFNBQVMsQ0FBQyxDQUFDO0lBQ2hELENBQUM7SUFFRCxnQkFBZ0IsQ0FBQyxPQUFnQjtRQUMvQixtQ0FBbUM7UUFDbkMsT0FBTyxDQUFDLFlBQVksQ0FBQyw4QkFBOEIsRUFBRTtZQUNuRCxPQUFPLEVBQUUsOEJBQThCO1lBQ3ZDLFVBQVUsRUFBRSxrQ0FBa0M7WUFDOUMsS0FBSyxFQUFFLDhCQUE4QjtZQUNyQyxTQUFTLEVBQUUsYUFBYTtZQUN4QixPQUFPLEVBQUUsT0FBTztZQUNoQixNQUFNLEVBQUU7Z0JBQ04sYUFBYSxFQUFFLE9BQU8sQ0FBQyxXQUFXO2dCQUNsQyxnQkFBZ0IsRUFBRTtvQkFDaEIsUUFBUSxFQUFFLEtBQUs7b0JBQ2YsTUFBTSxFQUFFLDhCQUE4QjtpQkFDdkM7YUFDRjtTQUNGLENBQUMsQ0FBQTtJQUNKLENBQUM7Q0FFRjtBQWpERCw4REFpREMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBDbHVzdGVyIH0gZnJvbSAnYXdzLWNkay1saWIvYXdzLWVrcyc7XG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tIFwiY29uc3RydWN0c1wiO1xuaW1wb3J0IGlhbSA9IHJlcXVpcmUoJ2F3cy1jZGstbGliL2F3cy1pYW0nKTtcbmltcG9ydCB7IFN0YWNrLCBTdGFja1Byb3BzIH0gZnJvbSAnYXdzLWNkay1saWInO1xuXG5pbXBvcnQgcCBmcm9tICcuLi9wb2xpY2llcy9hd3MtbG9hZC1iYWxhbmNlci1jb250cm9sbGVyLTIuNC4yLmpzb24nXG5cbmV4cG9ydCBpbnRlcmZhY2UgQXdzTG9hZEJhbGFuY2VyQ29udHJvbGxlclByb3BzIGV4dGVuZHMgU3RhY2tQcm9wcyB7XG4gIGVuYWJsZWQ6IGJvb2xlYW5cbiAgaW5zdGFsbElBTTogYm9vbGVhbjtcbiAgaW5zdGFsbEhlbG06IGJvb2xlYW47XG59XG5cbmV4cG9ydCBjbGFzcyBBd3NMb2FkQmFsYW5jZXJDb250cm9sbGVyIGV4dGVuZHMgU3RhY2sge1xuICBib2R5OiBDb25zdHJ1Y3Q7XG5cbiAgY29uc3RydWN0b3Ioc2NvcGU6IENvbnN0cnVjdCwgaWQ6IHN0cmluZywgY2x1c3RlcjogQ2x1c3RlciwgcHJvcHM/OiBBd3NMb2FkQmFsYW5jZXJDb250cm9sbGVyUHJvcHMpIHtcbiAgICBzdXBlcihzY29wZSwgaWQsIHByb3BzKTtcblxuICAgIGlmIChwcm9wcz8uaW5zdGFsbElBTSkge1xuICAgICAgdGhpcy5jcmVhdGVQb2xpY3lBbmRTQShzY29wZSwgY2x1c3Rlcik7XG4gICAgfVxuXG4gICAgaWYgKHByb3BzPy5pbnN0YWxsSGVsbSkge1xuICAgICAgdGhpcy5pbnN0YWxsSGVsbUNoYXJ0KGNsdXN0ZXIpO1xuICAgIH1cblxuICB9XG5cbiAgY3JlYXRlUG9saWN5QW5kU0Eoc2NvcGU6IENvbnN0cnVjdCwgY2x1c3RlcjogQ2x1c3Rlcikge1xuICAgIGxldCBzdmNBY2NvdW50ID0gY2x1c3Rlci5hZGRTZXJ2aWNlQWNjb3VudCgnYXdzLWxvYWQtYmFsYW5jZXItY29udHJvbGxlcicsIHtcbiAgICAgIG5hbWU6ICdhd3MtbG9hZC1iYWxhbmNlci1jb250cm9sbGVyJyxcbiAgICAgIG5hbWVzcGFjZTogJ2t1YmUtc3lzdGVtJyxcbiAgICB9KTtcblxuXG4gICAgY29uc3QgaWFtUG9saWN5ID0gbmV3IGlhbS5Qb2xpY3koc2NvcGUsICdBV1NMb2FkQmFsYW5jZXJDb250cm9sbGVySUFNUG9saWN5Jywge1xuICAgICAgcG9saWN5TmFtZTogJ0F3c0xvYWRCYWxhbmNlckNvbnRyb2xsZXJJQU1Qb2xpY3knLFxuICAgICAgZG9jdW1lbnQ6IGlhbS5Qb2xpY3lEb2N1bWVudC5mcm9tSnNvbihwKSxcbiAgICB9KTtcblxuICAgIHN2Y0FjY291bnQucm9sZS5hdHRhY2hJbmxpbmVQb2xpY3koaWFtUG9saWN5KTtcbiAgfVxuXG4gIGluc3RhbGxIZWxtQ2hhcnQoY2x1c3RlcjogQ2x1c3Rlcikge1xuICAgIC8vIEluc3RhbGwgTG9hZCBCYWxhbmNlciBDb250cm9sbGVyXG4gICAgY2x1c3Rlci5hZGRIZWxtQ2hhcnQoJ2F3cy1sb2FkLWJhbGFuY2VyLWNvbnRyb2xsZXInLCB7XG4gICAgICByZWxlYXNlOiAnYXdzLWxvYWQtYmFsYW5jZXItY29udHJvbGxlcicsXG4gICAgICByZXBvc2l0b3J5OiAnaHR0cHM6Ly9hd3MuZ2l0aHViLmlvL2Vrcy1jaGFydHMnLFxuICAgICAgY2hhcnQ6ICdhd3MtbG9hZC1iYWxhbmNlci1jb250cm9sbGVyJyxcbiAgICAgIG5hbWVzcGFjZTogJ2t1YmUtc3lzdGVtJyxcbiAgICAgIHZlcnNpb246ICcxLjQuMycsXG4gICAgICB2YWx1ZXM6IHtcbiAgICAgICAgJ2NsdXN0ZXJOYW1lJzogY2x1c3Rlci5jbHVzdGVyTmFtZSxcbiAgICAgICAgJ3NlcnZpY2VBY2NvdW50Jzoge1xuICAgICAgICAgICdjcmVhdGUnOiBmYWxzZSxcbiAgICAgICAgICAnbmFtZSc6ICdhd3MtbG9hZC1iYWxhbmNlci1jb250cm9sbGVyJyxcbiAgICAgICAgfVxuICAgICAgfSxcbiAgICB9KVxuICB9XG5cbn0iXX0=
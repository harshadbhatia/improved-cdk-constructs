"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AwsLoadBalancerController = void 0;
const axios_1 = __importDefault(require("axios"));
const iam = require("aws-cdk-lib/aws-iam");
const aws_cdk_lib_1 = require("aws-cdk-lib");
class AwsLoadBalancerController extends aws_cdk_lib_1.NestedStack {
    constructor(scope, id, cluster) {
        super(scope, id);
        const url = "https://raw.githubusercontent.com/kubernetes-sigs/aws-load-balancer-controller/v2.3.0/docs/install/iam_policy.json";
        axios_1.default.get(url).then(response => {
            const iamPolicyDocument = response.data;
            // Create Kubernetes ServiceAccount
            let svcAccount = cluster.addServiceAccount('aws-load-balancer-controller', {
                name: 'aws-load-balancer-controller',
                namespace: 'kube-system',
            });
            const iamPolicy = new iam.Policy(scope, 'AWSLoadBalancerControllerIAMPolicy', {
                policyName: 'AwsoadBalancerControllerIAMPolicy',
                document: iam.PolicyDocument.fromJson(iamPolicyDocument),
            });
            svcAccount.role.attachInlinePolicy(iamPolicy);
            // Install Load Balancer Controller
            this.body = cluster.addHelmChart('aws-load-balancer-controller', {
                release: 'aws-load-balancer-controller',
                repository: 'https://aws.github.io/eks-charts',
                chart: 'aws-load-balancer-controller',
                namespace: 'kube-system',
                values: {
                    'clusterName': cluster.clusterName,
                    'serviceAccount': {
                        'create': false,
                        'name': 'aws-load-balancer-controller',
                    }
                },
            });
        });
    }
}
exports.AwsLoadBalancerController = AwsLoadBalancerController;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9hZC1iYWxhbmNlci1jb250cm9sbGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsibG9hZC1iYWxhbmNlci1jb250cm9sbGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7OztBQUNBLGtEQUEwQjtBQUUxQiwyQ0FBNEM7QUFDNUMsNkNBQTBDO0FBRTFDLE1BQWEseUJBQTBCLFNBQVEseUJBQVc7SUFHeEQsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxPQUFnQjtRQUN4RCxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBRWpCLE1BQU0sR0FBRyxHQUFHLG9IQUFvSCxDQUFBO1FBR2hJLGVBQUssQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxFQUFFO1lBRTdCLE1BQU0saUJBQWlCLEdBQUcsUUFBUSxDQUFDLElBQUksQ0FBQTtZQUN2QyxtQ0FBbUM7WUFDbkMsSUFBSSxVQUFVLEdBQUcsT0FBTyxDQUFDLGlCQUFpQixDQUFDLDhCQUE4QixFQUFFO2dCQUN6RSxJQUFJLEVBQUUsOEJBQThCO2dCQUNwQyxTQUFTLEVBQUUsYUFBYTthQUN6QixDQUFDLENBQUM7WUFFSCxNQUFNLFNBQVMsR0FBRyxJQUFJLEdBQUcsQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFFLG9DQUFvQyxFQUFFO2dCQUM1RSxVQUFVLEVBQUUsbUNBQW1DO2dCQUMvQyxRQUFRLEVBQUUsR0FBRyxDQUFDLGNBQWMsQ0FBQyxRQUFRLENBQUMsaUJBQWlCLENBQUM7YUFFekQsQ0FBQyxDQUFDO1lBRUgsVUFBVSxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxTQUFTLENBQUMsQ0FBQztZQUU5QyxtQ0FBbUM7WUFDbkMsSUFBSSxDQUFDLElBQUksR0FBRyxPQUFPLENBQUMsWUFBWSxDQUFDLDhCQUE4QixFQUFFO2dCQUMvRCxPQUFPLEVBQUUsOEJBQThCO2dCQUN2QyxVQUFVLEVBQUUsa0NBQWtDO2dCQUM5QyxLQUFLLEVBQUUsOEJBQThCO2dCQUNyQyxTQUFTLEVBQUUsYUFBYTtnQkFDeEIsTUFBTSxFQUFFO29CQUNOLGFBQWEsRUFBRSxPQUFPLENBQUMsV0FBVztvQkFDbEMsZ0JBQWdCLEVBQUU7d0JBQ2hCLFFBQVEsRUFBRSxLQUFLO3dCQUNmLE1BQU0sRUFBRSw4QkFBOEI7cUJBQ3ZDO2lCQUNGO2FBQ0YsQ0FBQyxDQUFBO1FBQ0osQ0FBQyxDQUFDLENBQUE7SUFFSixDQUFDO0NBRUY7QUE1Q0QsOERBNENDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQ2x1c3RlciB9IGZyb20gJ2F3cy1jZGstbGliL2F3cy1la3MnO1xuaW1wb3J0IGF4aW9zIGZyb20gJ2F4aW9zJztcbmltcG9ydCB7IENvbnN0cnVjdCB9IGZyb20gXCJjb25zdHJ1Y3RzXCI7XG5pbXBvcnQgaWFtID0gcmVxdWlyZSgnYXdzLWNkay1saWIvYXdzLWlhbScpO1xuaW1wb3J0IHsgTmVzdGVkU3RhY2sgfSBmcm9tICdhd3MtY2RrLWxpYic7XG5cbmV4cG9ydCBjbGFzcyBBd3NMb2FkQmFsYW5jZXJDb250cm9sbGVyIGV4dGVuZHMgTmVzdGVkU3RhY2sge1xuICBib2R5OiBDb25zdHJ1Y3Q7XG5cbiAgY29uc3RydWN0b3Ioc2NvcGU6IENvbnN0cnVjdCwgaWQ6IHN0cmluZywgY2x1c3RlcjogQ2x1c3Rlcikge1xuICAgIHN1cGVyKHNjb3BlLCBpZCk7XG5cbiAgICBjb25zdCB1cmwgPSBcImh0dHBzOi8vcmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbS9rdWJlcm5ldGVzLXNpZ3MvYXdzLWxvYWQtYmFsYW5jZXItY29udHJvbGxlci92Mi4zLjAvZG9jcy9pbnN0YWxsL2lhbV9wb2xpY3kuanNvblwiXG5cblxuICAgIGF4aW9zLmdldCh1cmwpLnRoZW4ocmVzcG9uc2UgPT4ge1xuXG4gICAgICBjb25zdCBpYW1Qb2xpY3lEb2N1bWVudCA9IHJlc3BvbnNlLmRhdGFcbiAgICAgIC8vIENyZWF0ZSBLdWJlcm5ldGVzIFNlcnZpY2VBY2NvdW50XG4gICAgICBsZXQgc3ZjQWNjb3VudCA9IGNsdXN0ZXIuYWRkU2VydmljZUFjY291bnQoJ2F3cy1sb2FkLWJhbGFuY2VyLWNvbnRyb2xsZXInLCB7XG4gICAgICAgIG5hbWU6ICdhd3MtbG9hZC1iYWxhbmNlci1jb250cm9sbGVyJyxcbiAgICAgICAgbmFtZXNwYWNlOiAna3ViZS1zeXN0ZW0nLFxuICAgICAgfSk7XG5cbiAgICAgIGNvbnN0IGlhbVBvbGljeSA9IG5ldyBpYW0uUG9saWN5KHNjb3BlLCAnQVdTTG9hZEJhbGFuY2VyQ29udHJvbGxlcklBTVBvbGljeScsIHtcbiAgICAgICAgcG9saWN5TmFtZTogJ0F3c29hZEJhbGFuY2VyQ29udHJvbGxlcklBTVBvbGljeScsXG4gICAgICAgIGRvY3VtZW50OiBpYW0uUG9saWN5RG9jdW1lbnQuZnJvbUpzb24oaWFtUG9saWN5RG9jdW1lbnQpLFxuXG4gICAgICB9KTtcblxuICAgICAgc3ZjQWNjb3VudC5yb2xlLmF0dGFjaElubGluZVBvbGljeShpYW1Qb2xpY3kpO1xuXG4gICAgICAvLyBJbnN0YWxsIExvYWQgQmFsYW5jZXIgQ29udHJvbGxlclxuICAgICAgdGhpcy5ib2R5ID0gY2x1c3Rlci5hZGRIZWxtQ2hhcnQoJ2F3cy1sb2FkLWJhbGFuY2VyLWNvbnRyb2xsZXInLCB7XG4gICAgICAgIHJlbGVhc2U6ICdhd3MtbG9hZC1iYWxhbmNlci1jb250cm9sbGVyJyxcbiAgICAgICAgcmVwb3NpdG9yeTogJ2h0dHBzOi8vYXdzLmdpdGh1Yi5pby9la3MtY2hhcnRzJyxcbiAgICAgICAgY2hhcnQ6ICdhd3MtbG9hZC1iYWxhbmNlci1jb250cm9sbGVyJyxcbiAgICAgICAgbmFtZXNwYWNlOiAna3ViZS1zeXN0ZW0nLFxuICAgICAgICB2YWx1ZXM6IHtcbiAgICAgICAgICAnY2x1c3Rlck5hbWUnOiBjbHVzdGVyLmNsdXN0ZXJOYW1lLFxuICAgICAgICAgICdzZXJ2aWNlQWNjb3VudCc6IHtcbiAgICAgICAgICAgICdjcmVhdGUnOiBmYWxzZSxcbiAgICAgICAgICAgICduYW1lJzogJ2F3cy1sb2FkLWJhbGFuY2VyLWNvbnRyb2xsZXInLFxuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgIH0pXG4gICAgfSlcblxuICB9XG5cbn0iXX0=
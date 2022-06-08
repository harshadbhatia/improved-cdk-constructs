"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AwsEFSCSIDriverNested = void 0;
const aws_cdk_lib_1 = require("aws-cdk-lib");
const iam = require("aws-cdk-lib/aws-iam");
class AwsEFSCSIDriverNested extends aws_cdk_lib_1.NestedStack {
    constructor(scope, id, cluster) {
        super(scope, id);
        const iamPolicyDocument = JSON.parse(`{
        "Version": "2012-10-17",
        "Statement": [
          {
            "Effect": "Allow",
            "Action": [
              "elasticfilesystem:DescribeAccessPoints",
              "elasticfilesystem:DescribeFileSystems"
            ],
            "Resource": "*"
          },
          {
            "Effect": "Allow",
            "Action": [
              "elasticfilesystem:CreateAccessPoint"
            ],
            "Resource": "*",
            "Condition": {
              "StringLike": {
                "aws:RequestTag/efs.csi.aws.com/cluster": "true"
              }
            }
          },
          {
            "Effect": "Allow",
            "Action": "elasticfilesystem:DeleteAccessPoint",
            "Resource": "*",
            "Condition": {
              "StringEquals": {
                "aws:ResourceTag/efs.csi.aws.com/cluster": "true"
              }
            }
          }
        ]
      }`);
        // Create Kubernetes ServiceAccount
        let svcAccount = cluster.addServiceAccount('EFSCSISA', {
            name: 'efs-csi-controller-sa',
            namespace: 'kube-system',
        });
        // svcAccount.role.addManagedPolicy(
        //   iam.ManagedPolicy.fromManagedPolicyName(scope, 'EFSCSIPolicy', 'AmazonEKS_EFS_CSI_Driver_Policy'));
        const iamPolicy = new iam.Policy(scope, 'AWSEFSCSIDriverIAMPolicy', {
            policyName: 'AWSEFSCSIDriverIAMPolicy',
            document: iam.PolicyDocument.fromJson(iamPolicyDocument),
        });
        svcAccount.role.attachInlinePolicy(iamPolicy);
        // Install EFS CSI Driver
        // https://docs.aws.amazon.com/eks/latest/userguide/add-ons-images.html
        cluster.addHelmChart('aws-efs-csi-driver', {
            release: 'aws-efs-csi-driver',
            repository: 'https://kubernetes-sigs.github.io/aws-efs-csi-driver/',
            chart: 'aws-efs-csi-driver',
            namespace: 'kube-system',
            version: '2.2.2',
            values: {
                'clusterName': cluster.clusterName,
                'image': {
                    'repository': '602401143452.dkr.ecr.ap-southeast-2.amazonaws.com/eks/aws-efs-csi-driver',
                },
                'controller': {
                    'serviceAccount': {
                        'create': false,
                        'name': 'efs-csi-controller-sa',
                    }
                }
            },
        });
    }
}
exports.AwsEFSCSIDriverNested = AwsEFSCSIDriverNested;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWZzLWNzaS1kcml2ZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJlZnMtY3NpLWRyaXZlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSw2Q0FBMEM7QUFHMUMsMkNBQTRDO0FBRTVDLE1BQWEscUJBQXNCLFNBQVEseUJBQVc7SUFHbEQsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxPQUFnQjtRQUN4RCxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBRWpCLE1BQU0saUJBQWlCLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztRQWtDbkMsQ0FBQyxDQUFBO1FBRUgsbUNBQW1DO1FBQ25DLElBQUksVUFBVSxHQUFHLE9BQU8sQ0FBQyxpQkFBaUIsQ0FBQyxVQUFVLEVBQUU7WUFDckQsSUFBSSxFQUFFLHVCQUF1QjtZQUM3QixTQUFTLEVBQUUsYUFBYTtTQUN6QixDQUFDLENBQUM7UUFFSCxvQ0FBb0M7UUFDcEMsd0dBQXdHO1FBR3hHLE1BQU0sU0FBUyxHQUFHLElBQUksR0FBRyxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUUsMEJBQTBCLEVBQUU7WUFDbEUsVUFBVSxFQUFFLDBCQUEwQjtZQUN0QyxRQUFRLEVBQUUsR0FBRyxDQUFDLGNBQWMsQ0FBQyxRQUFRLENBQUMsaUJBQWlCLENBQUM7U0FDekQsQ0FBRSxDQUFDO1FBR0osVUFBVSxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUU5Qyx5QkFBeUI7UUFDekIsdUVBQXVFO1FBQ3ZFLE9BQU8sQ0FBQyxZQUFZLENBQUMsb0JBQW9CLEVBQUU7WUFDekMsT0FBTyxFQUFFLG9CQUFvQjtZQUM3QixVQUFVLEVBQUUsdURBQXVEO1lBQ25FLEtBQUssRUFBRSxvQkFBb0I7WUFDM0IsU0FBUyxFQUFFLGFBQWE7WUFDeEIsT0FBTyxFQUFFLE9BQU87WUFDaEIsTUFBTSxFQUFFO2dCQUNOLGFBQWEsRUFBRSxPQUFPLENBQUMsV0FBVztnQkFDbEMsT0FBTyxFQUFFO29CQUNQLFlBQVksRUFBRSwwRUFBMEU7aUJBQ3pGO2dCQUNELFlBQVksRUFBRTtvQkFDWixnQkFBZ0IsRUFBRTt3QkFDaEIsUUFBUSxFQUFFLEtBQUs7d0JBQ2YsTUFBTSxFQUFFLHVCQUF1QjtxQkFDaEM7aUJBQ0Y7YUFFRjtTQUNGLENBQUMsQ0FBQTtJQUdKLENBQUM7Q0FDRjtBQXJGSCxzREFxRkciLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBOZXN0ZWRTdGFjayB9IGZyb20gJ2F3cy1jZGstbGliJztcbmltcG9ydCB7IENsdXN0ZXIgfSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtZWtzJztcbmltcG9ydCB7IENvbnN0cnVjdCB9IGZyb20gXCJjb25zdHJ1Y3RzXCI7XG5pbXBvcnQgaWFtID0gcmVxdWlyZSgnYXdzLWNkay1saWIvYXdzLWlhbScpO1xuXG5leHBvcnQgY2xhc3MgQXdzRUZTQ1NJRHJpdmVyTmVzdGVkIGV4dGVuZHMgTmVzdGVkU3RhY2sge1xuICAgIGJvZHk6IENvbnN0cnVjdDtcblxuICAgIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcsIGNsdXN0ZXI6IENsdXN0ZXIpIHtcbiAgICAgIHN1cGVyKHNjb3BlLCBpZCk7XG5cbiAgICAgIGNvbnN0IGlhbVBvbGljeURvY3VtZW50ID0gSlNPTi5wYXJzZShge1xuICAgICAgICBcIlZlcnNpb25cIjogXCIyMDEyLTEwLTE3XCIsXG4gICAgICAgIFwiU3RhdGVtZW50XCI6IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICBcIkVmZmVjdFwiOiBcIkFsbG93XCIsXG4gICAgICAgICAgICBcIkFjdGlvblwiOiBbXG4gICAgICAgICAgICAgIFwiZWxhc3RpY2ZpbGVzeXN0ZW06RGVzY3JpYmVBY2Nlc3NQb2ludHNcIixcbiAgICAgICAgICAgICAgXCJlbGFzdGljZmlsZXN5c3RlbTpEZXNjcmliZUZpbGVTeXN0ZW1zXCJcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBcIlJlc291cmNlXCI6IFwiKlwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICBcIkVmZmVjdFwiOiBcIkFsbG93XCIsXG4gICAgICAgICAgICBcIkFjdGlvblwiOiBbXG4gICAgICAgICAgICAgIFwiZWxhc3RpY2ZpbGVzeXN0ZW06Q3JlYXRlQWNjZXNzUG9pbnRcIlxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIFwiUmVzb3VyY2VcIjogXCIqXCIsXG4gICAgICAgICAgICBcIkNvbmRpdGlvblwiOiB7XG4gICAgICAgICAgICAgIFwiU3RyaW5nTGlrZVwiOiB7XG4gICAgICAgICAgICAgICAgXCJhd3M6UmVxdWVzdFRhZy9lZnMuY3NpLmF3cy5jb20vY2x1c3RlclwiOiBcInRydWVcIlxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICBcIkVmZmVjdFwiOiBcIkFsbG93XCIsXG4gICAgICAgICAgICBcIkFjdGlvblwiOiBcImVsYXN0aWNmaWxlc3lzdGVtOkRlbGV0ZUFjY2Vzc1BvaW50XCIsXG4gICAgICAgICAgICBcIlJlc291cmNlXCI6IFwiKlwiLFxuICAgICAgICAgICAgXCJDb25kaXRpb25cIjoge1xuICAgICAgICAgICAgICBcIlN0cmluZ0VxdWFsc1wiOiB7XG4gICAgICAgICAgICAgICAgXCJhd3M6UmVzb3VyY2VUYWcvZWZzLmNzaS5hd3MuY29tL2NsdXN0ZXJcIjogXCJ0cnVlXCJcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgXVxuICAgICAgfWApXG5cbiAgICAgIC8vIENyZWF0ZSBLdWJlcm5ldGVzIFNlcnZpY2VBY2NvdW50XG4gICAgICBsZXQgc3ZjQWNjb3VudCA9IGNsdXN0ZXIuYWRkU2VydmljZUFjY291bnQoJ0VGU0NTSVNBJywge1xuICAgICAgICBuYW1lOiAnZWZzLWNzaS1jb250cm9sbGVyLXNhJyxcbiAgICAgICAgbmFtZXNwYWNlOiAna3ViZS1zeXN0ZW0nLFxuICAgICAgfSk7XG5cbiAgICAgIC8vIHN2Y0FjY291bnQucm9sZS5hZGRNYW5hZ2VkUG9saWN5KFxuICAgICAgLy8gICBpYW0uTWFuYWdlZFBvbGljeS5mcm9tTWFuYWdlZFBvbGljeU5hbWUoc2NvcGUsICdFRlNDU0lQb2xpY3knLCAnQW1hem9uRUtTX0VGU19DU0lfRHJpdmVyX1BvbGljeScpKTtcblxuXG4gICAgICBjb25zdCBpYW1Qb2xpY3kgPSBuZXcgaWFtLlBvbGljeShzY29wZSwgJ0FXU0VGU0NTSURyaXZlcklBTVBvbGljeScsIHtcbiAgICAgICAgcG9saWN5TmFtZTogJ0FXU0VGU0NTSURyaXZlcklBTVBvbGljeScsXG4gICAgICAgIGRvY3VtZW50OiBpYW0uUG9saWN5RG9jdW1lbnQuZnJvbUpzb24oaWFtUG9saWN5RG9jdW1lbnQpLFxuICAgICAgfSwpO1xuICAgICAgXG5cbiAgICAgIHN2Y0FjY291bnQucm9sZS5hdHRhY2hJbmxpbmVQb2xpY3koaWFtUG9saWN5KTtcblxuICAgICAgLy8gSW5zdGFsbCBFRlMgQ1NJIERyaXZlclxuICAgICAgLy8gaHR0cHM6Ly9kb2NzLmF3cy5hbWF6b24uY29tL2Vrcy9sYXRlc3QvdXNlcmd1aWRlL2FkZC1vbnMtaW1hZ2VzLmh0bWxcbiAgICAgIGNsdXN0ZXIuYWRkSGVsbUNoYXJ0KCdhd3MtZWZzLWNzaS1kcml2ZXInLCB7XG4gICAgICAgIHJlbGVhc2U6ICdhd3MtZWZzLWNzaS1kcml2ZXInLFxuICAgICAgICByZXBvc2l0b3J5OiAnaHR0cHM6Ly9rdWJlcm5ldGVzLXNpZ3MuZ2l0aHViLmlvL2F3cy1lZnMtY3NpLWRyaXZlci8nLFxuICAgICAgICBjaGFydDogJ2F3cy1lZnMtY3NpLWRyaXZlcicsXG4gICAgICAgIG5hbWVzcGFjZTogJ2t1YmUtc3lzdGVtJyxcbiAgICAgICAgdmVyc2lvbjogJzIuMi4yJyxcbiAgICAgICAgdmFsdWVzOiB7XG4gICAgICAgICAgJ2NsdXN0ZXJOYW1lJzogY2x1c3Rlci5jbHVzdGVyTmFtZSxcbiAgICAgICAgICAnaW1hZ2UnOiB7XG4gICAgICAgICAgICAncmVwb3NpdG9yeSc6ICc2MDI0MDExNDM0NTIuZGtyLmVjci5hcC1zb3V0aGVhc3QtMi5hbWF6b25hd3MuY29tL2Vrcy9hd3MtZWZzLWNzaS1kcml2ZXInLFxuICAgICAgICAgIH0sXG4gICAgICAgICAgJ2NvbnRyb2xsZXInOiB7XG4gICAgICAgICAgICAnc2VydmljZUFjY291bnQnOiB7XG4gICAgICAgICAgICAgICdjcmVhdGUnOiBmYWxzZSxcbiAgICAgICAgICAgICAgJ25hbWUnOiAnZWZzLWNzaS1jb250cm9sbGVyLXNhJyxcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgXG4gICAgICAgIH0sXG4gICAgICB9KVxuXG5cbiAgICB9XG4gIH0iXX0=
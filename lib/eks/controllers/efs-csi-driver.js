"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AwsEFSCSIDriver = void 0;
const aws_cdk_lib_1 = require("aws-cdk-lib");
const iam = require("aws-cdk-lib/aws-iam");
class AwsEFSCSIDriver extends aws_cdk_lib_1.NestedStack {
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
    }
    installHelmChart(cluster) {
        // Install EFS CSI Driver
        // https://docs.aws.amazon.com/eks/latest/userguide/add-ons-images.html
        cluster.addHelmChart('aws-efs-csi-driver', {
            release: 'aws-efs-csi-driver',
            repository: 'https://kubernetes-sigs.github.io/aws-efs-csi-driver/',
            chart: 'aws-efs-csi-driver',
            namespace: 'kube-system',
            version: '2.2.6',
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
exports.AwsEFSCSIDriver = AwsEFSCSIDriver;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWZzLWNzaS1kcml2ZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJlZnMtY3NpLWRyaXZlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSw2Q0FBNEQ7QUFHNUQsMkNBQTRDO0FBUTVDLE1BQWEsZUFBZ0IsU0FBUSx5QkFBVztJQUc5QyxZQUFZLEtBQWdCLEVBQUUsRUFBVSxFQUFFLE9BQWdCLEVBQUUsS0FBNEI7UUFDdEYsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFFeEIsSUFBSSxLQUFLLGFBQUwsS0FBSyx1QkFBTCxLQUFLLENBQUUsVUFBVSxFQUFFO1lBQ3JCLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxLQUFLLEVBQUUsT0FBTyxDQUFDLENBQUM7U0FDeEM7UUFFRCxJQUFJLEtBQUssYUFBTCxLQUFLLHVCQUFMLEtBQUssQ0FBRSxXQUFXLEVBQUU7WUFDdEIsSUFBSSxDQUFDLGdCQUFnQixDQUFDLE9BQU8sQ0FBQyxDQUFDO1NBQ2hDO0lBRUgsQ0FBQztJQUVELGlCQUFpQixDQUFDLEtBQWdCLEVBQUUsT0FBZ0I7UUFDbEQsTUFBTSxpQkFBaUIsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O1FBa0NqQyxDQUFDLENBQUE7UUFFTCxtQ0FBbUM7UUFDbkMsSUFBSSxVQUFVLEdBQUcsT0FBTyxDQUFDLGlCQUFpQixDQUFDLFVBQVUsRUFBRTtZQUNyRCxJQUFJLEVBQUUsdUJBQXVCO1lBQzdCLFNBQVMsRUFBRSxhQUFhO1NBQ3pCLENBQUMsQ0FBQztRQUVILG9DQUFvQztRQUNwQyx3R0FBd0c7UUFFeEcsTUFBTSxTQUFTLEdBQUcsSUFBSSxHQUFHLENBQUMsTUFBTSxDQUFDLEtBQUssRUFBRSwwQkFBMEIsRUFBRTtZQUNsRSxVQUFVLEVBQUUsMEJBQTBCO1lBQ3RDLFFBQVEsRUFBRSxHQUFHLENBQUMsY0FBYyxDQUFDLFFBQVEsQ0FBQyxpQkFBaUIsQ0FBQztTQUN6RCxDQUFDLENBQUM7UUFHSCxVQUFVLENBQUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLFNBQVMsQ0FBQyxDQUFDO0lBQ2hELENBQUM7SUFFRCxnQkFBZ0IsQ0FBQyxPQUFnQjtRQUMvQix5QkFBeUI7UUFDekIsdUVBQXVFO1FBQ3ZFLE9BQU8sQ0FBQyxZQUFZLENBQUMsb0JBQW9CLEVBQUU7WUFDekMsT0FBTyxFQUFFLG9CQUFvQjtZQUM3QixVQUFVLEVBQUUsdURBQXVEO1lBQ25FLEtBQUssRUFBRSxvQkFBb0I7WUFDM0IsU0FBUyxFQUFFLGFBQWE7WUFDeEIsT0FBTyxFQUFFLE9BQU87WUFDaEIsTUFBTSxFQUFFO2dCQUNOLGFBQWEsRUFBRSxPQUFPLENBQUMsV0FBVztnQkFDbEMsT0FBTyxFQUFFO29CQUNQLFlBQVksRUFBRSwwRUFBMEU7aUJBQ3pGO2dCQUNELFlBQVksRUFBRTtvQkFDWixnQkFBZ0IsRUFBRTt3QkFDaEIsUUFBUSxFQUFFLEtBQUs7d0JBQ2YsTUFBTSxFQUFFLHVCQUF1QjtxQkFDaEM7aUJBQ0Y7YUFFRjtTQUNGLENBQUMsQ0FBQTtJQUNKLENBQUM7Q0FDRjtBQS9GRCwwQ0ErRkMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBOZXN0ZWRTdGFjaywgTmVzdGVkU3RhY2tQcm9wcyB9IGZyb20gJ2F3cy1jZGstbGliJztcbmltcG9ydCB7IENsdXN0ZXIgfSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtZWtzJztcbmltcG9ydCB7IENvbnN0cnVjdCB9IGZyb20gXCJjb25zdHJ1Y3RzXCI7XG5pbXBvcnQgaWFtID0gcmVxdWlyZSgnYXdzLWNkay1saWIvYXdzLWlhbScpO1xuXG5leHBvcnQgaW50ZXJmYWNlIEF3c0VGU0NTSURyaXZlclByb3BzIGV4dGVuZHMgTmVzdGVkU3RhY2tQcm9wcyB7XG4gIGVuYWJsZWQ6IGJvb2xlYW47XG4gIGluc3RhbGxJQU06IGJvb2xlYW47XG4gIGluc3RhbGxIZWxtOiBib29sZWFuO1xufVxuXG5leHBvcnQgY2xhc3MgQXdzRUZTQ1NJRHJpdmVyIGV4dGVuZHMgTmVzdGVkU3RhY2sge1xuICBib2R5OiBDb25zdHJ1Y3Q7XG5cbiAgY29uc3RydWN0b3Ioc2NvcGU6IENvbnN0cnVjdCwgaWQ6IHN0cmluZywgY2x1c3RlcjogQ2x1c3RlciwgcHJvcHM/OiBBd3NFRlNDU0lEcml2ZXJQcm9wcykge1xuICAgIHN1cGVyKHNjb3BlLCBpZCwgcHJvcHMpO1xuXG4gICAgaWYgKHByb3BzPy5pbnN0YWxsSUFNKSB7XG4gICAgICB0aGlzLmNyZWF0ZVBvbGljeUFuZFNBKHNjb3BlLCBjbHVzdGVyKTtcbiAgICB9XG5cbiAgICBpZiAocHJvcHM/Lmluc3RhbGxIZWxtKSB7XG4gICAgICB0aGlzLmluc3RhbGxIZWxtQ2hhcnQoY2x1c3Rlcik7XG4gICAgfVxuXG4gIH1cblxuICBjcmVhdGVQb2xpY3lBbmRTQShzY29wZTogQ29uc3RydWN0LCBjbHVzdGVyOiBDbHVzdGVyKSB7XG4gICAgY29uc3QgaWFtUG9saWN5RG9jdW1lbnQgPSBKU09OLnBhcnNlKGB7XG4gICAgICAgIFwiVmVyc2lvblwiOiBcIjIwMTItMTAtMTdcIixcbiAgICAgICAgXCJTdGF0ZW1lbnRcIjogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgIFwiRWZmZWN0XCI6IFwiQWxsb3dcIixcbiAgICAgICAgICAgIFwiQWN0aW9uXCI6IFtcbiAgICAgICAgICAgICAgXCJlbGFzdGljZmlsZXN5c3RlbTpEZXNjcmliZUFjY2Vzc1BvaW50c1wiLFxuICAgICAgICAgICAgICBcImVsYXN0aWNmaWxlc3lzdGVtOkRlc2NyaWJlRmlsZVN5c3RlbXNcIlxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIFwiUmVzb3VyY2VcIjogXCIqXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgIFwiRWZmZWN0XCI6IFwiQWxsb3dcIixcbiAgICAgICAgICAgIFwiQWN0aW9uXCI6IFtcbiAgICAgICAgICAgICAgXCJlbGFzdGljZmlsZXN5c3RlbTpDcmVhdGVBY2Nlc3NQb2ludFwiXG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgXCJSZXNvdXJjZVwiOiBcIipcIixcbiAgICAgICAgICAgIFwiQ29uZGl0aW9uXCI6IHtcbiAgICAgICAgICAgICAgXCJTdHJpbmdMaWtlXCI6IHtcbiAgICAgICAgICAgICAgICBcImF3czpSZXF1ZXN0VGFnL2Vmcy5jc2kuYXdzLmNvbS9jbHVzdGVyXCI6IFwidHJ1ZVwiXG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgIFwiRWZmZWN0XCI6IFwiQWxsb3dcIixcbiAgICAgICAgICAgIFwiQWN0aW9uXCI6IFwiZWxhc3RpY2ZpbGVzeXN0ZW06RGVsZXRlQWNjZXNzUG9pbnRcIixcbiAgICAgICAgICAgIFwiUmVzb3VyY2VcIjogXCIqXCIsXG4gICAgICAgICAgICBcIkNvbmRpdGlvblwiOiB7XG4gICAgICAgICAgICAgIFwiU3RyaW5nRXF1YWxzXCI6IHtcbiAgICAgICAgICAgICAgICBcImF3czpSZXNvdXJjZVRhZy9lZnMuY3NpLmF3cy5jb20vY2x1c3RlclwiOiBcInRydWVcIlxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICBdXG4gICAgICB9YClcblxuICAgIC8vIENyZWF0ZSBLdWJlcm5ldGVzIFNlcnZpY2VBY2NvdW50XG4gICAgbGV0IHN2Y0FjY291bnQgPSBjbHVzdGVyLmFkZFNlcnZpY2VBY2NvdW50KCdFRlNDU0lTQScsIHtcbiAgICAgIG5hbWU6ICdlZnMtY3NpLWNvbnRyb2xsZXItc2EnLFxuICAgICAgbmFtZXNwYWNlOiAna3ViZS1zeXN0ZW0nLFxuICAgIH0pO1xuXG4gICAgLy8gc3ZjQWNjb3VudC5yb2xlLmFkZE1hbmFnZWRQb2xpY3koXG4gICAgLy8gICBpYW0uTWFuYWdlZFBvbGljeS5mcm9tTWFuYWdlZFBvbGljeU5hbWUoc2NvcGUsICdFRlNDU0lQb2xpY3knLCAnQW1hem9uRUtTX0VGU19DU0lfRHJpdmVyX1BvbGljeScpKTtcblxuICAgIGNvbnN0IGlhbVBvbGljeSA9IG5ldyBpYW0uUG9saWN5KHNjb3BlLCAnQVdTRUZTQ1NJRHJpdmVySUFNUG9saWN5Jywge1xuICAgICAgcG9saWN5TmFtZTogJ0FXU0VGU0NTSURyaXZlcklBTVBvbGljeScsXG4gICAgICBkb2N1bWVudDogaWFtLlBvbGljeURvY3VtZW50LmZyb21Kc29uKGlhbVBvbGljeURvY3VtZW50KSxcbiAgICB9KTtcblxuXG4gICAgc3ZjQWNjb3VudC5yb2xlLmF0dGFjaElubGluZVBvbGljeShpYW1Qb2xpY3kpO1xuICB9XG5cbiAgaW5zdGFsbEhlbG1DaGFydChjbHVzdGVyOiBDbHVzdGVyKSB7XG4gICAgLy8gSW5zdGFsbCBFRlMgQ1NJIERyaXZlclxuICAgIC8vIGh0dHBzOi8vZG9jcy5hd3MuYW1hem9uLmNvbS9la3MvbGF0ZXN0L3VzZXJndWlkZS9hZGQtb25zLWltYWdlcy5odG1sXG4gICAgY2x1c3Rlci5hZGRIZWxtQ2hhcnQoJ2F3cy1lZnMtY3NpLWRyaXZlcicsIHtcbiAgICAgIHJlbGVhc2U6ICdhd3MtZWZzLWNzaS1kcml2ZXInLFxuICAgICAgcmVwb3NpdG9yeTogJ2h0dHBzOi8va3ViZXJuZXRlcy1zaWdzLmdpdGh1Yi5pby9hd3MtZWZzLWNzaS1kcml2ZXIvJyxcbiAgICAgIGNoYXJ0OiAnYXdzLWVmcy1jc2ktZHJpdmVyJyxcbiAgICAgIG5hbWVzcGFjZTogJ2t1YmUtc3lzdGVtJyxcbiAgICAgIHZlcnNpb246ICcyLjIuNicsXG4gICAgICB2YWx1ZXM6IHtcbiAgICAgICAgJ2NsdXN0ZXJOYW1lJzogY2x1c3Rlci5jbHVzdGVyTmFtZSxcbiAgICAgICAgJ2ltYWdlJzoge1xuICAgICAgICAgICdyZXBvc2l0b3J5JzogJzYwMjQwMTE0MzQ1Mi5ka3IuZWNyLmFwLXNvdXRoZWFzdC0yLmFtYXpvbmF3cy5jb20vZWtzL2F3cy1lZnMtY3NpLWRyaXZlcicsXG4gICAgICAgIH0sXG4gICAgICAgICdjb250cm9sbGVyJzoge1xuICAgICAgICAgICdzZXJ2aWNlQWNjb3VudCc6IHtcbiAgICAgICAgICAgICdjcmVhdGUnOiBmYWxzZSxcbiAgICAgICAgICAgICduYW1lJzogJ2Vmcy1jc2ktY29udHJvbGxlci1zYScsXG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgIH0sXG4gICAgfSlcbiAgfVxufSJdfQ==
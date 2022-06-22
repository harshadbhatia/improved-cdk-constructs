"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AwsEFSCSIDriver = void 0;
const aws_cdk_lib_1 = require("aws-cdk-lib");
const iam = require("aws-cdk-lib/aws-iam");
class AwsEFSCSIDriver extends aws_cdk_lib_1.NestedStack {
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
exports.AwsEFSCSIDriver = AwsEFSCSIDriver;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWZzLWNzaS1kcml2ZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJlZnMtY3NpLWRyaXZlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSw2Q0FBMEM7QUFHMUMsMkNBQTRDO0FBRTVDLE1BQWEsZUFBZ0IsU0FBUSx5QkFBVztJQUc5QyxZQUFZLEtBQWdCLEVBQUUsRUFBVSxFQUFFLE9BQWdCO1FBQ3hELEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFFakIsTUFBTSxpQkFBaUIsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O1FBa0NqQyxDQUFDLENBQUE7UUFFTCxtQ0FBbUM7UUFDbkMsSUFBSSxVQUFVLEdBQUcsT0FBTyxDQUFDLGlCQUFpQixDQUFDLFVBQVUsRUFBRTtZQUNyRCxJQUFJLEVBQUUsdUJBQXVCO1lBQzdCLFNBQVMsRUFBRSxhQUFhO1NBQ3pCLENBQUMsQ0FBQztRQUVILG9DQUFvQztRQUNwQyx3R0FBd0c7UUFFeEcsTUFBTSxTQUFTLEdBQUcsSUFBSSxHQUFHLENBQUMsTUFBTSxDQUFDLEtBQUssRUFBRSwwQkFBMEIsRUFBRTtZQUNsRSxVQUFVLEVBQUUsMEJBQTBCO1lBQ3RDLFFBQVEsRUFBRSxHQUFHLENBQUMsY0FBYyxDQUFDLFFBQVEsQ0FBQyxpQkFBaUIsQ0FBQztTQUN6RCxDQUFDLENBQUM7UUFHSCxVQUFVLENBQUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBRTlDLHlCQUF5QjtRQUN6Qix1RUFBdUU7UUFDdkUsT0FBTyxDQUFDLFlBQVksQ0FBQyxvQkFBb0IsRUFBRTtZQUN6QyxPQUFPLEVBQUUsb0JBQW9CO1lBQzdCLFVBQVUsRUFBRSx1REFBdUQ7WUFDbkUsS0FBSyxFQUFFLG9CQUFvQjtZQUMzQixTQUFTLEVBQUUsYUFBYTtZQUN4QixPQUFPLEVBQUUsT0FBTztZQUNoQixNQUFNLEVBQUU7Z0JBQ04sYUFBYSxFQUFFLE9BQU8sQ0FBQyxXQUFXO2dCQUNsQyxPQUFPLEVBQUU7b0JBQ1AsWUFBWSxFQUFFLDBFQUEwRTtpQkFDekY7Z0JBQ0QsWUFBWSxFQUFFO29CQUNaLGdCQUFnQixFQUFFO3dCQUNoQixRQUFRLEVBQUUsS0FBSzt3QkFDZixNQUFNLEVBQUUsdUJBQXVCO3FCQUNoQztpQkFDRjthQUVGO1NBQ0YsQ0FBQyxDQUFBO0lBR0osQ0FBQztDQUNGO0FBcEZELDBDQW9GQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IE5lc3RlZFN0YWNrIH0gZnJvbSAnYXdzLWNkay1saWInO1xuaW1wb3J0IHsgQ2x1c3RlciB9IGZyb20gJ2F3cy1jZGstbGliL2F3cy1la3MnO1xuaW1wb3J0IHsgQ29uc3RydWN0IH0gZnJvbSBcImNvbnN0cnVjdHNcIjtcbmltcG9ydCBpYW0gPSByZXF1aXJlKCdhd3MtY2RrLWxpYi9hd3MtaWFtJyk7XG5cbmV4cG9ydCBjbGFzcyBBd3NFRlNDU0lEcml2ZXIgZXh0ZW5kcyBOZXN0ZWRTdGFjayB7XG4gIGJvZHk6IENvbnN0cnVjdDtcblxuICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nLCBjbHVzdGVyOiBDbHVzdGVyKSB7XG4gICAgc3VwZXIoc2NvcGUsIGlkKTtcblxuICAgIGNvbnN0IGlhbVBvbGljeURvY3VtZW50ID0gSlNPTi5wYXJzZShge1xuICAgICAgICBcIlZlcnNpb25cIjogXCIyMDEyLTEwLTE3XCIsXG4gICAgICAgIFwiU3RhdGVtZW50XCI6IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICBcIkVmZmVjdFwiOiBcIkFsbG93XCIsXG4gICAgICAgICAgICBcIkFjdGlvblwiOiBbXG4gICAgICAgICAgICAgIFwiZWxhc3RpY2ZpbGVzeXN0ZW06RGVzY3JpYmVBY2Nlc3NQb2ludHNcIixcbiAgICAgICAgICAgICAgXCJlbGFzdGljZmlsZXN5c3RlbTpEZXNjcmliZUZpbGVTeXN0ZW1zXCJcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBcIlJlc291cmNlXCI6IFwiKlwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICBcIkVmZmVjdFwiOiBcIkFsbG93XCIsXG4gICAgICAgICAgICBcIkFjdGlvblwiOiBbXG4gICAgICAgICAgICAgIFwiZWxhc3RpY2ZpbGVzeXN0ZW06Q3JlYXRlQWNjZXNzUG9pbnRcIlxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIFwiUmVzb3VyY2VcIjogXCIqXCIsXG4gICAgICAgICAgICBcIkNvbmRpdGlvblwiOiB7XG4gICAgICAgICAgICAgIFwiU3RyaW5nTGlrZVwiOiB7XG4gICAgICAgICAgICAgICAgXCJhd3M6UmVxdWVzdFRhZy9lZnMuY3NpLmF3cy5jb20vY2x1c3RlclwiOiBcInRydWVcIlxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICBcIkVmZmVjdFwiOiBcIkFsbG93XCIsXG4gICAgICAgICAgICBcIkFjdGlvblwiOiBcImVsYXN0aWNmaWxlc3lzdGVtOkRlbGV0ZUFjY2Vzc1BvaW50XCIsXG4gICAgICAgICAgICBcIlJlc291cmNlXCI6IFwiKlwiLFxuICAgICAgICAgICAgXCJDb25kaXRpb25cIjoge1xuICAgICAgICAgICAgICBcIlN0cmluZ0VxdWFsc1wiOiB7XG4gICAgICAgICAgICAgICAgXCJhd3M6UmVzb3VyY2VUYWcvZWZzLmNzaS5hd3MuY29tL2NsdXN0ZXJcIjogXCJ0cnVlXCJcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgXVxuICAgICAgfWApXG5cbiAgICAvLyBDcmVhdGUgS3ViZXJuZXRlcyBTZXJ2aWNlQWNjb3VudFxuICAgIGxldCBzdmNBY2NvdW50ID0gY2x1c3Rlci5hZGRTZXJ2aWNlQWNjb3VudCgnRUZTQ1NJU0EnLCB7XG4gICAgICBuYW1lOiAnZWZzLWNzaS1jb250cm9sbGVyLXNhJyxcbiAgICAgIG5hbWVzcGFjZTogJ2t1YmUtc3lzdGVtJyxcbiAgICB9KTtcblxuICAgIC8vIHN2Y0FjY291bnQucm9sZS5hZGRNYW5hZ2VkUG9saWN5KFxuICAgIC8vICAgaWFtLk1hbmFnZWRQb2xpY3kuZnJvbU1hbmFnZWRQb2xpY3lOYW1lKHNjb3BlLCAnRUZTQ1NJUG9saWN5JywgJ0FtYXpvbkVLU19FRlNfQ1NJX0RyaXZlcl9Qb2xpY3knKSk7XG5cbiAgICBjb25zdCBpYW1Qb2xpY3kgPSBuZXcgaWFtLlBvbGljeShzY29wZSwgJ0FXU0VGU0NTSURyaXZlcklBTVBvbGljeScsIHtcbiAgICAgIHBvbGljeU5hbWU6ICdBV1NFRlNDU0lEcml2ZXJJQU1Qb2xpY3knLFxuICAgICAgZG9jdW1lbnQ6IGlhbS5Qb2xpY3lEb2N1bWVudC5mcm9tSnNvbihpYW1Qb2xpY3lEb2N1bWVudCksXG4gICAgfSk7XG5cblxuICAgIHN2Y0FjY291bnQucm9sZS5hdHRhY2hJbmxpbmVQb2xpY3koaWFtUG9saWN5KTtcblxuICAgIC8vIEluc3RhbGwgRUZTIENTSSBEcml2ZXJcbiAgICAvLyBodHRwczovL2RvY3MuYXdzLmFtYXpvbi5jb20vZWtzL2xhdGVzdC91c2VyZ3VpZGUvYWRkLW9ucy1pbWFnZXMuaHRtbFxuICAgIGNsdXN0ZXIuYWRkSGVsbUNoYXJ0KCdhd3MtZWZzLWNzaS1kcml2ZXInLCB7XG4gICAgICByZWxlYXNlOiAnYXdzLWVmcy1jc2ktZHJpdmVyJyxcbiAgICAgIHJlcG9zaXRvcnk6ICdodHRwczovL2t1YmVybmV0ZXMtc2lncy5naXRodWIuaW8vYXdzLWVmcy1jc2ktZHJpdmVyLycsXG4gICAgICBjaGFydDogJ2F3cy1lZnMtY3NpLWRyaXZlcicsXG4gICAgICBuYW1lc3BhY2U6ICdrdWJlLXN5c3RlbScsXG4gICAgICB2ZXJzaW9uOiAnMi4yLjInLFxuICAgICAgdmFsdWVzOiB7XG4gICAgICAgICdjbHVzdGVyTmFtZSc6IGNsdXN0ZXIuY2x1c3Rlck5hbWUsXG4gICAgICAgICdpbWFnZSc6IHtcbiAgICAgICAgICAncmVwb3NpdG9yeSc6ICc2MDI0MDExNDM0NTIuZGtyLmVjci5hcC1zb3V0aGVhc3QtMi5hbWF6b25hd3MuY29tL2Vrcy9hd3MtZWZzLWNzaS1kcml2ZXInLFxuICAgICAgICB9LFxuICAgICAgICAnY29udHJvbGxlcic6IHtcbiAgICAgICAgICAnc2VydmljZUFjY291bnQnOiB7XG4gICAgICAgICAgICAnY3JlYXRlJzogZmFsc2UsXG4gICAgICAgICAgICAnbmFtZSc6ICdlZnMtY3NpLWNvbnRyb2xsZXItc2EnLFxuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICB9LFxuICAgIH0pXG5cblxuICB9XG59Il19
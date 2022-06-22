"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EFSEKSIntegrationStack = void 0;
const aws_cdk_lib_1 = require("aws-cdk-lib");
const aws_ec2_1 = require("aws-cdk-lib/aws-ec2");
const aws_efs_1 = require("aws-cdk-lib/aws-efs");
/**
 * EFS Shared stack - Useful for combining multiple integrations
 */
class EFSEKSIntegrationStack extends aws_cdk_lib_1.Stack {
    constructor(scope, id, props) {
        super(scope, id, props);
        this.config = props;
        this.getEFS();
        this.updateEFS();
        // When eks cluster is passed, makes sense to create SC at the same time
        if (this.config.cluster) {
            this.createStorageClass();
        }
    }
    getEFS() {
        this.efs = aws_efs_1.FileSystem.fromFileSystemAttributes(this, 'ExistingsEFSSystem', {
            fileSystemId: this.config.fsId,
            securityGroup: aws_ec2_1.SecurityGroup.fromSecurityGroupId(this, 'SG', this.config.fsSg),
        });
    }
    updateEFS() {
        this.config.sgs.map(sg => this.efs.connections.allowDefaultPortFrom(sg));
    }
    createStorageClass() {
        const sc = this.config.cluster.addManifest('EFSSC', {
            apiVersion: 'storage.k8s.io/v1',
            kind: 'StorageClass',
            metadata: {
                name: 'efs-sc',
            },
            provisioner: 'efs.csi.aws.com',
            parameters: {
                provisioningMode: 'efs-ap',
                fileSystemId: this.config.fsId,
                directoryPerms: '0700',
            },
        });
        return sc;
    }
}
exports.EFSEKSIntegrationStack = EFSEKSIntegrationStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWZzLWVrcy1pbnRlZ3JhdGlvbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImVmcy1la3MtaW50ZWdyYXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsNkNBQW9DO0FBQ3BDLGlEQUFvRDtBQUNwRCxpREFBOEQ7QUFLOUQ7O0dBRUc7QUFDSCxNQUFhLHNCQUF1QixTQUFRLG1CQUFLO0lBSy9DLFlBQVksS0FBZ0IsRUFBRSxFQUFVLEVBQUUsS0FBbUM7UUFDM0UsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFFeEIsSUFBSSxDQUFDLE1BQU0sR0FBRyxLQUFNLENBQUM7UUFDckIsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFBO1FBQ2IsSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO1FBRWpCLHdFQUF3RTtRQUN4RSxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsT0FBTyxFQUFFO1lBQ3ZCLElBQUksQ0FBQyxrQkFBa0IsRUFBRSxDQUFBO1NBQzFCO0lBQ0gsQ0FBQztJQUVELE1BQU07UUFDSixJQUFJLENBQUMsR0FBRyxHQUFHLG9CQUFVLENBQUMsd0JBQXdCLENBQUMsSUFBSSxFQUFFLG9CQUFvQixFQUFFO1lBQ3pFLFlBQVksRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUk7WUFDOUIsYUFBYSxFQUFFLHVCQUFhLENBQUMsbUJBQW1CLENBQUMsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQztTQUMvRSxDQUFDLENBQUM7SUFDTCxDQUFDO0lBRUQsU0FBUztRQUNQLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUN2QixJQUFJLENBQUMsR0FBRyxDQUFDLFdBQVcsQ0FBQyxvQkFBb0IsQ0FBQyxFQUFFLENBQUMsQ0FDOUMsQ0FBQTtJQUNILENBQUM7SUFFRCxrQkFBa0I7UUFDaEIsTUFBTSxFQUFFLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFRLENBQUMsV0FBVyxDQUFDLE9BQU8sRUFBRTtZQUNuRCxVQUFVLEVBQUUsbUJBQW1CO1lBQy9CLElBQUksRUFBRSxjQUFjO1lBQ3BCLFFBQVEsRUFBRTtnQkFDUixJQUFJLEVBQUUsUUFBUTthQUNmO1lBQ0QsV0FBVyxFQUFFLGlCQUFpQjtZQUM5QixVQUFVLEVBQUU7Z0JBQ1YsZ0JBQWdCLEVBQUUsUUFBUTtnQkFDMUIsWUFBWSxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSTtnQkFDOUIsY0FBYyxFQUFFLE1BQU07YUFDdkI7U0FDRixDQUFDLENBQUM7UUFFSCxPQUFPLEVBQUUsQ0FBQTtJQUNYLENBQUM7Q0FFRjtBQWpERCx3REFpREMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBTdGFjayB9IGZyb20gJ2F3cy1jZGstbGliJztcbmltcG9ydCB7IFNlY3VyaXR5R3JvdXAgfSBmcm9tIFwiYXdzLWNkay1saWIvYXdzLWVjMlwiO1xuaW1wb3J0IHsgRmlsZVN5c3RlbSwgSUZpbGVTeXN0ZW0gfSBmcm9tIFwiYXdzLWNkay1saWIvYXdzLWVmc1wiO1xuaW1wb3J0IHsgS3ViZXJuZXRlc01hbmlmZXN0IH0gZnJvbSAnYXdzLWNkay1saWIvYXdzLWVrcyc7XG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tICdjb25zdHJ1Y3RzJztcbmltcG9ydCB7IEVGU0VLU0ludGVncmF0aW9uU3RhY2tQcm9wcyB9IGZyb20gJy4uLy4uL2ludGVyZmFjZXMvbGliL2Vrcy9pbnRlcmZhY2VzJztcblxuLyoqXG4gKiBFRlMgU2hhcmVkIHN0YWNrIC0gVXNlZnVsIGZvciBjb21iaW5pbmcgbXVsdGlwbGUgaW50ZWdyYXRpb25zXG4gKi9cbmV4cG9ydCBjbGFzcyBFRlNFS1NJbnRlZ3JhdGlvblN0YWNrIGV4dGVuZHMgU3RhY2sge1xuXG4gIGNvbmZpZzogRUZTRUtTSW50ZWdyYXRpb25TdGFja1Byb3BzXG4gIGVmczogSUZpbGVTeXN0ZW1cblxuICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nLCBwcm9wcz86IEVGU0VLU0ludGVncmF0aW9uU3RhY2tQcm9wcykge1xuICAgIHN1cGVyKHNjb3BlLCBpZCwgcHJvcHMpO1xuXG4gICAgdGhpcy5jb25maWcgPSBwcm9wcyE7XG4gICAgdGhpcy5nZXRFRlMoKVxuICAgIHRoaXMudXBkYXRlRUZTKCk7XG5cbiAgICAvLyBXaGVuIGVrcyBjbHVzdGVyIGlzIHBhc3NlZCwgbWFrZXMgc2Vuc2UgdG8gY3JlYXRlIFNDIGF0IHRoZSBzYW1lIHRpbWVcbiAgICBpZiAodGhpcy5jb25maWcuY2x1c3Rlcikge1xuICAgICAgdGhpcy5jcmVhdGVTdG9yYWdlQ2xhc3MoKVxuICAgIH1cbiAgfVxuXG4gIGdldEVGUygpIHtcbiAgICB0aGlzLmVmcyA9IEZpbGVTeXN0ZW0uZnJvbUZpbGVTeXN0ZW1BdHRyaWJ1dGVzKHRoaXMsICdFeGlzdGluZ3NFRlNTeXN0ZW0nLCB7XG4gICAgICBmaWxlU3lzdGVtSWQ6IHRoaXMuY29uZmlnLmZzSWQsIC8vIFlvdSBjYW4gYWxzbyB1c2UgZmlsZVN5c3RlbUFybiBpbnN0ZWFkIG9mIGZpbGVTeXN0ZW1JZC5cbiAgICAgIHNlY3VyaXR5R3JvdXA6IFNlY3VyaXR5R3JvdXAuZnJvbVNlY3VyaXR5R3JvdXBJZCh0aGlzLCAnU0cnLCB0aGlzLmNvbmZpZy5mc1NnKSxcbiAgICB9KTtcbiAgfVxuXG4gIHVwZGF0ZUVGUygpIHtcbiAgICB0aGlzLmNvbmZpZy5zZ3MubWFwKHNnID0+XG4gICAgICB0aGlzLmVmcy5jb25uZWN0aW9ucy5hbGxvd0RlZmF1bHRQb3J0RnJvbShzZylcbiAgICApXG4gIH1cblxuICBjcmVhdGVTdG9yYWdlQ2xhc3MoKTogS3ViZXJuZXRlc01hbmlmZXN0IHtcbiAgICBjb25zdCBzYyA9IHRoaXMuY29uZmlnLmNsdXN0ZXIhLmFkZE1hbmlmZXN0KCdFRlNTQycsIHtcbiAgICAgIGFwaVZlcnNpb246ICdzdG9yYWdlLms4cy5pby92MScsXG4gICAgICBraW5kOiAnU3RvcmFnZUNsYXNzJyxcbiAgICAgIG1ldGFkYXRhOiB7XG4gICAgICAgIG5hbWU6ICdlZnMtc2MnLFxuICAgICAgfSxcbiAgICAgIHByb3Zpc2lvbmVyOiAnZWZzLmNzaS5hd3MuY29tJyxcbiAgICAgIHBhcmFtZXRlcnM6IHtcbiAgICAgICAgcHJvdmlzaW9uaW5nTW9kZTogJ2Vmcy1hcCcsXG4gICAgICAgIGZpbGVTeXN0ZW1JZDogdGhpcy5jb25maWcuZnNJZCxcbiAgICAgICAgZGlyZWN0b3J5UGVybXM6ICcwNzAwJyxcbiAgICAgIH0sXG4gICAgfSk7XG5cbiAgICByZXR1cm4gc2NcbiAgfVxuXG59XG5cbiJdfQ==
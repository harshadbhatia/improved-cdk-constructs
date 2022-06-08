"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EFSNestedStack = void 0;
const aws_cdk_lib_1 = require("aws-cdk-lib");
const aws_ssm_1 = require("aws-cdk-lib/aws-ssm");
const aws_ec2_1 = require("aws-cdk-lib/aws-ec2");
class EFSNestedStack extends aws_cdk_lib_1.NestedStack {
    constructor(scope, id, eksCluster, config, vpc, eksClusterSG, props) {
        super(scope, id);
        // We simply push EKS SG as first item to EFS in case of nested
        this.clusterName = eksCluster;
        // Allow access from EFS
        config.ingress.push({
            port: 2049,
            description: "Allow from EKS Cluster",
            fromSG: eksClusterSG
        });
        this.config = config;
        this.vpc = vpc;
        this.createEfs();
        this.createParams();
    }
    createEfs() {
        var _a;
        this.sg = new aws_cdk_lib_1.aws_ec2.SecurityGroup(this, "EFSSecurityGroup", {
            vpc: this.vpc,
            securityGroupName: `${this.clusterName}-efs-sg`
        });
        this.config.ingress.map(ig => {
            const fromSG = aws_ec2_1.SecurityGroup.fromSecurityGroupId(this, `FromSG${ig.port}`, ig.fromSG);
            this.sg.addIngressRule(fromSG, aws_ec2_1.Port.tcp(ig.port), ig.description);
        });
        this.efs = new aws_cdk_lib_1.aws_efs.FileSystem(this, "EFSFileSystem", {
            vpc: this.vpc,
            fileSystemName: this.config.fsName,
            encrypted: true,
            securityGroup: this.sg,
            removalPolicy: aws_cdk_lib_1.RemovalPolicy.DESTROY,
            performanceMode: aws_cdk_lib_1.aws_efs.PerformanceMode.MAX_IO,
            lifecyclePolicy: aws_cdk_lib_1.aws_efs.LifecyclePolicy.AFTER_30_DAYS,
        } // files are not transitioned to infrequent access (IA) storage by default
        );
        // Either we have a secondary user or root ACL
        (_a = this.config.accessPoints) === null || _a === void 0 ? void 0 : _a.map(ap => {
            if (ap.acls) {
                this.efs.addAccessPoint(ap.logicalId, {
                    createAcl: ap.acls,
                    path: ap.path,
                });
            }
            else {
                this.efs.addAccessPoint(ap.logicalId, {
                    path: ap.path,
                    posixUser: ap.posixUser,
                });
            }
        });
    }
    createParams() {
        // Export few parameters for application usage
        new aws_ssm_1.StringParameter(this, "EFSFileSystemID", {
            parameterName: `/account/stacks/${this.clusterName}/efs-fs-id`,
            stringValue: this.efs.fileSystemId,
            description: "File System ID"
        });
        new aws_ssm_1.StringParameter(this, "EFSSecurityGroupID", {
            parameterName: `/account/stacks/${this.clusterName}/efs-sg-id`,
            stringValue: this.sg.securityGroupId,
            description: "EFS Security Group ID"
        });
    }
}
exports.EFSNestedStack = EFSNestedStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWZzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZWZzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLDZDQUVxQjtBQUdyQixpREFBc0Q7QUFDdEQsaURBQWdFO0FBSWhFLE1BQWEsY0FBZSxTQUFRLHlCQUFXO0lBUTdDLFlBQVksS0FBZ0IsRUFBRSxFQUFVLEVBQUUsVUFBa0IsRUFBRSxNQUFvQixFQUFFLEdBQVMsRUFBRSxZQUFvQixFQUFFLEtBQWtCO1FBQ3JJLEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFDakIsK0RBQStEO1FBRS9ELElBQUksQ0FBQyxXQUFXLEdBQUcsVUFBVSxDQUFBO1FBQzdCLHdCQUF3QjtRQUN4QixNQUFNLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQztZQUNsQixJQUFJLEVBQUUsSUFBSTtZQUNWLFdBQVcsRUFBRSx3QkFBd0I7WUFDckMsTUFBTSxFQUFFLFlBQVk7U0FDckIsQ0FBQyxDQUFBO1FBRUYsSUFBSSxDQUFDLE1BQU0sR0FBRyxNQUFNLENBQUM7UUFDckIsSUFBSSxDQUFDLEdBQUcsR0FBRyxHQUFHLENBQUM7UUFFZixJQUFJLENBQUMsU0FBUyxFQUFFLENBQUM7UUFDakIsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDO0lBQ3RCLENBQUM7SUFHRCxTQUFTOztRQUVQLElBQUksQ0FBQyxFQUFFLEdBQUcsSUFBSSxxQkFBTyxDQUFDLGFBQWEsQ0FBQyxJQUFJLEVBQUUsa0JBQWtCLEVBQUU7WUFDNUQsR0FBRyxFQUFFLElBQUksQ0FBQyxHQUFHO1lBQ2IsaUJBQWlCLEVBQUUsR0FBRyxJQUFJLENBQUMsV0FBVyxTQUFTO1NBQzFCLENBQUMsQ0FBQztRQUV6QixJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEVBQUU7WUFDM0IsTUFBTSxNQUFNLEdBQUcsdUJBQWEsQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLEVBQUUsU0FBUyxFQUFFLENBQUMsSUFBSSxFQUFFLEVBQUUsRUFBRSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQ3RGLElBQUksQ0FBQyxFQUFFLENBQUMsY0FBYyxDQUNwQixNQUFNLEVBQ04sY0FBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLEVBQ2pCLEVBQUUsQ0FBQyxXQUFXLENBQ2YsQ0FBQztRQUNKLENBQUMsQ0FBQyxDQUFBO1FBRUYsSUFBSSxDQUFDLEdBQUcsR0FBRyxJQUFJLHFCQUFPLENBQUMsVUFBVSxDQUFDLElBQUksRUFBRSxlQUFlLEVBQ3JEO1lBQ0UsR0FBRyxFQUFFLElBQUksQ0FBQyxHQUFHO1lBQ2IsY0FBYyxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTTtZQUNsQyxTQUFTLEVBQUUsSUFBSTtZQUNmLGFBQWEsRUFBRSxJQUFJLENBQUMsRUFBRTtZQUN0QixhQUFhLEVBQUUsMkJBQWEsQ0FBQyxPQUFPO1lBQ3BDLGVBQWUsRUFBRSxxQkFBTyxDQUFDLGVBQWUsQ0FBQyxNQUFNO1lBQy9DLGVBQWUsRUFBRSxxQkFBTyxDQUFDLGVBQWUsQ0FBQyxhQUFhO1NBQ3BDLENBQUMsMEVBQTBFO1NBQ2hHLENBQUM7UUFFRiw4Q0FBOEM7UUFDOUMsTUFBQSxJQUFJLENBQUMsTUFBTSxDQUFDLFlBQVksMENBQUUsR0FBRyxDQUFDLEVBQUUsQ0FBQyxFQUFFO1lBQ2pDLElBQUksRUFBRSxDQUFDLElBQUksRUFBRTtnQkFDWCxJQUFJLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBQyxFQUFFLENBQUMsU0FBUyxFQUFFO29CQUNwQyxTQUFTLEVBQUUsRUFBRSxDQUFDLElBQUk7b0JBQ2xCLElBQUksRUFBRSxFQUFFLENBQUMsSUFBSTtpQkFDZCxDQUFDLENBQUE7YUFDSDtpQkFBTTtnQkFDTCxJQUFJLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBQyxFQUFFLENBQUMsU0FBUyxFQUFFO29CQUNwQyxJQUFJLEVBQUUsRUFBRSxDQUFDLElBQUk7b0JBQ2IsU0FBUyxFQUFFLEVBQUUsQ0FBQyxTQUFTO2lCQUN4QixDQUFDLENBQUE7YUFDSDtRQUNILENBQUMsQ0FBQyxDQUFBO0lBRUosQ0FBQztJQUdELFlBQVk7UUFDViw4Q0FBOEM7UUFDOUMsSUFBSSx5QkFBZSxDQUNqQixJQUFJLEVBQUUsaUJBQWlCLEVBQ3ZCO1lBQ0UsYUFBYSxFQUFFLG1CQUFtQixJQUFJLENBQUMsV0FBVyxZQUFZO1lBQzlELFdBQVcsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLFlBQVk7WUFDbEMsV0FBVyxFQUFFLGdCQUFnQjtTQUM5QixDQUNGLENBQUM7UUFFRixJQUFJLHlCQUFlLENBQ2pCLElBQUksRUFBRSxvQkFBb0IsRUFDMUI7WUFDRSxhQUFhLEVBQUUsbUJBQW1CLElBQUksQ0FBQyxXQUFXLFlBQVk7WUFDOUQsV0FBVyxFQUFFLElBQUksQ0FBQyxFQUFFLENBQUMsZUFBZTtZQUNwQyxXQUFXLEVBQUUsdUJBQXVCO1NBQ3JDLENBQ0YsQ0FBQztJQUVKLENBQUM7Q0FDRjtBQS9GRCx3Q0ErRkMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge1xuICBhd3NfZWMyLCBhd3NfZWZzLCBOZXN0ZWRTdGFjaywgUmVtb3ZhbFBvbGljeSwgU3RhY2tQcm9wc1xufSBmcm9tICdhd3MtY2RrLWxpYic7XG5pbXBvcnQgeyBTZWN1cml0eUdyb3VwUHJvcHMgfSBmcm9tIFwiYXdzLWNkay1saWIvYXdzLWVjMlwiO1xuaW1wb3J0IHsgRmlsZVN5c3RlbSwgRmlsZVN5c3RlbVByb3BzIH0gZnJvbSBcImF3cy1jZGstbGliL2F3cy1lZnNcIjtcbmltcG9ydCB7IFN0cmluZ1BhcmFtZXRlciB9IGZyb20gJ2F3cy1jZGstbGliL2F3cy1zc20nO1xuaW1wb3J0IHsgSVZwYywgUG9ydCwgU2VjdXJpdHlHcm91cCB9IGZyb20gXCJhd3MtY2RrLWxpYi9hd3MtZWMyXCI7XG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tICdjb25zdHJ1Y3RzJztcbmltcG9ydCB7IEVLU0VGU0NvbmZpZyB9IGZyb20gJy4uLy4uL2ludGVyZmFjZXMvbGliL2Vrcy9pbnRlcmZhY2VzJztcblxuZXhwb3J0IGNsYXNzIEVGU05lc3RlZFN0YWNrIGV4dGVuZHMgTmVzdGVkU3RhY2sge1xuXG4gIGNsdXN0ZXJOYW1lOiBzdHJpbmdcbiAgY29uZmlnOiBFS1NFRlNDb25maWdcbiAgdnBjOiBJVnBjXG4gIGVmczogRmlsZVN5c3RlbVxuICBzZzogU2VjdXJpdHlHcm91cFxuXG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcsIGVrc0NsdXN0ZXI6IHN0cmluZywgY29uZmlnOiBFS1NFRlNDb25maWcsIHZwYzogSVZwYywgZWtzQ2x1c3RlclNHOiBzdHJpbmcsIHByb3BzPzogU3RhY2tQcm9wcykge1xuICAgIHN1cGVyKHNjb3BlLCBpZCk7XG4gICAgLy8gV2Ugc2ltcGx5IHB1c2ggRUtTIFNHIGFzIGZpcnN0IGl0ZW0gdG8gRUZTIGluIGNhc2Ugb2YgbmVzdGVkXG5cbiAgICB0aGlzLmNsdXN0ZXJOYW1lID0gZWtzQ2x1c3RlclxuICAgIC8vIEFsbG93IGFjY2VzcyBmcm9tIEVGU1xuICAgIGNvbmZpZy5pbmdyZXNzLnB1c2goe1xuICAgICAgcG9ydDogMjA0OSxcbiAgICAgIGRlc2NyaXB0aW9uOiBcIkFsbG93IGZyb20gRUtTIENsdXN0ZXJcIixcbiAgICAgIGZyb21TRzogZWtzQ2x1c3RlclNHXG4gICAgfSlcblxuICAgIHRoaXMuY29uZmlnID0gY29uZmlnO1xuICAgIHRoaXMudnBjID0gdnBjO1xuXG4gICAgdGhpcy5jcmVhdGVFZnMoKTtcbiAgICB0aGlzLmNyZWF0ZVBhcmFtcygpO1xuICB9XG5cblxuICBjcmVhdGVFZnMoKSB7XG5cbiAgICB0aGlzLnNnID0gbmV3IGF3c19lYzIuU2VjdXJpdHlHcm91cCh0aGlzLCBcIkVGU1NlY3VyaXR5R3JvdXBcIiwge1xuICAgICAgdnBjOiB0aGlzLnZwYyxcbiAgICAgIHNlY3VyaXR5R3JvdXBOYW1lOiBgJHt0aGlzLmNsdXN0ZXJOYW1lfS1lZnMtc2dgXG4gICAgfSBhcyBTZWN1cml0eUdyb3VwUHJvcHMpO1xuXG4gICAgdGhpcy5jb25maWcuaW5ncmVzcy5tYXAoaWcgPT4ge1xuICAgICAgY29uc3QgZnJvbVNHID0gU2VjdXJpdHlHcm91cC5mcm9tU2VjdXJpdHlHcm91cElkKHRoaXMsIGBGcm9tU0cke2lnLnBvcnR9YCwgaWcuZnJvbVNHKTtcbiAgICAgIHRoaXMuc2cuYWRkSW5ncmVzc1J1bGUoXG4gICAgICAgIGZyb21TRyxcbiAgICAgICAgUG9ydC50Y3AoaWcucG9ydCksXG4gICAgICAgIGlnLmRlc2NyaXB0aW9uXG4gICAgICApO1xuICAgIH0pXG5cbiAgICB0aGlzLmVmcyA9IG5ldyBhd3NfZWZzLkZpbGVTeXN0ZW0odGhpcywgXCJFRlNGaWxlU3lzdGVtXCIsXG4gICAgICB7XG4gICAgICAgIHZwYzogdGhpcy52cGMsXG4gICAgICAgIGZpbGVTeXN0ZW1OYW1lOiB0aGlzLmNvbmZpZy5mc05hbWUsXG4gICAgICAgIGVuY3J5cHRlZDogdHJ1ZSxcbiAgICAgICAgc2VjdXJpdHlHcm91cDogdGhpcy5zZyxcbiAgICAgICAgcmVtb3ZhbFBvbGljeTogUmVtb3ZhbFBvbGljeS5ERVNUUk9ZLFxuICAgICAgICBwZXJmb3JtYW5jZU1vZGU6IGF3c19lZnMuUGVyZm9ybWFuY2VNb2RlLk1BWF9JTyxcbiAgICAgICAgbGlmZWN5Y2xlUG9saWN5OiBhd3NfZWZzLkxpZmVjeWNsZVBvbGljeS5BRlRFUl8zMF9EQVlTLFxuICAgICAgfSBhcyBGaWxlU3lzdGVtUHJvcHMgLy8gZmlsZXMgYXJlIG5vdCB0cmFuc2l0aW9uZWQgdG8gaW5mcmVxdWVudCBhY2Nlc3MgKElBKSBzdG9yYWdlIGJ5IGRlZmF1bHRcbiAgICApO1xuXG4gICAgLy8gRWl0aGVyIHdlIGhhdmUgYSBzZWNvbmRhcnkgdXNlciBvciByb290IEFDTFxuICAgIHRoaXMuY29uZmlnLmFjY2Vzc1BvaW50cz8ubWFwKGFwID0+IHtcbiAgICAgIGlmIChhcC5hY2xzKSB7XG4gICAgICAgIHRoaXMuZWZzLmFkZEFjY2Vzc1BvaW50KGFwLmxvZ2ljYWxJZCwge1xuICAgICAgICAgIGNyZWF0ZUFjbDogYXAuYWNscyxcbiAgICAgICAgICBwYXRoOiBhcC5wYXRoLFxuICAgICAgICB9KVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5lZnMuYWRkQWNjZXNzUG9pbnQoYXAubG9naWNhbElkLCB7XG4gICAgICAgICAgcGF0aDogYXAucGF0aCxcbiAgICAgICAgICBwb3NpeFVzZXI6IGFwLnBvc2l4VXNlcixcbiAgICAgICAgfSlcbiAgICAgIH1cbiAgICB9KVxuXG4gIH1cblxuXG4gIGNyZWF0ZVBhcmFtcygpIHtcbiAgICAvLyBFeHBvcnQgZmV3IHBhcmFtZXRlcnMgZm9yIGFwcGxpY2F0aW9uIHVzYWdlXG4gICAgbmV3IFN0cmluZ1BhcmFtZXRlcihcbiAgICAgIHRoaXMsIFwiRUZTRmlsZVN5c3RlbUlEXCIsXG4gICAgICB7XG4gICAgICAgIHBhcmFtZXRlck5hbWU6IGAvYWNjb3VudC9zdGFja3MvJHt0aGlzLmNsdXN0ZXJOYW1lfS9lZnMtZnMtaWRgLFxuICAgICAgICBzdHJpbmdWYWx1ZTogdGhpcy5lZnMuZmlsZVN5c3RlbUlkLFxuICAgICAgICBkZXNjcmlwdGlvbjogXCJGaWxlIFN5c3RlbSBJRFwiXG4gICAgICB9XG4gICAgKTtcblxuICAgIG5ldyBTdHJpbmdQYXJhbWV0ZXIoXG4gICAgICB0aGlzLCBcIkVGU1NlY3VyaXR5R3JvdXBJRFwiLFxuICAgICAge1xuICAgICAgICBwYXJhbWV0ZXJOYW1lOiBgL2FjY291bnQvc3RhY2tzLyR7dGhpcy5jbHVzdGVyTmFtZX0vZWZzLXNnLWlkYCxcbiAgICAgICAgc3RyaW5nVmFsdWU6IHRoaXMuc2cuc2VjdXJpdHlHcm91cElkLFxuICAgICAgICBkZXNjcmlwdGlvbjogXCJFRlMgU2VjdXJpdHkgR3JvdXAgSURcIlxuICAgICAgfVxuICAgICk7XG5cbiAgfVxufVxuXG4iXX0=
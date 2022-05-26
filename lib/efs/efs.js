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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWZzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZWZzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLDZDQUVxQjtBQUdyQixpREFBc0Q7QUFDdEQsaURBQWdFO0FBSWhFLE1BQWEsY0FBZSxTQUFRLHlCQUFXO0lBUTdDLFlBQVksS0FBZ0IsRUFBRSxFQUFVLEVBQUUsVUFBa0IsRUFBRSxNQUFvQixFQUFFLEdBQVMsRUFBRSxZQUFvQixFQUFFLEtBQWtCO1FBQ3JJLEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFDakIsK0RBQStEO1FBRS9ELElBQUksQ0FBQyxXQUFXLEdBQUcsVUFBVSxDQUFBO1FBQzdCLHdCQUF3QjtRQUN4QixNQUFNLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQztZQUNsQixJQUFJLEVBQUUsSUFBSTtZQUNWLFdBQVcsRUFBRSx3QkFBd0I7WUFDckMsTUFBTSxFQUFFLFlBQVk7U0FDckIsQ0FBQyxDQUFBO1FBRUYsSUFBSSxDQUFDLE1BQU0sR0FBRyxNQUFNLENBQUM7UUFDckIsSUFBSSxDQUFDLEdBQUcsR0FBRyxHQUFHLENBQUM7UUFFZixJQUFJLENBQUMsU0FBUyxFQUFFLENBQUM7UUFDakIsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDO0lBQ3RCLENBQUM7SUFHRCxTQUFTOztRQUVQLElBQUksQ0FBQyxFQUFFLEdBQUcsSUFBSSxxQkFBTyxDQUFDLGFBQWEsQ0FBQyxJQUFJLEVBQUUsa0JBQWtCLEVBQUU7WUFDNUQsR0FBRyxFQUFFLElBQUksQ0FBQyxHQUFHO1lBQ2IsaUJBQWlCLEVBQUUsR0FBRyxJQUFJLENBQUMsV0FBVyxTQUFTO1NBQzFCLENBQUMsQ0FBQztRQUV6QixJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEVBQUU7WUFDM0IsTUFBTSxNQUFNLEdBQUcsdUJBQWEsQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLEVBQUUsU0FBUyxFQUFFLENBQUMsSUFBSSxFQUFFLEVBQUUsRUFBRSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQ3RGLElBQUksQ0FBQyxFQUFFLENBQUMsY0FBYyxDQUNwQixNQUFNLEVBQ04sY0FBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLEVBQ2pCLEVBQUUsQ0FBQyxXQUFXLENBQ2YsQ0FBQztRQUNKLENBQUMsQ0FBQyxDQUFBO1FBRUYsSUFBSSxDQUFDLEdBQUcsR0FBRyxJQUFJLHFCQUFPLENBQUMsVUFBVSxDQUFDLElBQUksRUFBRSxlQUFlLEVBQ3JEO1lBQ0UsR0FBRyxFQUFFLElBQUksQ0FBQyxHQUFHO1lBQ2IsY0FBYyxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTTtZQUNsQyxTQUFTLEVBQUUsSUFBSTtZQUNmLGFBQWEsRUFBRSxJQUFJLENBQUMsRUFBRTtZQUN0QixhQUFhLEVBQUUsMkJBQWEsQ0FBQyxPQUFPO1lBQ3BDLGVBQWUsRUFBRSxxQkFBTyxDQUFDLGVBQWUsQ0FBQyxNQUFNO1lBQy9DLGVBQWUsRUFBRSxxQkFBTyxDQUFDLGVBQWUsQ0FBQyxhQUFhO1NBQ3BDLENBQUMsMEVBQTBFO1NBQ2hHLENBQUM7UUFFRiw4Q0FBOEM7UUFDOUMsTUFBQSxJQUFJLENBQUMsTUFBTSxDQUFDLFlBQVksMENBQUUsR0FBRyxDQUFDLEVBQUUsQ0FBQyxFQUFFO1lBQ2pDLElBQUksRUFBRSxDQUFDLElBQUksRUFBRTtnQkFDWCxJQUFJLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBQyxFQUFFLENBQUMsU0FBUyxFQUFFO29CQUNwQyxTQUFTLEVBQUUsRUFBRSxDQUFDLElBQUk7b0JBQ2xCLElBQUksRUFBRSxFQUFFLENBQUMsSUFBSTtpQkFDZCxDQUFDLENBQUE7YUFDSDtpQkFBTTtnQkFDTCxJQUFJLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBQyxFQUFFLENBQUMsU0FBUyxFQUFFO29CQUNwQyxJQUFJLEVBQUUsRUFBRSxDQUFDLElBQUk7b0JBQ2IsU0FBUyxFQUFFLEVBQUUsQ0FBQyxTQUFTO2lCQUN4QixDQUFDLENBQUE7YUFDSDtRQUNILENBQUMsRUFBQztJQUVKLENBQUM7SUFHRCxZQUFZO1FBQ1YsOENBQThDO1FBQzlDLElBQUkseUJBQWUsQ0FDakIsSUFBSSxFQUFFLGlCQUFpQixFQUN2QjtZQUNFLGFBQWEsRUFBRSxtQkFBbUIsSUFBSSxDQUFDLFdBQVcsWUFBWTtZQUM5RCxXQUFXLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxZQUFZO1lBQ2xDLFdBQVcsRUFBRSxnQkFBZ0I7U0FDOUIsQ0FDRixDQUFDO1FBRUYsSUFBSSx5QkFBZSxDQUNqQixJQUFJLEVBQUUsb0JBQW9CLEVBQzFCO1lBQ0UsYUFBYSxFQUFFLG1CQUFtQixJQUFJLENBQUMsV0FBVyxZQUFZO1lBQzlELFdBQVcsRUFBRSxJQUFJLENBQUMsRUFBRSxDQUFDLGVBQWU7WUFDcEMsV0FBVyxFQUFFLHVCQUF1QjtTQUNyQyxDQUNGLENBQUM7SUFFSixDQUFDO0NBQ0Y7QUEvRkQsd0NBK0ZDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtcbiAgYXdzX2VjMiwgYXdzX2VmcywgTmVzdGVkU3RhY2ssIFJlbW92YWxQb2xpY3ksIFN0YWNrUHJvcHNcbn0gZnJvbSAnYXdzLWNkay1saWInO1xuaW1wb3J0IHsgU2VjdXJpdHlHcm91cFByb3BzIH0gZnJvbSBcImF3cy1jZGstbGliL2F3cy1lYzJcIjtcbmltcG9ydCB7IEZpbGVTeXN0ZW0sIEZpbGVTeXN0ZW1Qcm9wcyB9IGZyb20gXCJhd3MtY2RrLWxpYi9hd3MtZWZzXCI7XG5pbXBvcnQgeyBTdHJpbmdQYXJhbWV0ZXIgfSBmcm9tICdhd3MtY2RrLWxpYi9hd3Mtc3NtJztcbmltcG9ydCB7IElWcGMsIFBvcnQsIFNlY3VyaXR5R3JvdXAgfSBmcm9tIFwiYXdzLWNkay1saWIvYXdzLWVjMlwiO1xuaW1wb3J0IHsgQ29uc3RydWN0IH0gZnJvbSAnY29uc3RydWN0cyc7XG5pbXBvcnQgeyBFS1NFRlNDb25maWcgfSBmcm9tICcuLi8uLi9pbnRlcmZhY2VzL2xpYi9la3MvaW50ZXJmYWNlcyc7XG5cbmV4cG9ydCBjbGFzcyBFRlNOZXN0ZWRTdGFjayBleHRlbmRzIE5lc3RlZFN0YWNrIHtcblxuICBjbHVzdGVyTmFtZTogc3RyaW5nXG4gIGNvbmZpZzogRUtTRUZTQ29uZmlnXG4gIHZwYzogSVZwY1xuICBlZnM6IEZpbGVTeXN0ZW1cbiAgc2c6IFNlY3VyaXR5R3JvdXBcblxuICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nLCBla3NDbHVzdGVyOiBzdHJpbmcsIGNvbmZpZzogRUtTRUZTQ29uZmlnLCB2cGM6IElWcGMsIGVrc0NsdXN0ZXJTRzogc3RyaW5nLCBwcm9wcz86IFN0YWNrUHJvcHMpIHtcbiAgICBzdXBlcihzY29wZSwgaWQpO1xuICAgIC8vIFdlIHNpbXBseSBwdXNoIEVLUyBTRyBhcyBmaXJzdCBpdGVtIHRvIEVGUyBpbiBjYXNlIG9mIG5lc3RlZFxuXG4gICAgdGhpcy5jbHVzdGVyTmFtZSA9IGVrc0NsdXN0ZXJcbiAgICAvLyBBbGxvdyBhY2Nlc3MgZnJvbSBFRlNcbiAgICBjb25maWcuaW5ncmVzcy5wdXNoKHtcbiAgICAgIHBvcnQ6IDIwNDksXG4gICAgICBkZXNjcmlwdGlvbjogXCJBbGxvdyBmcm9tIEVLUyBDbHVzdGVyXCIsXG4gICAgICBmcm9tU0c6IGVrc0NsdXN0ZXJTR1xuICAgIH0pXG5cbiAgICB0aGlzLmNvbmZpZyA9IGNvbmZpZztcbiAgICB0aGlzLnZwYyA9IHZwYztcblxuICAgIHRoaXMuY3JlYXRlRWZzKCk7XG4gICAgdGhpcy5jcmVhdGVQYXJhbXMoKTtcbiAgfVxuXG5cbiAgY3JlYXRlRWZzKCkge1xuXG4gICAgdGhpcy5zZyA9IG5ldyBhd3NfZWMyLlNlY3VyaXR5R3JvdXAodGhpcywgXCJFRlNTZWN1cml0eUdyb3VwXCIsIHtcbiAgICAgIHZwYzogdGhpcy52cGMsXG4gICAgICBzZWN1cml0eUdyb3VwTmFtZTogYCR7dGhpcy5jbHVzdGVyTmFtZX0tZWZzLXNnYFxuICAgIH0gYXMgU2VjdXJpdHlHcm91cFByb3BzKTtcblxuICAgIHRoaXMuY29uZmlnLmluZ3Jlc3MubWFwKGlnID0+IHtcbiAgICAgIGNvbnN0IGZyb21TRyA9IFNlY3VyaXR5R3JvdXAuZnJvbVNlY3VyaXR5R3JvdXBJZCh0aGlzLCBgRnJvbVNHJHtpZy5wb3J0fWAsIGlnLmZyb21TRyk7XG4gICAgICB0aGlzLnNnLmFkZEluZ3Jlc3NSdWxlKFxuICAgICAgICBmcm9tU0csXG4gICAgICAgIFBvcnQudGNwKGlnLnBvcnQpLFxuICAgICAgICBpZy5kZXNjcmlwdGlvblxuICAgICAgKTtcbiAgICB9KVxuXG4gICAgdGhpcy5lZnMgPSBuZXcgYXdzX2Vmcy5GaWxlU3lzdGVtKHRoaXMsIFwiRUZTRmlsZVN5c3RlbVwiLFxuICAgICAge1xuICAgICAgICB2cGM6IHRoaXMudnBjLFxuICAgICAgICBmaWxlU3lzdGVtTmFtZTogdGhpcy5jb25maWcuZnNOYW1lLFxuICAgICAgICBlbmNyeXB0ZWQ6IHRydWUsXG4gICAgICAgIHNlY3VyaXR5R3JvdXA6IHRoaXMuc2csXG4gICAgICAgIHJlbW92YWxQb2xpY3k6IFJlbW92YWxQb2xpY3kuREVTVFJPWSxcbiAgICAgICAgcGVyZm9ybWFuY2VNb2RlOiBhd3NfZWZzLlBlcmZvcm1hbmNlTW9kZS5NQVhfSU8sXG4gICAgICAgIGxpZmVjeWNsZVBvbGljeTogYXdzX2Vmcy5MaWZlY3ljbGVQb2xpY3kuQUZURVJfMzBfREFZUyxcbiAgICAgIH0gYXMgRmlsZVN5c3RlbVByb3BzIC8vIGZpbGVzIGFyZSBub3QgdHJhbnNpdGlvbmVkIHRvIGluZnJlcXVlbnQgYWNjZXNzIChJQSkgc3RvcmFnZSBieSBkZWZhdWx0XG4gICAgKTtcblxuICAgIC8vIEVpdGhlciB3ZSBoYXZlIGEgc2Vjb25kYXJ5IHVzZXIgb3Igcm9vdCBBQ0xcbiAgICB0aGlzLmNvbmZpZy5hY2Nlc3NQb2ludHM/Lm1hcChhcCA9PiB7XG4gICAgICBpZiAoYXAuYWNscykge1xuICAgICAgICB0aGlzLmVmcy5hZGRBY2Nlc3NQb2ludChhcC5sb2dpY2FsSWQsIHtcbiAgICAgICAgICBjcmVhdGVBY2w6IGFwLmFjbHMsXG4gICAgICAgICAgcGF0aDogYXAucGF0aCxcbiAgICAgICAgfSlcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuZWZzLmFkZEFjY2Vzc1BvaW50KGFwLmxvZ2ljYWxJZCwge1xuICAgICAgICAgIHBhdGg6IGFwLnBhdGgsXG4gICAgICAgICAgcG9zaXhVc2VyOiBhcC5wb3NpeFVzZXIsXG4gICAgICAgIH0pXG4gICAgICB9XG4gICAgfSlcblxuICB9XG5cblxuICBjcmVhdGVQYXJhbXMoKSB7XG4gICAgLy8gRXhwb3J0IGZldyBwYXJhbWV0ZXJzIGZvciBhcHBsaWNhdGlvbiB1c2FnZVxuICAgIG5ldyBTdHJpbmdQYXJhbWV0ZXIoXG4gICAgICB0aGlzLCBcIkVGU0ZpbGVTeXN0ZW1JRFwiLFxuICAgICAge1xuICAgICAgICBwYXJhbWV0ZXJOYW1lOiBgL2FjY291bnQvc3RhY2tzLyR7dGhpcy5jbHVzdGVyTmFtZX0vZWZzLWZzLWlkYCxcbiAgICAgICAgc3RyaW5nVmFsdWU6IHRoaXMuZWZzLmZpbGVTeXN0ZW1JZCxcbiAgICAgICAgZGVzY3JpcHRpb246IFwiRmlsZSBTeXN0ZW0gSURcIlxuICAgICAgfVxuICAgICk7XG5cbiAgICBuZXcgU3RyaW5nUGFyYW1ldGVyKFxuICAgICAgdGhpcywgXCJFRlNTZWN1cml0eUdyb3VwSURcIixcbiAgICAgIHtcbiAgICAgICAgcGFyYW1ldGVyTmFtZTogYC9hY2NvdW50L3N0YWNrcy8ke3RoaXMuY2x1c3Rlck5hbWV9L2Vmcy1zZy1pZGAsXG4gICAgICAgIHN0cmluZ1ZhbHVlOiB0aGlzLnNnLnNlY3VyaXR5R3JvdXBJZCxcbiAgICAgICAgZGVzY3JpcHRpb246IFwiRUZTIFNlY3VyaXR5IEdyb3VwIElEXCJcbiAgICAgIH1cbiAgICApO1xuXG4gIH1cbn1cblxuIl19
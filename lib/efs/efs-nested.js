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
            let efs_ap;
            if (ap.acls) {
                efs_ap = this.efs.addAccessPoint(ap.logicalId, {
                    createAcl: ap.acls,
                    path: ap.path,
                });
            }
            else {
                efs_ap = this.efs.addAccessPoint(ap.logicalId, {
                    path: ap.path,
                    posixUser: ap.posixUser,
                });
            }
            // export param for use
            new aws_ssm_1.StringParameter(this, "EFSFileSystemID", {
                parameterName: `/account/stacks/${this.stackName}/efs/ap-${ap.logicalId}`,
                stringValue: efs_ap.accessPointId,
                description: `${ap.logicalId} Access point ID`
            });
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWZzLW5lc3RlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImVmcy1uZXN0ZWQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsNkNBRXFCO0FBR3JCLGlEQUFzRDtBQUN0RCxpREFBZ0U7QUFJaEUsTUFBYSxjQUFlLFNBQVEseUJBQVc7SUFRN0MsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxVQUFrQixFQUFFLE1BQW9CLEVBQUUsR0FBUyxFQUFFLFlBQW9CLEVBQUUsS0FBa0I7UUFDckksS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsQ0FBQztRQUNqQiwrREFBK0Q7UUFFL0QsSUFBSSxDQUFDLFdBQVcsR0FBRyxVQUFVLENBQUE7UUFDN0Isd0JBQXdCO1FBQ3hCLE1BQU0sQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDO1lBQ2xCLElBQUksRUFBRSxJQUFJO1lBQ1YsV0FBVyxFQUFFLHdCQUF3QjtZQUNyQyxNQUFNLEVBQUUsWUFBWTtTQUNyQixDQUFDLENBQUE7UUFFRixJQUFJLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQztRQUNyQixJQUFJLENBQUMsR0FBRyxHQUFHLEdBQUcsQ0FBQztRQUVmLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztRQUNqQixJQUFJLENBQUMsWUFBWSxFQUFFLENBQUM7SUFDdEIsQ0FBQztJQUdELFNBQVM7O1FBRVAsSUFBSSxDQUFDLEVBQUUsR0FBRyxJQUFJLHFCQUFPLENBQUMsYUFBYSxDQUFDLElBQUksRUFBRSxrQkFBa0IsRUFBRTtZQUM1RCxHQUFHLEVBQUUsSUFBSSxDQUFDLEdBQUc7WUFDYixpQkFBaUIsRUFBRSxHQUFHLElBQUksQ0FBQyxXQUFXLFNBQVM7U0FDMUIsQ0FBQyxDQUFDO1FBRXpCLElBQUksQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBRTtZQUMzQixNQUFNLE1BQU0sR0FBRyx1QkFBYSxDQUFDLG1CQUFtQixDQUFDLElBQUksRUFBRSxTQUFTLEVBQUUsQ0FBQyxJQUFJLEVBQUUsRUFBRSxFQUFFLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDdEYsSUFBSSxDQUFDLEVBQUUsQ0FBQyxjQUFjLENBQ3BCLE1BQU0sRUFDTixjQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFDakIsRUFBRSxDQUFDLFdBQVcsQ0FDZixDQUFDO1FBQ0osQ0FBQyxDQUFDLENBQUE7UUFFRixJQUFJLENBQUMsR0FBRyxHQUFHLElBQUkscUJBQU8sQ0FBQyxVQUFVLENBQUMsSUFBSSxFQUFFLGVBQWUsRUFDckQ7WUFDRSxHQUFHLEVBQUUsSUFBSSxDQUFDLEdBQUc7WUFDYixjQUFjLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNO1lBQ2xDLFNBQVMsRUFBRSxJQUFJO1lBQ2YsYUFBYSxFQUFFLElBQUksQ0FBQyxFQUFFO1lBQ3RCLGFBQWEsRUFBRSwyQkFBYSxDQUFDLE9BQU87WUFDcEMsZUFBZSxFQUFFLHFCQUFPLENBQUMsZUFBZSxDQUFDLE1BQU07WUFDL0MsZUFBZSxFQUFFLHFCQUFPLENBQUMsZUFBZSxDQUFDLGFBQWE7U0FDcEMsQ0FBQywwRUFBMEU7U0FDaEcsQ0FBQztRQUVGLDhDQUE4QztRQUM5QyxNQUFBLElBQUksQ0FBQyxNQUFNLENBQUMsWUFBWSwwQ0FBRSxHQUFHLENBQUMsRUFBRSxDQUFDLEVBQUU7WUFDakMsSUFBSSxNQUEyQixDQUFBO1lBQy9CLElBQUksRUFBRSxDQUFDLElBQUksRUFBRTtnQkFDWCxNQUFNLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsRUFBRSxDQUFDLFNBQVMsRUFBRTtvQkFDN0MsU0FBUyxFQUFFLEVBQUUsQ0FBQyxJQUFJO29CQUNsQixJQUFJLEVBQUUsRUFBRSxDQUFDLElBQUk7aUJBQ2QsQ0FBQyxDQUFBO2FBQ0g7aUJBQU07Z0JBQ0wsTUFBTSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLEVBQUUsQ0FBQyxTQUFTLEVBQUU7b0JBQzdDLElBQUksRUFBRSxFQUFFLENBQUMsSUFBSTtvQkFDYixTQUFTLEVBQUUsRUFBRSxDQUFDLFNBQVM7aUJBQ3hCLENBQUMsQ0FBQTthQUNIO1lBQ0QsdUJBQXVCO1lBQ3ZCLElBQUkseUJBQWUsQ0FDakIsSUFBSSxFQUFFLGlCQUFpQixFQUN2QjtnQkFDRSxhQUFhLEVBQUUsbUJBQW1CLElBQUksQ0FBQyxTQUFTLFdBQVcsRUFBRSxDQUFDLFNBQVMsRUFBRTtnQkFDekUsV0FBVyxFQUFFLE1BQU0sQ0FBQyxhQUFhO2dCQUNqQyxXQUFXLEVBQUUsR0FBRyxFQUFFLENBQUMsU0FBUyxrQkFBa0I7YUFDL0MsQ0FDRixDQUFDO1FBQ0osQ0FBQyxDQUFDLENBQUE7SUFFSixDQUFDO0lBR0QsWUFBWTtRQUNWLDhDQUE4QztRQUM5QyxJQUFJLHlCQUFlLENBQ2pCLElBQUksRUFBRSxpQkFBaUIsRUFDdkI7WUFDRSxhQUFhLEVBQUUsbUJBQW1CLElBQUksQ0FBQyxXQUFXLFlBQVk7WUFDOUQsV0FBVyxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsWUFBWTtZQUNsQyxXQUFXLEVBQUUsZ0JBQWdCO1NBQzlCLENBQ0YsQ0FBQztRQUVGLElBQUkseUJBQWUsQ0FDakIsSUFBSSxFQUFFLG9CQUFvQixFQUMxQjtZQUNFLGFBQWEsRUFBRSxtQkFBbUIsSUFBSSxDQUFDLFdBQVcsWUFBWTtZQUM5RCxXQUFXLEVBQUUsSUFBSSxDQUFDLEVBQUUsQ0FBQyxlQUFlO1lBQ3BDLFdBQVcsRUFBRSx1QkFBdUI7U0FDckMsQ0FDRixDQUFDO0lBRUosQ0FBQztDQUNGO0FBekdELHdDQXlHQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7XG4gIGF3c19lYzIsIGF3c19lZnMsIE5lc3RlZFN0YWNrLCBSZW1vdmFsUG9saWN5LCBTdGFja1Byb3BzXG59IGZyb20gJ2F3cy1jZGstbGliJztcbmltcG9ydCB7IFNlY3VyaXR5R3JvdXBQcm9wcyB9IGZyb20gXCJhd3MtY2RrLWxpYi9hd3MtZWMyXCI7XG5pbXBvcnQgeyBGaWxlU3lzdGVtLCBGaWxlU3lzdGVtUHJvcHMgfSBmcm9tIFwiYXdzLWNkay1saWIvYXdzLWVmc1wiO1xuaW1wb3J0IHsgU3RyaW5nUGFyYW1ldGVyIH0gZnJvbSAnYXdzLWNkay1saWIvYXdzLXNzbSc7XG5pbXBvcnQgeyBJVnBjLCBQb3J0LCBTZWN1cml0eUdyb3VwIH0gZnJvbSBcImF3cy1jZGstbGliL2F3cy1lYzJcIjtcbmltcG9ydCB7IENvbnN0cnVjdCB9IGZyb20gJ2NvbnN0cnVjdHMnO1xuaW1wb3J0IHsgRUtTRUZTQ29uZmlnIH0gZnJvbSAnLi4vLi4vaW50ZXJmYWNlcy9saWIvZWtzL2ludGVyZmFjZXMnO1xuXG5leHBvcnQgY2xhc3MgRUZTTmVzdGVkU3RhY2sgZXh0ZW5kcyBOZXN0ZWRTdGFjayB7XG5cbiAgY2x1c3Rlck5hbWU6IHN0cmluZ1xuICBjb25maWc6IEVLU0VGU0NvbmZpZ1xuICB2cGM6IElWcGNcbiAgZWZzOiBGaWxlU3lzdGVtXG4gIHNnOiBTZWN1cml0eUdyb3VwXG5cbiAgY29uc3RydWN0b3Ioc2NvcGU6IENvbnN0cnVjdCwgaWQ6IHN0cmluZywgZWtzQ2x1c3Rlcjogc3RyaW5nLCBjb25maWc6IEVLU0VGU0NvbmZpZywgdnBjOiBJVnBjLCBla3NDbHVzdGVyU0c6IHN0cmluZywgcHJvcHM/OiBTdGFja1Byb3BzKSB7XG4gICAgc3VwZXIoc2NvcGUsIGlkKTtcbiAgICAvLyBXZSBzaW1wbHkgcHVzaCBFS1MgU0cgYXMgZmlyc3QgaXRlbSB0byBFRlMgaW4gY2FzZSBvZiBuZXN0ZWRcblxuICAgIHRoaXMuY2x1c3Rlck5hbWUgPSBla3NDbHVzdGVyXG4gICAgLy8gQWxsb3cgYWNjZXNzIGZyb20gRUZTXG4gICAgY29uZmlnLmluZ3Jlc3MucHVzaCh7XG4gICAgICBwb3J0OiAyMDQ5LFxuICAgICAgZGVzY3JpcHRpb246IFwiQWxsb3cgZnJvbSBFS1MgQ2x1c3RlclwiLFxuICAgICAgZnJvbVNHOiBla3NDbHVzdGVyU0dcbiAgICB9KVxuXG4gICAgdGhpcy5jb25maWcgPSBjb25maWc7XG4gICAgdGhpcy52cGMgPSB2cGM7XG5cbiAgICB0aGlzLmNyZWF0ZUVmcygpO1xuICAgIHRoaXMuY3JlYXRlUGFyYW1zKCk7XG4gIH1cblxuXG4gIGNyZWF0ZUVmcygpIHtcblxuICAgIHRoaXMuc2cgPSBuZXcgYXdzX2VjMi5TZWN1cml0eUdyb3VwKHRoaXMsIFwiRUZTU2VjdXJpdHlHcm91cFwiLCB7XG4gICAgICB2cGM6IHRoaXMudnBjLFxuICAgICAgc2VjdXJpdHlHcm91cE5hbWU6IGAke3RoaXMuY2x1c3Rlck5hbWV9LWVmcy1zZ2BcbiAgICB9IGFzIFNlY3VyaXR5R3JvdXBQcm9wcyk7XG5cbiAgICB0aGlzLmNvbmZpZy5pbmdyZXNzLm1hcChpZyA9PiB7XG4gICAgICBjb25zdCBmcm9tU0cgPSBTZWN1cml0eUdyb3VwLmZyb21TZWN1cml0eUdyb3VwSWQodGhpcywgYEZyb21TRyR7aWcucG9ydH1gLCBpZy5mcm9tU0cpO1xuICAgICAgdGhpcy5zZy5hZGRJbmdyZXNzUnVsZShcbiAgICAgICAgZnJvbVNHLFxuICAgICAgICBQb3J0LnRjcChpZy5wb3J0KSxcbiAgICAgICAgaWcuZGVzY3JpcHRpb25cbiAgICAgICk7XG4gICAgfSlcblxuICAgIHRoaXMuZWZzID0gbmV3IGF3c19lZnMuRmlsZVN5c3RlbSh0aGlzLCBcIkVGU0ZpbGVTeXN0ZW1cIixcbiAgICAgIHtcbiAgICAgICAgdnBjOiB0aGlzLnZwYyxcbiAgICAgICAgZmlsZVN5c3RlbU5hbWU6IHRoaXMuY29uZmlnLmZzTmFtZSxcbiAgICAgICAgZW5jcnlwdGVkOiB0cnVlLFxuICAgICAgICBzZWN1cml0eUdyb3VwOiB0aGlzLnNnLFxuICAgICAgICByZW1vdmFsUG9saWN5OiBSZW1vdmFsUG9saWN5LkRFU1RST1ksXG4gICAgICAgIHBlcmZvcm1hbmNlTW9kZTogYXdzX2Vmcy5QZXJmb3JtYW5jZU1vZGUuTUFYX0lPLFxuICAgICAgICBsaWZlY3ljbGVQb2xpY3k6IGF3c19lZnMuTGlmZWN5Y2xlUG9saWN5LkFGVEVSXzMwX0RBWVMsXG4gICAgICB9IGFzIEZpbGVTeXN0ZW1Qcm9wcyAvLyBmaWxlcyBhcmUgbm90IHRyYW5zaXRpb25lZCB0byBpbmZyZXF1ZW50IGFjY2VzcyAoSUEpIHN0b3JhZ2UgYnkgZGVmYXVsdFxuICAgICk7XG5cbiAgICAvLyBFaXRoZXIgd2UgaGF2ZSBhIHNlY29uZGFyeSB1c2VyIG9yIHJvb3QgQUNMXG4gICAgdGhpcy5jb25maWcuYWNjZXNzUG9pbnRzPy5tYXAoYXAgPT4ge1xuICAgICAgbGV0IGVmc19hcDogYXdzX2Vmcy5BY2Nlc3NQb2ludFxuICAgICAgaWYgKGFwLmFjbHMpIHtcbiAgICAgICAgZWZzX2FwID0gdGhpcy5lZnMuYWRkQWNjZXNzUG9pbnQoYXAubG9naWNhbElkLCB7XG4gICAgICAgICAgY3JlYXRlQWNsOiBhcC5hY2xzLFxuICAgICAgICAgIHBhdGg6IGFwLnBhdGgsXG4gICAgICAgIH0pXG4gICAgICB9IGVsc2Uge1xuICAgICAgICBlZnNfYXAgPSB0aGlzLmVmcy5hZGRBY2Nlc3NQb2ludChhcC5sb2dpY2FsSWQsIHtcbiAgICAgICAgICBwYXRoOiBhcC5wYXRoLFxuICAgICAgICAgIHBvc2l4VXNlcjogYXAucG9zaXhVc2VyLFxuICAgICAgICB9KVxuICAgICAgfVxuICAgICAgLy8gZXhwb3J0IHBhcmFtIGZvciB1c2VcbiAgICAgIG5ldyBTdHJpbmdQYXJhbWV0ZXIoXG4gICAgICAgIHRoaXMsIFwiRUZTRmlsZVN5c3RlbUlEXCIsXG4gICAgICAgIHtcbiAgICAgICAgICBwYXJhbWV0ZXJOYW1lOiBgL2FjY291bnQvc3RhY2tzLyR7dGhpcy5zdGFja05hbWV9L2Vmcy9hcC0ke2FwLmxvZ2ljYWxJZH1gLFxuICAgICAgICAgIHN0cmluZ1ZhbHVlOiBlZnNfYXAuYWNjZXNzUG9pbnRJZCxcbiAgICAgICAgICBkZXNjcmlwdGlvbjogYCR7YXAubG9naWNhbElkfSBBY2Nlc3MgcG9pbnQgSURgXG4gICAgICAgIH1cbiAgICAgICk7XG4gICAgfSlcblxuICB9XG5cblxuICBjcmVhdGVQYXJhbXMoKSB7XG4gICAgLy8gRXhwb3J0IGZldyBwYXJhbWV0ZXJzIGZvciBhcHBsaWNhdGlvbiB1c2FnZVxuICAgIG5ldyBTdHJpbmdQYXJhbWV0ZXIoXG4gICAgICB0aGlzLCBcIkVGU0ZpbGVTeXN0ZW1JRFwiLFxuICAgICAge1xuICAgICAgICBwYXJhbWV0ZXJOYW1lOiBgL2FjY291bnQvc3RhY2tzLyR7dGhpcy5jbHVzdGVyTmFtZX0vZWZzLWZzLWlkYCxcbiAgICAgICAgc3RyaW5nVmFsdWU6IHRoaXMuZWZzLmZpbGVTeXN0ZW1JZCxcbiAgICAgICAgZGVzY3JpcHRpb246IFwiRmlsZSBTeXN0ZW0gSURcIlxuICAgICAgfVxuICAgICk7XG5cbiAgICBuZXcgU3RyaW5nUGFyYW1ldGVyKFxuICAgICAgdGhpcywgXCJFRlNTZWN1cml0eUdyb3VwSURcIixcbiAgICAgIHtcbiAgICAgICAgcGFyYW1ldGVyTmFtZTogYC9hY2NvdW50L3N0YWNrcy8ke3RoaXMuY2x1c3Rlck5hbWV9L2Vmcy1zZy1pZGAsXG4gICAgICAgIHN0cmluZ1ZhbHVlOiB0aGlzLnNnLnNlY3VyaXR5R3JvdXBJZCxcbiAgICAgICAgZGVzY3JpcHRpb246IFwiRUZTIFNlY3VyaXR5IEdyb3VwIElEXCJcbiAgICAgIH1cbiAgICApO1xuXG4gIH1cbn1cblxuIl19
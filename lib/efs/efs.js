"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EFSStack = void 0;
const aws_cdk_lib_1 = require("aws-cdk-lib");
const aws_ec2_1 = require("aws-cdk-lib/aws-ec2");
const aws_ssm_1 = require("aws-cdk-lib/aws-ssm");
/**
 * EFS Stack is only responsible for creating efs and access point only.
 * Security groups are created by the Shared Stack.
 */
class EFSStack extends aws_cdk_lib_1.Stack {
    constructor(scope, id, props) {
        super(scope, id, props);
        this.config = props;
        this.createEfs();
        this.createParams();
    }
    getVPC() {
        const vpcId = aws_ssm_1.StringParameter.valueFromLookup(this, '/account/vpc/id' || this.config.vpcId);
        const vpc = aws_ec2_1.Vpc.fromLookup(this, 'VPC', { vpcId: vpcId });
        return vpc;
    }
    createEfs() {
        var _a;
        const vpc = this.getVPC();
        this.sg = new aws_ec2_1.SecurityGroup(this, "EFSSecurityGroup", {
            vpc: vpc,
            securityGroupName: `${this.stackName}-efs-sg`,
            description: "EFS Default Security Group"
        });
        this.efs = new aws_cdk_lib_1.aws_efs.FileSystem(this, "EFSFileSystem", {
            vpc: vpc,
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
            parameterName: `/account/stacks/${this.stackName}/efs-fs-id`,
            stringValue: this.efs.fileSystemId,
            description: "File System ID"
        });
    }
}
exports.EFSStack = EFSStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWZzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZWZzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLDZDQUE0RDtBQUM1RCxpREFBbUY7QUFFbkYsaURBQXNEO0FBSXREOzs7R0FHRztBQUNILE1BQWEsUUFBUyxTQUFRLG1CQUFLO0lBTWpDLFlBQVksS0FBZ0IsRUFBRSxFQUFVLEVBQUUsS0FBcUI7UUFDN0QsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFFeEIsSUFBSSxDQUFDLE1BQU0sR0FBRyxLQUFNLENBQUM7UUFDckIsSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO1FBQ2pCLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQztJQUN0QixDQUFDO0lBRUQsTUFBTTtRQUNKLE1BQU0sS0FBSyxHQUFHLHlCQUFlLENBQUMsZUFBZSxDQUFDLElBQUksRUFBRSxpQkFBaUIsSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQzVGLE1BQU0sR0FBRyxHQUFHLGFBQUcsQ0FBQyxVQUFVLENBQUMsSUFBSSxFQUFFLEtBQUssRUFBRSxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDO1FBRTFELE9BQU8sR0FBRyxDQUFDO0lBQ2IsQ0FBQztJQUdELFNBQVM7O1FBRVAsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO1FBRTFCLElBQUksQ0FBQyxFQUFFLEdBQUcsSUFBSSx1QkFBYSxDQUFDLElBQUksRUFBRSxrQkFBa0IsRUFBRTtZQUNwRCxHQUFHLEVBQUUsR0FBRztZQUNSLGlCQUFpQixFQUFFLEdBQUcsSUFBSSxDQUFDLFNBQVMsU0FBUztZQUM3QyxXQUFXLEVBQUUsNEJBQTRCO1NBQ3BCLENBQUMsQ0FBQztRQUV6QixJQUFJLENBQUMsR0FBRyxHQUFHLElBQUkscUJBQU8sQ0FBQyxVQUFVLENBQUMsSUFBSSxFQUFFLGVBQWUsRUFDckQ7WUFDRSxHQUFHLEVBQUUsR0FBRztZQUNSLGNBQWMsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU07WUFDbEMsU0FBUyxFQUFFLElBQUk7WUFDZixhQUFhLEVBQUUsSUFBSSxDQUFDLEVBQUU7WUFDdEIsYUFBYSxFQUFFLDJCQUFhLENBQUMsT0FBTztZQUNwQyxlQUFlLEVBQUUscUJBQU8sQ0FBQyxlQUFlLENBQUMsTUFBTTtZQUMvQyxlQUFlLEVBQUUscUJBQU8sQ0FBQyxlQUFlLENBQUMsYUFBYTtTQUNwQyxDQUFDLDBFQUEwRTtTQUNoRyxDQUFDO1FBRUYsOENBQThDO1FBQzlDLE1BQUEsSUFBSSxDQUFDLE1BQU0sQ0FBQyxZQUFZLDBDQUFFLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBRTtZQUNqQyxJQUFJLEVBQUUsQ0FBQyxJQUFJLEVBQUU7Z0JBQ1gsSUFBSSxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsRUFBRSxDQUFDLFNBQVMsRUFBRTtvQkFDcEMsU0FBUyxFQUFFLEVBQUUsQ0FBQyxJQUFJO29CQUNsQixJQUFJLEVBQUUsRUFBRSxDQUFDLElBQUk7aUJBQ2QsQ0FBQyxDQUFBO2FBQ0g7aUJBQU07Z0JBQ0wsSUFBSSxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsRUFBRSxDQUFDLFNBQVMsRUFBRTtvQkFDcEMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxJQUFJO29CQUNiLFNBQVMsRUFBRSxFQUFFLENBQUMsU0FBUztpQkFDeEIsQ0FBQyxDQUFBO2FBQ0g7UUFDSCxDQUFDLENBQUMsQ0FBQTtJQUVKLENBQUM7SUFHRCxZQUFZO1FBQ1YsOENBQThDO1FBQzlDLElBQUkseUJBQWUsQ0FDakIsSUFBSSxFQUFFLGlCQUFpQixFQUN2QjtZQUNFLGFBQWEsRUFBRSxtQkFBbUIsSUFBSSxDQUFDLFNBQVMsWUFBWTtZQUM1RCxXQUFXLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxZQUFZO1lBQ2xDLFdBQVcsRUFBRSxnQkFBZ0I7U0FDOUIsQ0FDRixDQUFDO0lBRUosQ0FBQztDQUNGO0FBMUVELDRCQTBFQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IGF3c19lZnMsIFJlbW92YWxQb2xpY3ksIFN0YWNrIH0gZnJvbSAnYXdzLWNkay1saWInO1xuaW1wb3J0IHsgSVZwYywgU2VjdXJpdHlHcm91cCwgU2VjdXJpdHlHcm91cFByb3BzLCBWcGMgfSBmcm9tIFwiYXdzLWNkay1saWIvYXdzLWVjMlwiO1xuaW1wb3J0IHsgRmlsZVN5c3RlbSwgRmlsZVN5c3RlbVByb3BzIH0gZnJvbSBcImF3cy1jZGstbGliL2F3cy1lZnNcIjtcbmltcG9ydCB7IFN0cmluZ1BhcmFtZXRlciB9IGZyb20gJ2F3cy1jZGstbGliL2F3cy1zc20nO1xuaW1wb3J0IHsgQ29uc3RydWN0IH0gZnJvbSAnY29uc3RydWN0cyc7XG5pbXBvcnQgeyBFRlNTdGFja1Byb3BzIH0gZnJvbSAnLi4vLi4vaW50ZXJmYWNlcy9saWIvZWtzL2ludGVyZmFjZXMnO1xuXG4vKipcbiAqIEVGUyBTdGFjayBpcyBvbmx5IHJlc3BvbnNpYmxlIGZvciBjcmVhdGluZyBlZnMgYW5kIGFjY2VzcyBwb2ludCBvbmx5LlxuICogU2VjdXJpdHkgZ3JvdXBzIGFyZSBjcmVhdGVkIGJ5IHRoZSBTaGFyZWQgU3RhY2suXG4gKi9cbmV4cG9ydCBjbGFzcyBFRlNTdGFjayBleHRlbmRzIFN0YWNrIHtcblxuICBjb25maWc6IEVGU1N0YWNrUHJvcHNcbiAgZWZzOiBGaWxlU3lzdGVtXG4gIHNnOiBTZWN1cml0eUdyb3VwXG5cbiAgY29uc3RydWN0b3Ioc2NvcGU6IENvbnN0cnVjdCwgaWQ6IHN0cmluZywgcHJvcHM/OiBFRlNTdGFja1Byb3BzKSB7XG4gICAgc3VwZXIoc2NvcGUsIGlkLCBwcm9wcyk7XG5cbiAgICB0aGlzLmNvbmZpZyA9IHByb3BzITtcbiAgICB0aGlzLmNyZWF0ZUVmcygpO1xuICAgIHRoaXMuY3JlYXRlUGFyYW1zKCk7XG4gIH1cblxuICBnZXRWUEMoKTogSVZwYyB7XG4gICAgY29uc3QgdnBjSWQgPSBTdHJpbmdQYXJhbWV0ZXIudmFsdWVGcm9tTG9va3VwKHRoaXMsICcvYWNjb3VudC92cGMvaWQnIHx8IHRoaXMuY29uZmlnLnZwY0lkKTtcbiAgICBjb25zdCB2cGMgPSBWcGMuZnJvbUxvb2t1cCh0aGlzLCAnVlBDJywgeyB2cGNJZDogdnBjSWQgfSk7XG5cbiAgICByZXR1cm4gdnBjO1xuICB9XG5cblxuICBjcmVhdGVFZnMoKSB7XG5cbiAgICBjb25zdCB2cGMgPSB0aGlzLmdldFZQQygpO1xuXG4gICAgdGhpcy5zZyA9IG5ldyBTZWN1cml0eUdyb3VwKHRoaXMsIFwiRUZTU2VjdXJpdHlHcm91cFwiLCB7XG4gICAgICB2cGM6IHZwYyxcbiAgICAgIHNlY3VyaXR5R3JvdXBOYW1lOiBgJHt0aGlzLnN0YWNrTmFtZX0tZWZzLXNnYCxcbiAgICAgIGRlc2NyaXB0aW9uOiBcIkVGUyBEZWZhdWx0IFNlY3VyaXR5IEdyb3VwXCJcbiAgICB9IGFzIFNlY3VyaXR5R3JvdXBQcm9wcyk7XG5cbiAgICB0aGlzLmVmcyA9IG5ldyBhd3NfZWZzLkZpbGVTeXN0ZW0odGhpcywgXCJFRlNGaWxlU3lzdGVtXCIsXG4gICAgICB7XG4gICAgICAgIHZwYzogdnBjLFxuICAgICAgICBmaWxlU3lzdGVtTmFtZTogdGhpcy5jb25maWcuZnNOYW1lLFxuICAgICAgICBlbmNyeXB0ZWQ6IHRydWUsXG4gICAgICAgIHNlY3VyaXR5R3JvdXA6IHRoaXMuc2csXG4gICAgICAgIHJlbW92YWxQb2xpY3k6IFJlbW92YWxQb2xpY3kuREVTVFJPWSxcbiAgICAgICAgcGVyZm9ybWFuY2VNb2RlOiBhd3NfZWZzLlBlcmZvcm1hbmNlTW9kZS5NQVhfSU8sXG4gICAgICAgIGxpZmVjeWNsZVBvbGljeTogYXdzX2Vmcy5MaWZlY3ljbGVQb2xpY3kuQUZURVJfMzBfREFZUyxcbiAgICAgIH0gYXMgRmlsZVN5c3RlbVByb3BzIC8vIGZpbGVzIGFyZSBub3QgdHJhbnNpdGlvbmVkIHRvIGluZnJlcXVlbnQgYWNjZXNzIChJQSkgc3RvcmFnZSBieSBkZWZhdWx0XG4gICAgKTtcblxuICAgIC8vIEVpdGhlciB3ZSBoYXZlIGEgc2Vjb25kYXJ5IHVzZXIgb3Igcm9vdCBBQ0xcbiAgICB0aGlzLmNvbmZpZy5hY2Nlc3NQb2ludHM/Lm1hcChhcCA9PiB7XG4gICAgICBpZiAoYXAuYWNscykge1xuICAgICAgICB0aGlzLmVmcy5hZGRBY2Nlc3NQb2ludChhcC5sb2dpY2FsSWQsIHtcbiAgICAgICAgICBjcmVhdGVBY2w6IGFwLmFjbHMsXG4gICAgICAgICAgcGF0aDogYXAucGF0aCxcbiAgICAgICAgfSlcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuZWZzLmFkZEFjY2Vzc1BvaW50KGFwLmxvZ2ljYWxJZCwge1xuICAgICAgICAgIHBhdGg6IGFwLnBhdGgsXG4gICAgICAgICAgcG9zaXhVc2VyOiBhcC5wb3NpeFVzZXIsXG4gICAgICAgIH0pXG4gICAgICB9XG4gICAgfSlcblxuICB9XG5cblxuICBjcmVhdGVQYXJhbXMoKSB7XG4gICAgLy8gRXhwb3J0IGZldyBwYXJhbWV0ZXJzIGZvciBhcHBsaWNhdGlvbiB1c2FnZVxuICAgIG5ldyBTdHJpbmdQYXJhbWV0ZXIoXG4gICAgICB0aGlzLCBcIkVGU0ZpbGVTeXN0ZW1JRFwiLFxuICAgICAge1xuICAgICAgICBwYXJhbWV0ZXJOYW1lOiBgL2FjY291bnQvc3RhY2tzLyR7dGhpcy5zdGFja05hbWV9L2Vmcy1mcy1pZGAsXG4gICAgICAgIHN0cmluZ1ZhbHVlOiB0aGlzLmVmcy5maWxlU3lzdGVtSWQsXG4gICAgICAgIGRlc2NyaXB0aW9uOiBcIkZpbGUgU3lzdGVtIElEXCJcbiAgICAgIH1cbiAgICApO1xuXG4gIH1cbn1cblxuIl19
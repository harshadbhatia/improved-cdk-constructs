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
        new aws_ssm_1.StringParameter(this, "EFSSGID", {
            parameterName: `/account/stacks/${this.stackName}/efs-sg-id`,
            stringValue: this.sg.securityGroupId,
            description: "EFS Security group ID"
        });
    }
}
exports.EFSStack = EFSStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWZzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZWZzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLDZDQUE0RDtBQUM1RCxpREFBbUY7QUFFbkYsaURBQXNEO0FBSXREOzs7R0FHRztBQUNILE1BQWEsUUFBUyxTQUFRLG1CQUFLO0lBTWpDLFlBQVksS0FBZ0IsRUFBRSxFQUFVLEVBQUUsS0FBcUI7UUFDN0QsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFFeEIsSUFBSSxDQUFDLE1BQU0sR0FBRyxLQUFNLENBQUM7UUFDckIsSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO1FBQ2pCLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQztJQUN0QixDQUFDO0lBRUQsTUFBTTtRQUNKLE1BQU0sS0FBSyxHQUFHLHlCQUFlLENBQUMsZUFBZSxDQUFDLElBQUksRUFBRSxpQkFBaUIsSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQzVGLE1BQU0sR0FBRyxHQUFHLGFBQUcsQ0FBQyxVQUFVLENBQUMsSUFBSSxFQUFFLEtBQUssRUFBRSxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDO1FBRTFELE9BQU8sR0FBRyxDQUFDO0lBQ2IsQ0FBQztJQUdELFNBQVM7O1FBRVAsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO1FBRTFCLElBQUksQ0FBQyxFQUFFLEdBQUcsSUFBSSx1QkFBYSxDQUFDLElBQUksRUFBRSxrQkFBa0IsRUFBRTtZQUNwRCxHQUFHLEVBQUUsR0FBRztZQUNSLGlCQUFpQixFQUFFLEdBQUcsSUFBSSxDQUFDLFNBQVMsU0FBUztZQUM3QyxXQUFXLEVBQUUsNEJBQTRCO1NBQ3BCLENBQUMsQ0FBQztRQUV6QixJQUFJLENBQUMsR0FBRyxHQUFHLElBQUkscUJBQU8sQ0FBQyxVQUFVLENBQUMsSUFBSSxFQUFFLGVBQWUsRUFDckQ7WUFDRSxHQUFHLEVBQUUsR0FBRztZQUNSLGNBQWMsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU07WUFDbEMsU0FBUyxFQUFFLElBQUk7WUFDZixhQUFhLEVBQUUsSUFBSSxDQUFDLEVBQUU7WUFDdEIsYUFBYSxFQUFFLDJCQUFhLENBQUMsT0FBTztZQUNwQyxlQUFlLEVBQUUscUJBQU8sQ0FBQyxlQUFlLENBQUMsTUFBTTtZQUMvQyxlQUFlLEVBQUUscUJBQU8sQ0FBQyxlQUFlLENBQUMsYUFBYTtTQUNwQyxDQUFDLDBFQUEwRTtTQUNoRyxDQUFDO1FBRUYsOENBQThDO1FBQzlDLE1BQUEsSUFBSSxDQUFDLE1BQU0sQ0FBQyxZQUFZLDBDQUFFLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBRTtZQUNqQyxJQUFJLEVBQUUsQ0FBQyxJQUFJLEVBQUU7Z0JBQ1gsSUFBSSxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsRUFBRSxDQUFDLFNBQVMsRUFBRTtvQkFDcEMsU0FBUyxFQUFFLEVBQUUsQ0FBQyxJQUFJO29CQUNsQixJQUFJLEVBQUUsRUFBRSxDQUFDLElBQUk7aUJBQ2QsQ0FBQyxDQUFBO2FBQ0g7aUJBQU07Z0JBQ0wsSUFBSSxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsRUFBRSxDQUFDLFNBQVMsRUFBRTtvQkFDcEMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxJQUFJO29CQUNiLFNBQVMsRUFBRSxFQUFFLENBQUMsU0FBUztpQkFDeEIsQ0FBQyxDQUFBO2FBQ0g7UUFDSCxDQUFDLENBQUMsQ0FBQTtJQUVKLENBQUM7SUFHRCxZQUFZO1FBQ1YsOENBQThDO1FBQzlDLElBQUkseUJBQWUsQ0FDakIsSUFBSSxFQUFFLGlCQUFpQixFQUN2QjtZQUNFLGFBQWEsRUFBRSxtQkFBbUIsSUFBSSxDQUFDLFNBQVMsWUFBWTtZQUM1RCxXQUFXLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxZQUFZO1lBQ2xDLFdBQVcsRUFBRSxnQkFBZ0I7U0FDOUIsQ0FDRixDQUFDO1FBRUYsSUFBSSx5QkFBZSxDQUNqQixJQUFJLEVBQUUsU0FBUyxFQUNmO1lBQ0UsYUFBYSxFQUFFLG1CQUFtQixJQUFJLENBQUMsU0FBUyxZQUFZO1lBQzVELFdBQVcsRUFBRSxJQUFJLENBQUMsRUFBRSxDQUFDLGVBQWU7WUFDcEMsV0FBVyxFQUFFLHVCQUF1QjtTQUNyQyxDQUNGLENBQUM7SUFFSixDQUFDO0NBQ0Y7QUFuRkQsNEJBbUZDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgYXdzX2VmcywgUmVtb3ZhbFBvbGljeSwgU3RhY2sgfSBmcm9tICdhd3MtY2RrLWxpYic7XG5pbXBvcnQgeyBJVnBjLCBTZWN1cml0eUdyb3VwLCBTZWN1cml0eUdyb3VwUHJvcHMsIFZwYyB9IGZyb20gXCJhd3MtY2RrLWxpYi9hd3MtZWMyXCI7XG5pbXBvcnQgeyBGaWxlU3lzdGVtLCBGaWxlU3lzdGVtUHJvcHMgfSBmcm9tIFwiYXdzLWNkay1saWIvYXdzLWVmc1wiO1xuaW1wb3J0IHsgU3RyaW5nUGFyYW1ldGVyIH0gZnJvbSAnYXdzLWNkay1saWIvYXdzLXNzbSc7XG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tICdjb25zdHJ1Y3RzJztcbmltcG9ydCB7IEVGU1N0YWNrUHJvcHMgfSBmcm9tICcuLi8uLi9pbnRlcmZhY2VzL2xpYi9la3MvaW50ZXJmYWNlcyc7XG5cbi8qKlxuICogRUZTIFN0YWNrIGlzIG9ubHkgcmVzcG9uc2libGUgZm9yIGNyZWF0aW5nIGVmcyBhbmQgYWNjZXNzIHBvaW50IG9ubHkuXG4gKiBTZWN1cml0eSBncm91cHMgYXJlIGNyZWF0ZWQgYnkgdGhlIFNoYXJlZCBTdGFjay5cbiAqL1xuZXhwb3J0IGNsYXNzIEVGU1N0YWNrIGV4dGVuZHMgU3RhY2sge1xuXG4gIGNvbmZpZzogRUZTU3RhY2tQcm9wc1xuICBlZnM6IEZpbGVTeXN0ZW1cbiAgc2c6IFNlY3VyaXR5R3JvdXBcblxuICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nLCBwcm9wcz86IEVGU1N0YWNrUHJvcHMpIHtcbiAgICBzdXBlcihzY29wZSwgaWQsIHByb3BzKTtcblxuICAgIHRoaXMuY29uZmlnID0gcHJvcHMhO1xuICAgIHRoaXMuY3JlYXRlRWZzKCk7XG4gICAgdGhpcy5jcmVhdGVQYXJhbXMoKTtcbiAgfVxuXG4gIGdldFZQQygpOiBJVnBjIHtcbiAgICBjb25zdCB2cGNJZCA9IFN0cmluZ1BhcmFtZXRlci52YWx1ZUZyb21Mb29rdXAodGhpcywgJy9hY2NvdW50L3ZwYy9pZCcgfHwgdGhpcy5jb25maWcudnBjSWQpO1xuICAgIGNvbnN0IHZwYyA9IFZwYy5mcm9tTG9va3VwKHRoaXMsICdWUEMnLCB7IHZwY0lkOiB2cGNJZCB9KTtcblxuICAgIHJldHVybiB2cGM7XG4gIH1cblxuXG4gIGNyZWF0ZUVmcygpIHtcblxuICAgIGNvbnN0IHZwYyA9IHRoaXMuZ2V0VlBDKCk7XG5cbiAgICB0aGlzLnNnID0gbmV3IFNlY3VyaXR5R3JvdXAodGhpcywgXCJFRlNTZWN1cml0eUdyb3VwXCIsIHtcbiAgICAgIHZwYzogdnBjLFxuICAgICAgc2VjdXJpdHlHcm91cE5hbWU6IGAke3RoaXMuc3RhY2tOYW1lfS1lZnMtc2dgLFxuICAgICAgZGVzY3JpcHRpb246IFwiRUZTIERlZmF1bHQgU2VjdXJpdHkgR3JvdXBcIlxuICAgIH0gYXMgU2VjdXJpdHlHcm91cFByb3BzKTtcblxuICAgIHRoaXMuZWZzID0gbmV3IGF3c19lZnMuRmlsZVN5c3RlbSh0aGlzLCBcIkVGU0ZpbGVTeXN0ZW1cIixcbiAgICAgIHtcbiAgICAgICAgdnBjOiB2cGMsXG4gICAgICAgIGZpbGVTeXN0ZW1OYW1lOiB0aGlzLmNvbmZpZy5mc05hbWUsXG4gICAgICAgIGVuY3J5cHRlZDogdHJ1ZSxcbiAgICAgICAgc2VjdXJpdHlHcm91cDogdGhpcy5zZyxcbiAgICAgICAgcmVtb3ZhbFBvbGljeTogUmVtb3ZhbFBvbGljeS5ERVNUUk9ZLFxuICAgICAgICBwZXJmb3JtYW5jZU1vZGU6IGF3c19lZnMuUGVyZm9ybWFuY2VNb2RlLk1BWF9JTyxcbiAgICAgICAgbGlmZWN5Y2xlUG9saWN5OiBhd3NfZWZzLkxpZmVjeWNsZVBvbGljeS5BRlRFUl8zMF9EQVlTLFxuICAgICAgfSBhcyBGaWxlU3lzdGVtUHJvcHMgLy8gZmlsZXMgYXJlIG5vdCB0cmFuc2l0aW9uZWQgdG8gaW5mcmVxdWVudCBhY2Nlc3MgKElBKSBzdG9yYWdlIGJ5IGRlZmF1bHRcbiAgICApO1xuXG4gICAgLy8gRWl0aGVyIHdlIGhhdmUgYSBzZWNvbmRhcnkgdXNlciBvciByb290IEFDTFxuICAgIHRoaXMuY29uZmlnLmFjY2Vzc1BvaW50cz8ubWFwKGFwID0+IHtcbiAgICAgIGlmIChhcC5hY2xzKSB7XG4gICAgICAgIHRoaXMuZWZzLmFkZEFjY2Vzc1BvaW50KGFwLmxvZ2ljYWxJZCwge1xuICAgICAgICAgIGNyZWF0ZUFjbDogYXAuYWNscyxcbiAgICAgICAgICBwYXRoOiBhcC5wYXRoLFxuICAgICAgICB9KVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5lZnMuYWRkQWNjZXNzUG9pbnQoYXAubG9naWNhbElkLCB7XG4gICAgICAgICAgcGF0aDogYXAucGF0aCxcbiAgICAgICAgICBwb3NpeFVzZXI6IGFwLnBvc2l4VXNlcixcbiAgICAgICAgfSlcbiAgICAgIH1cbiAgICB9KVxuXG4gIH1cblxuXG4gIGNyZWF0ZVBhcmFtcygpIHtcbiAgICAvLyBFeHBvcnQgZmV3IHBhcmFtZXRlcnMgZm9yIGFwcGxpY2F0aW9uIHVzYWdlXG4gICAgbmV3IFN0cmluZ1BhcmFtZXRlcihcbiAgICAgIHRoaXMsIFwiRUZTRmlsZVN5c3RlbUlEXCIsXG4gICAgICB7XG4gICAgICAgIHBhcmFtZXRlck5hbWU6IGAvYWNjb3VudC9zdGFja3MvJHt0aGlzLnN0YWNrTmFtZX0vZWZzLWZzLWlkYCxcbiAgICAgICAgc3RyaW5nVmFsdWU6IHRoaXMuZWZzLmZpbGVTeXN0ZW1JZCxcbiAgICAgICAgZGVzY3JpcHRpb246IFwiRmlsZSBTeXN0ZW0gSURcIlxuICAgICAgfVxuICAgICk7XG5cbiAgICBuZXcgU3RyaW5nUGFyYW1ldGVyKFxuICAgICAgdGhpcywgXCJFRlNTR0lEXCIsXG4gICAgICB7XG4gICAgICAgIHBhcmFtZXRlck5hbWU6IGAvYWNjb3VudC9zdGFja3MvJHt0aGlzLnN0YWNrTmFtZX0vZWZzLXNnLWlkYCxcbiAgICAgICAgc3RyaW5nVmFsdWU6IHRoaXMuc2cuc2VjdXJpdHlHcm91cElkLFxuICAgICAgICBkZXNjcmlwdGlvbjogXCJFRlMgU2VjdXJpdHkgZ3JvdXAgSURcIlxuICAgICAgfVxuICAgICk7XG5cbiAgfVxufVxuXG4iXX0=
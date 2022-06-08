"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SFTPUsersNestedStack = void 0;
const aws_cdk_lib_1 = require("aws-cdk-lib");
const aws_iam_1 = require("aws-cdk-lib/aws-iam");
const aws_transfer_1 = require("aws-cdk-lib/aws-transfer");
const file_reader_1 = require("../utils/file-reader");
class SFTPUsersNestedStack extends aws_cdk_lib_1.NestedStack {
    constructor(scope, id, userCfg, sftpBucketName, sftpAttrServerId, props) {
        super(scope, id, props);
        this.config = userCfg;
        this.sftpBucketName = sftpBucketName;
        this.sftpAttrServerId = sftpAttrServerId;
        this.createUsers(userCfg);
    }
    createUserBucketPolcies(userDir) {
        const allowListBucket = new aws_iam_1.PolicyStatement({
            sid: 'AllowListingOfUserFolder',
            actions: ['s3:ListBucket'],
            effect: aws_iam_1.Effect.ALLOW,
            resources: [`arn:aws:s3:::${this.sftpBucketName}`],
        });
        const homeDirObjectAccess = new aws_iam_1.PolicyStatement({
            sid: 'HomeDirObjectAccess',
            actions: [
                's3:PutObject',
                's3:GetObject',
                's3:GetObjectVersion',
                's3:GetObjectACL',
                's3:PutObjectACL',
                's3:DeleteObject',
                's3:DeleteObjectVersion',
            ],
            effect: aws_iam_1.Effect.ALLOW,
            resources: [`arn:aws:s3:::${this.sftpBucketName}/home/${userDir}/*`],
        });
        const userBucketInlinePolicyDocument = new aws_iam_1.PolicyDocument({
            statements: [allowListBucket, homeDirObjectAccess],
        });
        return userBucketInlinePolicyDocument;
    }
    createUserScopedDownRole(user) {
        return new aws_iam_1.Role(this, `UserBucketAccessRole${user}`, {
            roleName: `SFTP-S3-Role-${user}`,
            description: `Allow home bucket folder access for the ${user}`,
            assumedBy: new aws_iam_1.CompositePrincipal(new aws_iam_1.ServicePrincipal('transfer.amazonaws.com')),
            inlinePolicies: {
                DeploymentPolicies: this.createUserBucketPolcies(user),
            },
            // permissionsBoundary
        });
    }
    getUserKeys(publicKeyPath) {
        const buffer = (0, file_reader_1.readAnyFile)(publicKeyPath, new file_reader_1.TextReader());
        return [buffer.toString()];
    }
    createMapping(user, folder, items) {
        const x = [];
        // If we have empty sub tree we just want directories
        if (items.length === 0) {
            x.push({
                entry: `/${folder}`,
                target: `/${this.sftpBucketName}/home/${user}/${folder}`,
            });
        }
        else {
            Object.entries(items).map(([key, value]) => {
                x.push({
                    entry: `${folder}/${value}`,
                    target: `/${this.sftpBucketName}/home/${folder}/${value}`,
                });
            });
        }
        return x;
    }
    createDirectory(user, dirStructure, acc) {
        Object.entries(dirStructure).map(([dir, value]) => {
            if (typeof value === 'string') {
                console.log('TODO');
            }
            else if (Array.isArray(value)) {
                acc.push(...this.createMapping(user, `${dir}`, value));
            }
            else {
                this.createDirectory(user, value, acc);
            }
        });
    }
    createUsers(userCfg) {
        Object.entries(userCfg.users).map(([i, user]) => {
            const homeDirMappings = [];
            this.createDirectory(user.name, user.dirStructure, homeDirMappings);
            // console.log("Final directory structure", homeDirMappings)
            new aws_transfer_1.CfnUser(this, `User${i}`, {
                serverId: this.sftpAttrServerId,
                userName: user.name,
                homeDirectoryMappings: homeDirMappings,
                homeDirectoryType: 'LOGICAL',
                role: this.createUserScopedDownRole(user.name).roleArn,
                sshPublicKeys: this.getUserKeys((0, file_reader_1.getPath)(user.publicKeyPath)),
            });
        });
    }
}
exports.SFTPUsersNestedStack = SFTPUsersNestedStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2Z0cC1uZXN0ZWQtdXNlcnMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJzZnRwLW5lc3RlZC11c2Vycy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSw2Q0FBNEQ7QUFDNUQsaURBTzZCO0FBQzdCLDJEQUFtRDtBQUduRCxzREFBd0U7QUFFeEUsTUFBYSxvQkFBcUIsU0FBUSx5QkFBVztJQUtuRCxZQUNFLEtBQWdCLEVBQ2hCLEVBQVUsRUFDVixPQUFjLEVBQ2QsY0FBc0IsRUFDdEIsZ0JBQXdCLEVBQ3hCLEtBQXdCO1FBRXhCLEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBRXhCLElBQUksQ0FBQyxNQUFNLEdBQUcsT0FBTyxDQUFDO1FBQ3RCLElBQUksQ0FBQyxjQUFjLEdBQUcsY0FBYyxDQUFDO1FBQ3JDLElBQUksQ0FBQyxnQkFBZ0IsR0FBRyxnQkFBZ0IsQ0FBQztRQUV6QyxJQUFJLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBQzVCLENBQUM7SUFFRCx1QkFBdUIsQ0FBQyxPQUFlO1FBQ3JDLE1BQU0sZUFBZSxHQUFHLElBQUkseUJBQWUsQ0FBQztZQUMxQyxHQUFHLEVBQUUsMEJBQTBCO1lBQy9CLE9BQU8sRUFBRSxDQUFDLGVBQWUsQ0FBQztZQUMxQixNQUFNLEVBQUUsZ0JBQU0sQ0FBQyxLQUFLO1lBQ3BCLFNBQVMsRUFBRSxDQUFDLGdCQUFnQixJQUFJLENBQUMsY0FBYyxFQUFFLENBQUM7U0FDbkQsQ0FBQyxDQUFDO1FBRUgsTUFBTSxtQkFBbUIsR0FBRyxJQUFJLHlCQUFlLENBQUM7WUFDOUMsR0FBRyxFQUFFLHFCQUFxQjtZQUMxQixPQUFPLEVBQUU7Z0JBQ1AsY0FBYztnQkFDZCxjQUFjO2dCQUNkLHFCQUFxQjtnQkFDckIsaUJBQWlCO2dCQUNqQixpQkFBaUI7Z0JBQ2pCLGlCQUFpQjtnQkFDakIsd0JBQXdCO2FBQ3pCO1lBQ0QsTUFBTSxFQUFFLGdCQUFNLENB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QUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsRUFBRSxFQUFFO1lBQzlDLE1BQU0sZUFBZSxHQUE0QyxFQUFFLENBQUM7WUFDcEUsSUFBSSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxZQUFZLEVBQUUsZUFBZSxDQUFDLENBQUM7WUFFcEUsNERBQTREO1lBRTVELElBQUksc0JBQU8sQ0FBQyxJQUFJLEVBQUUsT0FBTyxDQUFDLEVBQUUsRUFBRTtnQkFDNUIsUUFBUSxFQUFFLElBQUksQ0FBQyxnQkFBZ0I7Z0JBQy9CLFFBQVEsRUFBRSxJQUFJLENBQUMsSUFBSTtnQkFDbkIscUJBQXFCLEVBQUUsZUFBZTtnQkFDdEMsaUJBQWlCLEVBQUUsU0FBUztnQkFDNUIsSUFBSSxFQUFFLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsT0FBTztnQkFDdEQsYUFBYSxFQUFFLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBQSxxQkFBTyxFQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQzthQUM3RCxDQUFDLENBQUM7UUFDTCxDQUFDLENBQUMsQ0FBQztJQUNMLENBQUM7Q0FDRjtBQTVIRCxvREE0SEMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBOZXN0ZWRTdGFjaywgTmVzdGVkU3RhY2tQcm9wcyB9IGZyb20gJ2F3cy1jZGstbGliJztcbmltcG9ydCB7XG4gIENvbXBvc2l0ZVByaW5jaXBhbCxcbiAgRWZmZWN0LFxuICBQb2xpY3lEb2N1bWVudCxcbiAgUG9saWN5U3RhdGVtZW50LFxuICBSb2xlLFxuICBTZXJ2aWNlUHJpbmNpcGFsLFxufSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtaWFtJztcbmltcG9ydCB7IENmblVzZXIgfSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtdHJhbnNmZXInO1xuaW1wb3J0IHsgQ29uc3RydWN0IH0gZnJvbSAnY29uc3RydWN0cyc7XG5pbXBvcnQgeyBEaXJJdGVtLCBVc2VycyB9IGZyb20gJy4uLy4uL2ludGVyZmFjZXMvbGliL3NmdHAvaW50ZXJmYWNlcyc7XG5pbXBvcnQgeyBnZXRQYXRoLCByZWFkQW55RmlsZSwgVGV4dFJlYWRlciB9IGZyb20gJy4uL3V0aWxzL2ZpbGUtcmVhZGVyJztcblxuZXhwb3J0IGNsYXNzIFNGVFBVc2Vyc05lc3RlZFN0YWNrIGV4dGVuZHMgTmVzdGVkU3RhY2sge1xuICBjb25maWc6IFVzZXJzO1xuICBzZnRwQnVja2V0TmFtZTogc3RyaW5nO1xuICBzZnRwQXR0clNlcnZlcklkOiBzdHJpbmc7XG5cbiAgY29uc3RydWN0b3IoXG4gICAgc2NvcGU6IENvbnN0cnVjdCxcbiAgICBpZDogc3RyaW5nLFxuICAgIHVzZXJDZmc6IFVzZXJzLFxuICAgIHNmdHBCdWNrZXROYW1lOiBzdHJpbmcsXG4gICAgc2Z0cEF0dHJTZXJ2ZXJJZDogc3RyaW5nLFxuICAgIHByb3BzPzogTmVzdGVkU3RhY2tQcm9wcyxcbiAgKSB7XG4gICAgc3VwZXIoc2NvcGUsIGlkLCBwcm9wcyk7XG5cbiAgICB0aGlzLmNvbmZpZyA9IHVzZXJDZmc7XG4gICAgdGhpcy5zZnRwQnVja2V0TmFtZSA9IHNmdHBCdWNrZXROYW1lO1xuICAgIHRoaXMuc2Z0cEF0dHJTZXJ2ZXJJZCA9IHNmdHBBdHRyU2VydmVySWQ7XG5cbiAgICB0aGlzLmNyZWF0ZVVzZXJzKHVzZXJDZmcpO1xuICB9XG5cbiAgY3JlYXRlVXNlckJ1Y2tldFBvbGNpZXModXNlckRpcjogc3RyaW5nKTogUG9saWN5RG9jdW1lbnQge1xuICAgIGNvbnN0IGFsbG93TGlzdEJ1Y2tldCA9IG5ldyBQb2xpY3lTdGF0ZW1lbnQoe1xuICAgICAgc2lkOiAnQWxsb3dMaXN0aW5nT2ZVc2VyRm9sZGVyJyxcbiAgICAgIGFjdGlvbnM6IFsnczM6TGlzdEJ1Y2tldCddLFxuICAgICAgZWZmZWN0OiBFZmZlY3QuQUxMT1csXG4gICAgICByZXNvdXJjZXM6IFtgYXJuOmF3czpzMzo6OiR7dGhpcy5zZnRwQnVja2V0TmFtZX1gXSxcbiAgICB9KTtcblxuICAgIGNvbnN0IGhvbWVEaXJPYmplY3RBY2Nlc3MgPSBuZXcgUG9saWN5U3RhdGVtZW50KHtcbiAgICAgIHNpZDogJ0hvbWVEaXJPYmplY3RBY2Nlc3MnLFxuICAgICAgYWN0aW9uczogW1xuICAgICAgICAnczM6UHV0T2JqZWN0JyxcbiAgICAgICAgJ3MzOkdldE9iamVjdCcsXG4gICAgICAgICdzMzpHZXRPYmplY3RWZXJzaW9uJyxcbiAgICAgICAgJ3MzOkdldE9iamVjdEFDTCcsXG4gICAgICAgICdzMzpQdXRPYmplY3RBQ0wnLFxuICAgICAgICAnczM6RGVsZXRlT2JqZWN0JyxcbiAgICAgICAgJ3MzOkRlbGV0ZU9iamVjdFZlcnNpb24nLFxuICAgICAgXSxcbiAgICAgIGVmZmVjdDogRWZmZWN0LkFMTE9XLFxuICAgICAgcmVzb3VyY2VzOiBbYGFybjphd3M6czM6Ojoke3RoaXMuc2Z0cEJ1Y2tldE5hbWV9L2hvbWUvJHt1c2VyRGlyfS8qYF0sXG4gICAgfSk7XG5cbiAgICBjb25zdCB1c2VyQnVja2V0SW5saW5lUG9saWN5RG9jdW1lbnQgPSBuZXcgUG9saWN5RG9jdW1lbnQoe1xuICAgICAgc3RhdGVtZW50czogW2FsbG93TGlzdEJ1Y2tldCwgaG9tZURpck9iamVjdEFjY2Vzc10sXG4gICAgfSk7XG5cbiAgICByZXR1cm4gdXNlckJ1Y2tldElubGluZVBvbGljeURvY3VtZW50O1xuICB9XG5cbiAgY3JlYXRlVXNlclNjb3BlZERvd25Sb2xlKHVzZXI6IHN0cmluZyk6IFJvbGUge1xuICAgIHJldHVybiBuZXcgUm9sZSh0aGlzLCBgVXNlckJ1Y2tldEFjY2Vzc1JvbGUke3VzZXJ9YCwge1xuICAgICAgcm9sZU5hbWU6IGBTRlRQLVMzLVJvbGUtJHt1c2VyfWAsXG4gICAgICBkZXNjcmlwdGlvbjogYEFsbG93IGhvbWUgYnVja2V0IGZvbGRlciBhY2Nlc3MgZm9yIHRoZSAke3VzZXJ9YCxcbiAgICAgIGFzc3VtZWRCeTogbmV3IENvbXBvc2l0ZVByaW5jaXBhbChuZXcgU2VydmljZVByaW5jaXBhbCgndHJhbnNmZXIuYW1hem9uYXdzLmNvbScpKSxcbiAgICAgIGlubGluZVBvbGljaWVzOiB7XG4gICAgICAgIERlcGxveW1lbnRQb2xpY2llczogdGhpcy5jcmVhdGVVc2VyQnVja2V0UG9sY2llcyh1c2VyKSxcbiAgICAgIH0sXG4gICAgICAvLyBwZXJtaXNzaW9uc0JvdW5kYXJ5XG4gICAgfSk7XG4gIH1cblxuICBnZXRVc2VyS2V5cyhwdWJsaWNLZXlQYXRoOiBzdHJpbmcpOiBzdHJpbmdbXSB7XG4gICAgY29uc3QgYnVmZmVyID0gcmVhZEFueUZpbGUocHVibGljS2V5UGF0aCwgbmV3IFRleHRSZWFkZXIoKSk7XG4gICAgcmV0dXJuIFtidWZmZXIudG9TdHJpbmcoKV07XG4gIH1cblxuICBjcmVhdGVNYXBwaW5nKHVzZXI6IHN0cmluZywgZm9sZGVyOiBzdHJpbmcsIGl0ZW1zOiBEaXJJdGVtW10pOiBDZm5Vc2VyLkhvbWVEaXJlY3RvcnlNYXBFbnRyeVByb3BlcnR5W10ge1xuICAgIGNvbnN0IHg6IENmblVzZXIuSG9tZURpcmVjdG9yeU1hcEVudHJ5UHJvcGVydHlbXSA9IFtdO1xuICAgIC8vIElmIHdlIGhhdmUgZW1wdHkgc3ViIHRyZWUgd2UganVzdCB3YW50IGRpcmVjdG9yaWVzXG4gICAgaWYgKGl0ZW1zLmxlbmd0aCA9PT0gMCkge1xuICAgICAgeC5wdXNoKHtcbiAgICAgICAgZW50cnk6IGAvJHtmb2xkZXJ9YCxcbiAgICAgICAgdGFyZ2V0OiBgLyR7dGhpcy5zZnRwQnVja2V0TmFtZX0vaG9tZS8ke3VzZXJ9LyR7Zm9sZGVyfWAsXG4gICAgICB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgT2JqZWN0LmVudHJpZXMoaXRlbXMpLm1hcCgoW2tleSwgdmFsdWVdKSA9PiB7XG4gICAgICAgIHgucHVzaCh7XG4gICAgICAgICAgZW50cnk6IGAke2ZvbGRlcn0vJHt2YWx1ZX1gLFxuICAgICAgICAgIHRhcmdldDogYC8ke3RoaXMuc2Z0cEJ1Y2tldE5hbWV9L2hvbWUvJHtmb2xkZXJ9LyR7dmFsdWV9YCxcbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICByZXR1cm4geDtcbiAgfVxuXG4gIGNyZWF0ZURpcmVjdG9yeShcbiAgICB1c2VyOiBzdHJpbmcsXG4gICAgZGlyU3RydWN0dXJlOiB7XG4gICAgICBba2V5OiBzdHJpbmddOiBEaXJJdGVtW107XG4gICAgfSxcbiAgICBhY2M6IENmblVzZXIuSG9tZURpcmVjdG9yeU1hcEVudHJ5UHJvcGVydHlbXSxcbiAgKTogdm9pZCB7XG4gICAgT2JqZWN0LmVudHJpZXMoZGlyU3RydWN0dXJlKS5tYXAoKFtkaXIsIHZhbHVlXSkgPT4ge1xuICAgICAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgY29uc29sZS5sb2coJ1RPRE8nKTtcbiAgICAgIH0gZWxzZSBpZiAoQXJyYXkuaXNBcnJheSh2YWx1ZSkpIHtcbiAgICAgICAgYWNjLnB1c2goLi4udGhpcy5jcmVhdGVNYXBwaW5nKHVzZXIsIGAke2Rpcn1gLCB2YWx1ZSkpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5jcmVhdGVEaXJlY3RvcnkodXNlciwgdmFsdWUsIGFjYyk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICBjcmVhdGVVc2Vycyh1c2VyQ2ZnOiBVc2Vycykge1xuICAgIE9iamVjdC5lbnRyaWVzKHVzZXJDZmcudXNlcnMpLm1hcCgoW2ksIHVzZXJdKSA9PiB7XG4gICAgICBjb25zdCBob21lRGlyTWFwcGluZ3M6IENmblVzZXIuSG9tZURpcmVjdG9yeU1hcEVudHJ5UHJvcGVydHlbXSA9IFtdO1xuICAgICAgdGhpcy5jcmVhdGVEaXJlY3RvcnkodXNlci5uYW1lLCB1c2VyLmRpclN0cnVjdHVyZSwgaG9tZURpck1hcHBpbmdzKTtcblxuICAgICAgLy8gY29uc29sZS5sb2coXCJGaW5hbCBkaXJlY3Rvcnkgc3RydWN0dXJlXCIsIGhvbWVEaXJNYXBwaW5ncylcblxuICAgICAgbmV3IENmblVzZXIodGhpcywgYFVzZXIke2l9YCwge1xuICAgICAgICBzZXJ2ZXJJZDogdGhpcy5zZnRwQXR0clNlcnZlcklkLFxuICAgICAgICB1c2VyTmFtZTogdXNlci5uYW1lLFxuICAgICAgICBob21lRGlyZWN0b3J5TWFwcGluZ3M6IGhvbWVEaXJNYXBwaW5ncyxcbiAgICAgICAgaG9tZURpcmVjdG9yeVR5cGU6ICdMT0dJQ0FMJyxcbiAgICAgICAgcm9sZTogdGhpcy5jcmVhdGVVc2VyU2NvcGVkRG93blJvbGUodXNlci5uYW1lKS5yb2xlQXJuLFxuICAgICAgICBzc2hQdWJsaWNLZXlzOiB0aGlzLmdldFVzZXJLZXlzKGdldFBhdGgodXNlci5wdWJsaWNLZXlQYXRoKSksXG4gICAgICB9KTtcbiAgICB9KTtcbiAgfVxufVxuIl19
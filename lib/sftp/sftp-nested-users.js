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
        });
    }
    getUserKeys(publicKeyPath) {
        const buffer = file_reader_1.readAnyFile(publicKeyPath, new file_reader_1.TextReader());
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
                sshPublicKeys: this.getUserKeys(file_reader_1.getPath(user.publicKeyPath)),
            });
        });
    }
}
exports.SFTPUsersNestedStack = SFTPUsersNestedStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2Z0cC1uZXN0ZWQtdXNlcnMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJzZnRwLW5lc3RlZC11c2Vycy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSw2Q0FBNEQ7QUFDNUQsaURBTzZCO0FBQzdCLDJEQUFtRDtBQUduRCxzREFBd0U7QUFFeEUsTUFBYSxvQkFBcUIsU0FBUSx5QkFBVztJQUtuRCxZQUNFLEtBQWdCLEVBQ2hCLEVBQVUsRUFDVixPQUFjLEVBQ2QsY0FBc0IsRUFDdEIsZ0JBQXdCLEVBQ3hCLEtBQXdCO1FBRXhCLEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBRXhCLElBQUksQ0FBQyxNQUFNLEdBQUcsT0FBTyxDQUFDO1FBQ3RCLElBQUksQ0FBQyxjQUFjLEdBQUcsY0FBYyxDQUFDO1FBQ3JDLElBQUksQ0FBQyxnQkFBZ0IsR0FBRyxnQkFBZ0IsQ0FBQztRQUV6QyxJQUFJLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBQzVCLENBQUM7SUFFRCx1QkFBdUIsQ0FBQyxPQUFlO1FBQ3JDLE1BQU0sZUFBZSxHQUFHLElBQUkseUJBQWUsQ0FBQztZQUMxQyxHQUFHLEVBQUUsMEJBQTBCO1lBQy9CLE9BQU8sRUFBRSxDQUFDLGVBQWUsQ0FBQztZQUMxQixNQUFNLEVBQUUsZ0JBQU0sQ0FBQyxLQUFLO1lBQ3BCLFNBQVMsRUFBRSxDQUFDLGdCQUFnQixJQUFJLENBQUMsY0FBYyxFQUFFLENBQUM7U0FDbkQsQ0FBQyxDQUFDO1FBRUgsTUFBTSxtQkFBbUIsR0FBRyxJQUFJLHlCQUFlLENBQUM7WUFDOUMsR0FBRyxFQUFFLHFCQUFxQjtZQUMxQixPQUFPLEVBQUU7Z0JBQ1AsY0FBYztnQkFDZCxjQUFjO2dCQUNkLHFCQUFxQjtnQkFDckIsaUJBQWlCO2dCQUNqQixpQkFBaUI7Z0JBQ2pCLGlCQUFpQjtnQkFDakIsd0JBQXdCO2FBQ3pCO1lBQ0QsTUFBTSxFQUFFLGdCQUFNLENB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LENBQUMsRUFBRSxJQUFJLENBQUMsRUFBRSxFQUFFO1lBQzlDLE1BQU0sZUFBZSxHQUE0QyxFQUFFLENBQUM7WUFDcEUsSUFBSSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxZQUFZLEVBQUUsZUFBZSxDQUFDLENBQUM7WUFFcEUsNERBQTREO1lBRTVELElBQUksc0JBQU8sQ0FBQyxJQUFJLEVBQUUsT0FBTyxDQUFDLEVBQUUsRUFBRTtnQkFDNUIsUUFBUSxFQUFFLElBQUksQ0FBQyxnQkFBZ0I7Z0JBQy9CLFFBQVEsRUFBRSxJQUFJLENBQUMsSUFBSTtnQkFDbkIscUJBQXFCLEVBQUUsZUFBZTtnQkFDdEMsaUJBQWlCLEVBQUUsU0FBUztnQkFDNUIsSUFBSSxFQUFFLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsT0FBTztnQkFDdEQsYUFBYSxFQUFFLElBQUksQ0FBQyxXQUFXLENBQUMscUJBQU8sQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUM7YUFDN0QsQ0FBQyxDQUFDO1FBQ0wsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDO0NBQ0Y7QUE1SEQsb0RBNEhDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgTmVzdGVkU3RhY2ssIE5lc3RlZFN0YWNrUHJvcHMgfSBmcm9tICdhd3MtY2RrLWxpYic7XG5pbXBvcnQge1xuICBDb21wb3NpdGVQcmluY2lwYWwsXG4gIEVmZmVjdCxcbiAgUG9saWN5RG9jdW1lbnQsXG4gIFBvbGljeVN0YXRlbWVudCxcbiAgUm9sZSxcbiAgU2VydmljZVByaW5jaXBhbCxcbn0gZnJvbSAnYXdzLWNkay1saWIvYXdzLWlhbSc7XG5pbXBvcnQgeyBDZm5Vc2VyIH0gZnJvbSAnYXdzLWNkay1saWIvYXdzLXRyYW5zZmVyJztcbmltcG9ydCB7IENvbnN0cnVjdCB9IGZyb20gJ2NvbnN0cnVjdHMnO1xuaW1wb3J0IHsgRGlySXRlbSwgVXNlcnMgfSBmcm9tICcuLi8uLi9pbnRlcmZhY2VzL2xpYi9zZnRwL2ludGVyZmFjZXMnO1xuaW1wb3J0IHsgZ2V0UGF0aCwgcmVhZEFueUZpbGUsIFRleHRSZWFkZXIgfSBmcm9tICcuLi91dGlscy9maWxlLXJlYWRlcic7XG5cbmV4cG9ydCBjbGFzcyBTRlRQVXNlcnNOZXN0ZWRTdGFjayBleHRlbmRzIE5lc3RlZFN0YWNrIHtcbiAgY29uZmlnOiBVc2VycztcbiAgc2Z0cEJ1Y2tldE5hbWU6IHN0cmluZztcbiAgc2Z0cEF0dHJTZXJ2ZXJJZDogc3RyaW5nO1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgIHNjb3BlOiBDb25zdHJ1Y3QsXG4gICAgaWQ6IHN0cmluZyxcbiAgICB1c2VyQ2ZnOiBVc2VycyxcbiAgICBzZnRwQnVja2V0TmFtZTogc3RyaW5nLFxuICAgIHNmdHBBdHRyU2VydmVySWQ6IHN0cmluZyxcbiAgICBwcm9wcz86IE5lc3RlZFN0YWNrUHJvcHMsXG4gICkge1xuICAgIHN1cGVyKHNjb3BlLCBpZCwgcHJvcHMpO1xuXG4gICAgdGhpcy5jb25maWcgPSB1c2VyQ2ZnO1xuICAgIHRoaXMuc2Z0cEJ1Y2tldE5hbWUgPSBzZnRwQnVja2V0TmFtZTtcbiAgICB0aGlzLnNmdHBBdHRyU2VydmVySWQgPSBzZnRwQXR0clNlcnZlcklkO1xuXG4gICAgdGhpcy5jcmVhdGVVc2Vycyh1c2VyQ2ZnKTtcbiAgfVxuXG4gIGNyZWF0ZVVzZXJCdWNrZXRQb2xjaWVzKHVzZXJEaXI6IHN0cmluZyk6IFBvbGljeURvY3VtZW50IHtcbiAgICBjb25zdCBhbGxvd0xpc3RCdWNrZXQgPSBuZXcgUG9saWN5U3RhdGVtZW50KHtcbiAgICAgIHNpZDogJ0FsbG93TGlzdGluZ09mVXNlckZvbGRlcicsXG4gICAgICBhY3Rpb25zOiBbJ3MzOkxpc3RCdWNrZXQnXSxcbiAgICAgIGVmZmVjdDogRWZmZWN0LkFMTE9XLFxuICAgICAgcmVzb3VyY2VzOiBbYGFybjphd3M6czM6Ojoke3RoaXMuc2Z0cEJ1Y2tldE5hbWV9YF0sXG4gICAgfSk7XG5cbiAgICBjb25zdCBob21lRGlyT2JqZWN0QWNjZXNzID0gbmV3IFBvbGljeVN0YXRlbWVudCh7XG4gICAgICBzaWQ6ICdIb21lRGlyT2JqZWN0QWNjZXNzJyxcbiAgICAgIGFjdGlvbnM6IFtcbiAgICAgICAgJ3MzOlB1dE9iamVjdCcsXG4gICAgICAgICdzMzpHZXRPYmplY3QnLFxuICAgICAgICAnczM6R2V0T2JqZWN0VmVyc2lvbicsXG4gICAgICAgICdzMzpHZXRPYmplY3RBQ0wnLFxuICAgICAgICAnczM6UHV0T2JqZWN0QUNMJyxcbiAgICAgICAgJ3MzOkRlbGV0ZU9iamVjdCcsXG4gICAgICAgICdzMzpEZWxldGVPYmplY3RWZXJzaW9uJyxcbiAgICAgIF0sXG4gICAgICBlZmZlY3Q6IEVmZmVjdC5BTExPVyxcbiAgICAgIHJlc291cmNlczogW2Bhcm46YXdzOnMzOjo6JHt0aGlzLnNmdHBCdWNrZXROYW1lfS9ob21lLyR7dXNlckRpcn0vKmBdLFxuICAgIH0pO1xuXG4gICAgY29uc3QgdXNlckJ1Y2tldElubGluZVBvbGljeURvY3VtZW50ID0gbmV3IFBvbGljeURvY3VtZW50KHtcbiAgICAgIHN0YXRlbWVudHM6IFthbGxvd0xpc3RCdWNrZXQsIGhvbWVEaXJPYmplY3RBY2Nlc3NdLFxuICAgIH0pO1xuXG4gICAgcmV0dXJuIHVzZXJCdWNrZXRJbmxpbmVQb2xpY3lEb2N1bWVudDtcbiAgfVxuXG4gIGNyZWF0ZVVzZXJTY29wZWREb3duUm9sZSh1c2VyOiBzdHJpbmcpOiBSb2xlIHtcbiAgICByZXR1cm4gbmV3IFJvbGUodGhpcywgYFVzZXJCdWNrZXRBY2Nlc3NSb2xlJHt1c2VyfWAsIHtcbiAgICAgIHJvbGVOYW1lOiBgU0ZUUC1TMy1Sb2xlLSR7dXNlcn1gLFxuICAgICAgZGVzY3JpcHRpb246IGBBbGxvdyBob21lIGJ1Y2tldCBmb2xkZXIgYWNjZXNzIGZvciB0aGUgJHt1c2VyfWAsXG4gICAgICBhc3N1bWVkQnk6IG5ldyBDb21wb3NpdGVQcmluY2lwYWwobmV3IFNlcnZpY2VQcmluY2lwYWwoJ3RyYW5zZmVyLmFtYXpvbmF3cy5jb20nKSksXG4gICAgICBpbmxpbmVQb2xpY2llczoge1xuICAgICAgICBEZXBsb3ltZW50UG9saWNpZXM6IHRoaXMuY3JlYXRlVXNlckJ1Y2tldFBvbGNpZXModXNlciksXG4gICAgICB9LFxuICAgICAgLy8gcGVybWlzc2lvbnNCb3VuZGFyeVxuICAgIH0pO1xuICB9XG5cbiAgZ2V0VXNlcktleXMocHVibGljS2V5UGF0aDogc3RyaW5nKTogc3RyaW5nW10ge1xuICAgIGNvbnN0IGJ1ZmZlciA9IHJlYWRBbnlGaWxlKHB1YmxpY0tleVBhdGgsIG5ldyBUZXh0UmVhZGVyKCkpO1xuICAgIHJldHVybiBbYnVmZmVyLnRvU3RyaW5nKCldO1xuICB9XG5cbiAgY3JlYXRlTWFwcGluZyh1c2VyOiBzdHJpbmcsIGZvbGRlcjogc3RyaW5nLCBpdGVtczogRGlySXRlbVtdKTogQ2ZuVXNlci5Ib21lRGlyZWN0b3J5TWFwRW50cnlQcm9wZXJ0eVtdIHtcbiAgICBjb25zdCB4OiBDZm5Vc2VyLkhvbWVEaXJlY3RvcnlNYXBFbnRyeVByb3BlcnR5W10gPSBbXTtcbiAgICAvLyBJZiB3ZSBoYXZlIGVtcHR5IHN1YiB0cmVlIHdlIGp1c3Qgd2FudCBkaXJlY3Rvcmllc1xuICAgIGlmIChpdGVtcy5sZW5ndGggPT09IDApIHtcbiAgICAgIHgucHVzaCh7XG4gICAgICAgIGVudHJ5OiBgLyR7Zm9sZGVyfWAsXG4gICAgICAgIHRhcmdldDogYC8ke3RoaXMuc2Z0cEJ1Y2tldE5hbWV9L2hvbWUvJHt1c2VyfS8ke2ZvbGRlcn1gLFxuICAgICAgfSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIE9iamVjdC5lbnRyaWVzKGl0ZW1zKS5tYXAoKFtrZXksIHZhbHVlXSkgPT4ge1xuICAgICAgICB4LnB1c2goe1xuICAgICAgICAgIGVudHJ5OiBgJHtmb2xkZXJ9LyR7dmFsdWV9YCxcbiAgICAgICAgICB0YXJnZXQ6IGAvJHt0aGlzLnNmdHBCdWNrZXROYW1lfS9ob21lLyR7Zm9sZGVyfS8ke3ZhbHVlfWAsXG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHg7XG4gIH1cblxuICBjcmVhdGVEaXJlY3RvcnkoXG4gICAgdXNlcjogc3RyaW5nLFxuICAgIGRpclN0cnVjdHVyZToge1xuICAgICAgW2tleTogc3RyaW5nXTogRGlySXRlbVtdO1xuICAgIH0sXG4gICAgYWNjOiBDZm5Vc2VyLkhvbWVEaXJlY3RvcnlNYXBFbnRyeVByb3BlcnR5W10sXG4gICk6IHZvaWQge1xuICAgIE9iamVjdC5lbnRyaWVzKGRpclN0cnVjdHVyZSkubWFwKChbZGlyLCB2YWx1ZV0pID0+IHtcbiAgICAgIGlmICh0eXBlb2YgdmFsdWUgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKCdUT0RPJyk7XG4gICAgICB9IGVsc2UgaWYgKEFycmF5LmlzQXJyYXkodmFsdWUpKSB7XG4gICAgICAgIGFjYy5wdXNoKC4uLnRoaXMuY3JlYXRlTWFwcGluZyh1c2VyLCBgJHtkaXJ9YCwgdmFsdWUpKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuY3JlYXRlRGlyZWN0b3J5KHVzZXIsIHZhbHVlLCBhY2MpO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgY3JlYXRlVXNlcnModXNlckNmZzogVXNlcnMpIHtcbiAgICBPYmplY3QuZW50cmllcyh1c2VyQ2ZnLnVzZXJzKS5tYXAoKFtpLCB1c2VyXSkgPT4ge1xuICAgICAgY29uc3QgaG9tZURpck1hcHBpbmdzOiBDZm5Vc2VyLkhvbWVEaXJlY3RvcnlNYXBFbnRyeVByb3BlcnR5W10gPSBbXTtcbiAgICAgIHRoaXMuY3JlYXRlRGlyZWN0b3J5KHVzZXIubmFtZSwgdXNlci5kaXJTdHJ1Y3R1cmUsIGhvbWVEaXJNYXBwaW5ncyk7XG5cbiAgICAgIC8vIGNvbnNvbGUubG9nKFwiRmluYWwgZGlyZWN0b3J5IHN0cnVjdHVyZVwiLCBob21lRGlyTWFwcGluZ3MpXG5cbiAgICAgIG5ldyBDZm5Vc2VyKHRoaXMsIGBVc2VyJHtpfWAsIHtcbiAgICAgICAgc2VydmVySWQ6IHRoaXMuc2Z0cEF0dHJTZXJ2ZXJJZCxcbiAgICAgICAgdXNlck5hbWU6IHVzZXIubmFtZSxcbiAgICAgICAgaG9tZURpcmVjdG9yeU1hcHBpbmdzOiBob21lRGlyTWFwcGluZ3MsXG4gICAgICAgIGhvbWVEaXJlY3RvcnlUeXBlOiAnTE9HSUNBTCcsXG4gICAgICAgIHJvbGU6IHRoaXMuY3JlYXRlVXNlclNjb3BlZERvd25Sb2xlKHVzZXIubmFtZSkucm9sZUFybixcbiAgICAgICAgc3NoUHVibGljS2V5czogdGhpcy5nZXRVc2VyS2V5cyhnZXRQYXRoKHVzZXIucHVibGljS2V5UGF0aCkpLFxuICAgICAgfSk7XG4gICAgfSk7XG4gIH1cbn1cbiJdfQ==
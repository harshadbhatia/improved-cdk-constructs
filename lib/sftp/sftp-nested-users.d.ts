import { NestedStack, NestedStackProps } from 'aws-cdk-lib';
import { PolicyDocument, Role } from 'aws-cdk-lib/aws-iam';
import { CfnUser } from 'aws-cdk-lib/aws-transfer';
import { Construct } from 'constructs';
import { DirItem, Users } from '../../interfaces/lib/sftp/interfaces';
export declare class SFTPUsersNestedStack extends NestedStack {
    config: Users;
    sftpBucketName: string;
    sftpAttrServerId: string;
    constructor(scope: Construct, id: string, userCfg: Users, sftpBucketName: string, sftpAttrServerId: string, props?: NestedStackProps);
    createUserBucketPolcies(userDir: string): PolicyDocument;
    createUserScopedDownRole(user: string): Role;
    getUserKeys(publicKeyPath: string): string[];
    createMapping(user: string, folder: string, items: DirItem[]): CfnUser.HomeDirectoryMapEntryProperty[];
    createDirectory(user: string, dirStructure: {
        [key: string]: DirItem[];
    }, acc: CfnUser.HomeDirectoryMapEntryProperty[]): void;
    createUsers(userCfg: Users): void;
}

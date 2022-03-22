import { NestedStack, NestedStackProps } from 'aws-cdk-lib';
import {
  CompositePrincipal,
  Effect,
  PolicyDocument,
  PolicyStatement,
  Role,
  ServicePrincipal,
} from 'aws-cdk-lib/aws-iam';
import { CfnUser } from 'aws-cdk-lib/aws-transfer';
import { Construct } from 'constructs';
import { DirItem, Users } from '../../interfaces/lib/sftp/interfaces';
import { getPath, readAnyFile, TextReader } from '../utils/file-reader';

export class SFTPUsersNestedStack extends NestedStack {
  config: Users;
  sftpBucketName: string;
  sftpAttrServerId: string;

  constructor(
    scope: Construct,
    id: string,
    userCfg: Users,
    sftpBucketName: string,
    sftpAttrServerId: string,
    props?: NestedStackProps,
  ) {
    super(scope, id, props);

    this.config = userCfg;
    this.sftpBucketName = sftpBucketName;
    this.sftpAttrServerId = sftpAttrServerId;

    this.createUsers(userCfg);
  }

  createUserBucketPolcies(userDir: string): PolicyDocument {
    const allowListBucket = new PolicyStatement({
      sid: 'AllowListingOfUserFolder',
      actions: ['s3:ListBucket'],
      effect: Effect.ALLOW,
      resources: [`arn:aws:s3:::${this.sftpBucketName}`],
    });

    const homeDirObjectAccess = new PolicyStatement({
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
      effect: Effect.ALLOW,
      resources: [`arn:aws:s3:::${this.sftpBucketName}/home/${userDir}/*`],
    });

    const userBucketInlinePolicyDocument = new PolicyDocument({
      statements: [allowListBucket, homeDirObjectAccess],
    });

    return userBucketInlinePolicyDocument;
  }

  createUserScopedDownRole(user: string): Role {
    return new Role(this, `UserBucketAccessRole${user}`, {
      roleName: `SFTP-S3-Role-${user}`,
      description: `Allow home bucket folder access for the ${user}`,
      assumedBy: new CompositePrincipal(new ServicePrincipal('transfer.amazonaws.com')),
      inlinePolicies: {
        DeploymentPolicies: this.createUserBucketPolcies(user),
      },
      // permissionsBoundary
    });
  }

  getUserKeys(publicKeyPath: string): string[] {
    const buffer = readAnyFile(publicKeyPath, new TextReader());
    return [buffer.toString()];
  }

  createMapping(user: string, folder: string, items: DirItem[]): CfnUser.HomeDirectoryMapEntryProperty[] {
    const x: CfnUser.HomeDirectoryMapEntryProperty[] = [];
    // If we have empty sub tree we just want directories
    if (items.length === 0) {
      x.push({
        entry: `/${folder}`,
        target: `/${this.sftpBucketName}/home/${user}/${folder}`,
      });
    } else {
      Object.entries(items).map(([key, value]) => {
        x.push({
          entry: `${folder}/${value}`,
          target: `/${this.sftpBucketName}/home/${folder}/${value}`,
        });
      });
    }

    return x;
  }

  createDirectory(
    user: string,
    dirStructure: {
      [key: string]: DirItem[];
    },
    acc: CfnUser.HomeDirectoryMapEntryProperty[],
  ): void {
    Object.entries(dirStructure).map(([dir, value]) => {
      if (typeof value === 'string') {
        console.log('TODO');
      } else if (Array.isArray(value)) {
        acc.push(...this.createMapping(user, `${dir}`, value));
      } else {
        this.createDirectory(user, value, acc);
      }
    });
  }

  createUsers(userCfg: Users) {
    Object.entries(userCfg.users).map(([i, user]) => {
      const homeDirMappings: CfnUser.HomeDirectoryMapEntryProperty[] = [];
      this.createDirectory(user.name, user.dirStructure, homeDirMappings);

      // console.log("Final directory structure", homeDirMappings)

      new CfnUser(this, `User${i}`, {
        serverId: this.sftpAttrServerId,
        userName: user.name,
        homeDirectoryMappings: homeDirMappings,
        homeDirectoryType: 'LOGICAL',
        role: this.createUserScopedDownRole(user.name).roleArn,
        sshPublicKeys: this.getUserKeys(getPath(user.publicKeyPath)),
      });
    });
  }
}

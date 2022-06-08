import { Stack, StackProps } from 'aws-cdk-lib';
import { CfnEIP } from 'aws-cdk-lib/aws-ec2';
import { PolicyDocument, Role } from 'aws-cdk-lib/aws-iam';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { CfnServer } from 'aws-cdk-lib/aws-transfer';
import { Construct } from 'constructs';
import { SFTPConfig, Users } from '../../interfaces/lib/sftp/interfaces';
export declare class SFTPStack extends Stack {
    config: SFTPConfig;
    userConfig: Users;
    eIps: CfnEIP[];
    sftpServer: CfnServer;
    sftpBucket: Bucket;
    constructor(scope: Construct, id: string, config: SFTPConfig, userCfg: Users, props?: StackProps);
    createS3Bucket(): void;
    createLoggingRole(): Role;
    createLoggingPolicy(): PolicyDocument;
    createElasticIPs(): void;
    createSFTP(): void;
    outputEIPBucket(): void;
}

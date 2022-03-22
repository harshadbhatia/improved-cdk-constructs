import { Aws, CfnOutput, RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib';
import { CfnEIP, Peer, Port, SecurityGroup, Vpc } from 'aws-cdk-lib/aws-ec2';
import {
  CompositePrincipal,
  Effect,
  PolicyDocument,
  PolicyStatement,
  Role,
  ServicePrincipal,
} from 'aws-cdk-lib/aws-iam';
import { BlockPublicAccess, Bucket, BucketEncryption } from 'aws-cdk-lib/aws-s3';
import { CfnServer } from 'aws-cdk-lib/aws-transfer';
import { Construct } from 'constructs';
import { SFTPConfig, Users } from '../../interfaces/lib/sftp/interfaces';
import { convertStringToArray } from '../utils/common';
import { SFTPUsersNestedStack } from './sftp-nested-users';

export class SFTPStack extends Stack {
  config: SFTPConfig;
  userConfig: Users;
  eIps: CfnEIP[];
  sftpServer: CfnServer;
  sftpBucket: Bucket;

  constructor(scope: Construct, id: string, config: SFTPConfig, userCfg: Users, props?: StackProps) {
    super(scope, id, props);

    this.config = config;
    this.userConfig = userCfg;

    this.createElasticIPs();
    this.createS3Bucket();
    this.outputEIPBucket();

    if (this.config.sftpServiceEnabled) {
      this.createSFTP();
      new SFTPUsersNestedStack(this, 'SFTPUsers', userCfg, this.sftpBucket.bucketName, this.sftpServer.attrServerId);
      // this.outputSFTPEndpoint()
    }

    // this.addTags()
    // this.createParams()
  }

  createS3Bucket(): void {
    this.sftpBucket = new Bucket(this, 'sftp-bucket', {
      bucketName: this.config.bucketName,
      encryption: BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      publicReadAccess: false,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      versioned: true,
      removalPolicy: RemovalPolicy.DESTROY,
    });
  }

  createLoggingRole(): Role {
    return new Role(this, `SFTPLoggingRole`, {
      roleName: `${Aws.STACK_NAME}-Logging-Role`,
      description: `Logging for SFTP Servier`,
      assumedBy: new CompositePrincipal(new ServicePrincipal('transfer.amazonaws.com')),
      inlinePolicies: {
        LoggingPolicy: this.createLoggingPolicy(),
      },
    });
  }

  // ####### IAM ROLES #######
  createLoggingPolicy(): PolicyDocument {
    const loggingPolicy = new PolicyStatement({
      sid: 'SFTPCloudWatchLogging',
      actions: ['logs:CreateLogStream', 'logs:DescribeLogStreams', 'logs:CreateLogGroup', 'logs:PutLogEvents'],
      effect: Effect.ALLOW,
      resources: ['arn:aws:logs:*:*:log-group:/aws/transfer/*'],
    });

    const userBucketInlinePolicyDocument = new PolicyDocument({
      statements: [loggingPolicy],
    });

    return userBucketInlinePolicyDocument;
  }

  createElasticIPs(): void {
    this.eIps = Array.from(Array(3).keys()).map(
      (i) =>
        new CfnEIP(this, `EIP${i}`, {
          tags: [
            {
              key: 'Name',
              value: `${Aws.STACK_NAME}-EIP${i}`,
            },
          ],
        }),
    );
  }

  createSFTP(): void {
    const securityGroup: SecurityGroup = new SecurityGroup(this, 'SecurityGroup', {
      vpc: Vpc.fromLookup(this, 'VPC', {
        vpcId: this.config.vpcId,
      }),
      allowAllOutbound: true,
      securityGroupName: 'SFTP-Access',
      description: 'SFTP Access',
    });

    //  Iterate over users and allowd IPS for each user and add it to security group
    Object.entries(this.userConfig.users).map(([i, user]) =>
      user.allowedIps.map((ip) =>
        securityGroup.addIngressRule(Peer.ipv4(ip), Port.tcp(22), `Allow SFTP traffic for user - ${user.name}`),
      ),
    );

    this.sftpServer = new CfnServer(this, 'SFTPServer', {
      endpointType: 'VPC',
      loggingRole: this.createLoggingRole().roleArn,
      protocols: ['SFTP'],
      endpointDetails: {
        vpcId: this.config.vpcId,
        addressAllocationIds: this.eIps.map((eip) => eip.attrAllocationId),
        // works wiht public
        subnetIds: convertStringToArray(this.config.publicSubnetIds),
        securityGroupIds: [securityGroup.securityGroupId],
      },
    });
  }

  outputEIPBucket(): void {
    this.eIps.map(
      (eip, i) =>
        new CfnOutput(this, `EIPOutput${i}`, {
          value: eip.ref,
          description: `IP For SFTP server`,
          exportName: `SFTP${i}`,
        }),
    );

    new CfnOutput(this, `SFTPBucketOutput`, {
      value: this.sftpBucket.bucketName,
      description: `SFTP S3 Bucket`,
      exportName: `SFTPBucket`,
    });
  }

}

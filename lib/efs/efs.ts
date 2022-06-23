import { aws_efs, RemovalPolicy, Stack } from 'aws-cdk-lib';
import { IVpc, SecurityGroup, SecurityGroupProps, Vpc } from "aws-cdk-lib/aws-ec2";
import { FileSystem, FileSystemProps } from "aws-cdk-lib/aws-efs";
import { StringParameter } from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';
import { EFSStackProps } from '../../interfaces/lib/eks/interfaces';

/**
 * EFS Stack is only responsible for creating efs and access point only.
 * Security groups are created by the Shared Stack.
 */
export class EFSStack extends Stack {

  config: EFSStackProps
  efs: FileSystem
  sg: SecurityGroup

  constructor(scope: Construct, id: string, props?: EFSStackProps) {
    super(scope, id, props);

    this.config = props!;
    this.createEfs();
    this.createParams();
  }

  getVPC(): IVpc {
    const vpcId = StringParameter.valueFromLookup(this, '/account/vpc/id' || this.config.vpcId);
    const vpc = Vpc.fromLookup(this, 'VPC', { vpcId: vpcId });

    return vpc;
  }


  createEfs() {

    const vpc = this.getVPC();

    this.sg = new SecurityGroup(this, "EFSSecurityGroup", {
      vpc: vpc,
      securityGroupName: `${this.stackName}-efs-sg`,
      description: "EFS Default Security Group"
    } as SecurityGroupProps);

    this.efs = new aws_efs.FileSystem(this, "EFSFileSystem",
      {
        vpc: vpc,
        fileSystemName: this.config.fsName,
        encrypted: true,
        securityGroup: this.sg,
        removalPolicy: RemovalPolicy.DESTROY,
        performanceMode: aws_efs.PerformanceMode.MAX_IO,
        lifecyclePolicy: aws_efs.LifecyclePolicy.AFTER_30_DAYS,
      } as FileSystemProps // files are not transitioned to infrequent access (IA) storage by default
    );

    // Either we have a secondary user or root ACL
    this.config.accessPoints?.map(ap => {
      if (ap.acls) {
        this.efs.addAccessPoint(ap.logicalId, {
          createAcl: ap.acls,
          path: ap.path,
        })
      } else {
        this.efs.addAccessPoint(ap.logicalId, {
          path: ap.path,
          posixUser: ap.posixUser,
        })
      }
    })

  }


  createParams() {
    // Export few parameters for application usage
    new StringParameter(
      this, "EFSFileSystemID",
      {
        parameterName: `/account/stacks/${this.stackName}/efs-fs-id`,
        stringValue: this.efs.fileSystemId,
        description: "File System ID"
      }
    );

    new StringParameter(
      this, "EFSSGID",
      {
        parameterName: `/account/stacks/${this.stackName}/efs-sg-id`,
        stringValue: this.sg.securityGroupId,
        description: "EFS Security group ID"
      }
    );

  }
}


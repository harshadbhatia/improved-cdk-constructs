import {
  aws_ec2, aws_efs, NestedStack, RemovalPolicy, StackProps
} from 'aws-cdk-lib';
import { SecurityGroupProps } from "aws-cdk-lib/aws-ec2";
import { FileSystem, FileSystemProps } from "aws-cdk-lib/aws-efs";
import { StringParameter } from 'aws-cdk-lib/aws-ssm';
import { IVpc, Port, SecurityGroup } from "aws-cdk-lib/aws-ec2";
import { Construct } from 'constructs';
import { EKSEFSConfig } from '../../interfaces/lib/eks/interfaces';

export class EFSNestedStack extends NestedStack {

  clusterName: string
  config: EKSEFSConfig
  vpc: IVpc
  efs: FileSystem
  sg: SecurityGroup

  constructor(scope: Construct, id: string, eksCluster: string, config: EKSEFSConfig, vpc: IVpc, eksClusterSG: string, props?: StackProps) {
    super(scope, id);
    // We simply push EKS SG as first item to EFS in case of nested

    this.clusterName = eksCluster
    // Allow access from EFS
    config.ingress.push({
      port: 2049,
      description: "Allow from EKS Cluster",
      fromSG: eksClusterSG
    })

    this.config = config;
    this.vpc = vpc;

    this.createEfs();
    this.createParams();
  }


  createEfs() {

    this.sg = new aws_ec2.SecurityGroup(this, "EFSSecurityGroup", {
      vpc: this.vpc,
      securityGroupName: `${this.clusterName}-efs-sg`
    } as SecurityGroupProps);

    this.config.ingress.map(ig => {
      const fromSG = SecurityGroup.fromSecurityGroupId(this, `FromSG${ig.port}`, ig.fromSG);
      this.sg.addIngressRule(
        fromSG,
        Port.tcp(ig.port),
        ig.description
      );
    })

    this.efs = new aws_efs.FileSystem(this, "EFSFileSystem",
      {
        vpc: this.vpc,
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
      let efs_ap: aws_efs.AccessPoint
      if (ap.acls) {
        efs_ap = this.efs.addAccessPoint(ap.logicalId, {
          createAcl: ap.acls,
          path: ap.path,
        })
      } else {
        efs_ap = this.efs.addAccessPoint(ap.logicalId, {
          path: ap.path,
          posixUser: ap.posixUser,
        })
      }
      // export param for use
      new StringParameter(
        this, "EFSFileSystemID",
        {
          parameterName: `/account/stacks/${this.stackName}/efs/ap-${ap.logicalId}`,
          stringValue: efs_ap.accessPointId,
          description: `${ap.logicalId} Access point ID`
        }
      );
    })

  }


  createParams() {
    // Export few parameters for application usage
    new StringParameter(
      this, "EFSFileSystemID",
      {
        parameterName: `/account/stacks/${this.clusterName}/efs-fs-id`,
        stringValue: this.efs.fileSystemId,
        description: "File System ID"
      }
    );

    new StringParameter(
      this, "EFSSecurityGroupID",
      {
        parameterName: `/account/stacks/${this.clusterName}/efs-sg-id`,
        stringValue: this.sg.securityGroupId,
        description: "EFS Security Group ID"
      }
    );

  }
}


import { Stack } from 'aws-cdk-lib';
import { SecurityGroup } from "aws-cdk-lib/aws-ec2";
import { FileSystem, IFileSystem } from "aws-cdk-lib/aws-efs";
import { KubernetesManifest } from 'aws-cdk-lib/aws-eks';
import { Construct } from 'constructs';
import { EFSEKSIntegrationStackProps } from '../../interfaces/lib/eks/interfaces';

/**
 * EFS Shared stack - Useful for combining multiple integrations
 */
export class EFSEKSIntegrationStack extends Stack {

  config: EFSEKSIntegrationStackProps
  efs: IFileSystem

  constructor(scope: Construct, id: string, props?: EFSEKSIntegrationStackProps) {
    super(scope, id, props);

    this.config = props!;
    this.getEFS()
    this.updateEFS();

    // When eks cluster is passed, makes sense to create SC at the same time
    if (this.config.cluster) {
      this.createStorageClass()
    }
  }

  getEFS() {
    this.efs = FileSystem.fromFileSystemAttributes(this, 'ExistingsEFSSystem', {
      fileSystemId: this.config.fsId, // You can also use fileSystemArn instead of fileSystemId.
      securityGroup: SecurityGroup.fromSecurityGroupId(this, 'SG', this.config.fsSg),
    });
  }

  updateEFS() {
    this.config.sgs.map(sg =>
      this.efs.connections.allowDefaultPortFrom(sg)
    )
  }

  createStorageClass(): KubernetesManifest {
    const sc = this.config.cluster!.addManifest('EFSSC', {
      apiVersion: 'storage.k8s.io/v1',
      kind: 'StorageClass',
      metadata: {
        name: 'efs-sc',
      },
      provisioner: 'efs.csi.aws.com',
      parameters: {
        provisioningMode: 'efs-ap',
        fileSystemId: this.config.fsId,
        directoryPerms: '0700',
      },
    });

    return sc
  }

}


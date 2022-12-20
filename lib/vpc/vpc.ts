import { aws_ec2, aws_ssm, Stack, StackProps, Tags, Fn, CfnOutput } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { VPCConfig } from '@harshadbhatia/improved-cdk-constructs/interfaces/lib/vpc/interfaces';


export class VPCStack extends Stack {
  vpc: aws_ec2.IVpc
  config: VPCConfig;

  constructor(scope: Construct, id: string, config: VPCConfig, props?: StackProps) {
    super(scope, id, props);
    this.config = config
    this.vpc = this.getVpc()
    this.createParams();
    this.addTags();
  }

  getVpc(): aws_ec2.IVpc {
    return aws_ec2.Vpc.fromVpcAttributes(this, 'VPC', {
      vpcId: Fn.importValue('citadel-VPC').toString(),
      availabilityZones: ['ap-southeast-2a','ap-southeast-2b','ap-southeast-2c'],
      privateSubnetIds: [
        Fn.importValue('citadel-VPCSubnetPrivateAId').toString(),
        Fn.importValue('citadel-VPCSubnetPrivateBId').toString(),
        Fn.importValue('citadel-VPCSubnetPrivateCId').toString()
      ],
      publicSubnetIds: [
        Fn.importValue('citadel-VPCSubnetPublicAId').toString(),
        Fn.importValue('citadel-VPCSubnetPublicBId').toString(),
        Fn.importValue('citadel-VPCSubnetPublicCId').toString()
      ],
      isolatedSubnetIds: [
        Fn.importValue('citadel-VPCSubnetSecureAId').toString(),
        Fn.importValue('citadel-VPCSubnetSecureBId').toString(),
        Fn.importValue('citadel-VPCSubnetSecureCId').toString()
      ]
    })
  }

  createParams(): void {
    const vpcIdParameter = new aws_ssm.StringParameter(this, 'VPCId', {
      stringValue: this.vpc.vpcId,
      parameterName: this.config.vpcIdSSM,
      description: this.config.vpcIdSSMDescription,
    });
    const privateSubnetParameter = new aws_ssm.StringListParameter(this, 'PrivateSubnetIds', {
      stringListValue: this.vpc.privateSubnets.map((subnet) => subnet.subnetId),
      parameterName: this.config.privateSubnetSSM,
      description: this.config.privateSubnetSSMDescription,
    });
    const publicSubnetParameter = new aws_ssm.StringListParameter(this, 'PublicSubnetIds', {
      stringListValue: this.vpc.publicSubnets.map((subnet) => subnet.subnetId),
      parameterName: this.config.publicSubnetSSM,
      description: this.config.publicSubnetSSMDescription,
    });
    const isolatedSubnetSSM = new aws_ssm.StringListParameter(this, 'IsolatedSubnetIds', {
      stringListValue: this.vpc.isolatedSubnets.map((subnet) => subnet.subnetId),
      parameterName: this.config.isolatedSubnetSSM,
      description: this.config.isolatedSubnetSSMDescription,
    });
  }
  addTags(): void {
    this.vpc.privateSubnets.forEach((subnet) => {
      Tags.of(subnet).add('kubernetes.io/role/internal-elb', '1');
    });
    this.vpc.publicSubnets.forEach((subnet) => {
      Tags.of(subnet).add('kubernetes.io/role/elb', '1');
    });
    this.vpc.privateSubnets.forEach((subnet) => {
      const ar: string[] = JSON.parse(this.config.kubernetesClustersToTag as unknown as string);
      ar.forEach((cluster:string) => {
        Tags.of(subnet).add(`kubernetes.io/cluster/${cluster}`, 'shared');
      });
    });
  }
}
import { Stack, StackProps, Tags } from 'aws-cdk-lib';
import { SubnetType, Vpc } from 'aws-cdk-lib/aws-ec2';
import { StringListParameter, StringParameter } from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';
import { VPCConfig } from '../../interfaces/lib/vpc/interfaces';

export class VPCStack extends Stack {
  vpc: Vpc;
  config: VPCConfig;

  constructor(scope: Construct, id: string, config: VPCConfig, props?: StackProps) {
    super(scope, id, props);

    this.config = config;
    this.createVPC();
    this.addTags();
    this.createParams();
  }

  createVPC(): void {
    this.vpc = new Vpc(this, 'VPC', {
      maxAzs: 4,
      cidr: '10.0.0.0/16',
      natGateways: this.config.natGateways,
      subnetConfiguration: [
        {
          name: 'Public',
          subnetType: SubnetType.PUBLIC,
        },
        {
          name: 'Private',
          subnetType: SubnetType.PRIVATE_WITH_NAT,
        },
        {
          name: 'Protected',
          subnetType: SubnetType.PRIVATE_ISOLATED,
        },
        {
          name: 'Spare',
          subnetType: SubnetType.PRIVATE_ISOLATED,
        },
      ],
    });
  }

  createParams(): void {
    const vpcIdParameter = new StringParameter(this, 'VPCId', {
      stringValue: this.vpc.vpcId,
      parameterName: this.config.vpcIdSSM,
      description: this.config.vpcIdSSMDescription,
    });

    const privateSubnetParameter = new StringListParameter(this, 'PrivateSubnetIds', {
      stringListValue: this.vpc.privateSubnets.map((subnet) => subnet.subnetId),
      parameterName: this.config.privateSubnetSSM,
      description: this.config.privateSubnetSSMDescription,
    });

    const publicSubnetParameter = new StringListParameter(this, 'PublicSubnetIds', {
      stringListValue: this.vpc.publicSubnets.map((subnet) => subnet.subnetId),
      parameterName: this.config.publicSubnetSSM,
      description: this.config.publicSubnetSSMDescription,
    });

    const isolatedSubnetSSM = new StringListParameter(this, 'IsolatedSubnetIds', {
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
      ar.forEach((cluster) => {
        Tags.of(subnet).add(`kubernetes.io/cluster/${cluster}`, 'shared');
      });
    });
  }
}

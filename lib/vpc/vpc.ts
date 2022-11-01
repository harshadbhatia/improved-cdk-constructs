import { cdk, constructs, ec2, ssm } from "../../deps.ts";
import { VPCConfig } from '../../interfaces/lib/vpc/interfaces.ts';

export class VPCStack extends cdk.Stack {
  vpc!: ec2.Vpc;
  config: VPCConfig;

  constructor(scope: constructs.Construct, id: string, config: VPCConfig, props?: cdk.StackProps) {
    super(scope, id, props);

    this.config = config;

    this.createVPC();
    this.addTags();
    this.createParams();
  }

  createVPC(): void {
    this.vpc = new ec2.Vpc(this, 'VPC', {
      maxAzs: 4,
      cidr: '10.0.0.0/16',
      natGateways: this.config.natGateways,
      subnetConfiguration: [
        {
          name: 'Public',
          subnetType: ec2.SubnetType.PUBLIC,
        },
        {
          name: 'Private',
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        },
        {
          name: 'Protected',
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
        },
        {
          name: 'Spare',
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
        },
      ],
    });
  }

  createParams(): void {
    const _vpcIdParameter = new ssm.StringParameter(this, 'VPCId', {
      stringValue: this.vpc.vpcId,
      parameterName: this.config.vpcIdSSM,
      description: this.config.vpcIdSSMDescription,
    });

    const _privateSubnetParameter = new ssm.StringListParameter(this, 'PrivateSubnetIds', {
      stringListValue: this.vpc.privateSubnets.map((subnet) => subnet.subnetId),
      parameterName: this.config.privateSubnetSSM,
      description: this.config.privateSubnetSSMDescription,
    });

    const _publicSubnetParameter = new ssm.StringListParameter(this, 'PublicSubnetIds', {
      stringListValue: this.vpc.publicSubnets.map((subnet) => subnet.subnetId),
      parameterName: this.config.publicSubnetSSM,
      description: this.config.publicSubnetSSMDescription,
    });

    const _isolatedSubnetSSM = new ssm.StringListParameter(this, 'IsolatedSubnetIds', {
      stringListValue: this.vpc.isolatedSubnets.map((subnet) => subnet.subnetId),
      parameterName: this.config.isolatedSubnetSSM,
      description: this.config.isolatedSubnetSSMDescription,
    });
  }

  addTags(): void {
    this.vpc.privateSubnets.forEach((subnet) => {
      cdk.Tags.of(subnet).add('kubernetes.io/role/internal-elb', '1');
    });

    this.vpc.publicSubnets.forEach((subnet) => {
      cdk.Tags.of(subnet).add('kubernetes.io/role/elb', '1');
    });

    this.vpc.privateSubnets.forEach((subnet) => {
      if (this.config.kubernetesClustersToTag) {
        const ar: string[] = JSON.parse(this.config.kubernetesClustersToTag as unknown as string);
        ar.forEach((cluster) => {
          cdk.Tags.of(subnet).add(`kubernetes.io/cluster/${cluster}`, 'shared');
        });
      }
    });
  }
}

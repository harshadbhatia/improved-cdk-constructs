import { StackProps } from "aws-cdk-lib";
import { VpcProps } from "aws-cdk-lib/aws-ec2/lib/vpc";
export interface VPCConfig extends StackProps, VpcProps {
    stackName: string;
    stackDescription: string;
    natGateways: number;
    cidrRange?: string;
    maxAzs: number;
    kubernetesClustersToTag: string[];
    vpcIdSSM: string;
    vpcIdSSMDescription: string;
    privateSubnetSSM: string;
    privateSubnetSSMDescription: string;
    publicSubnetSSM: string;
    publicSubnetSSMDescription: string;
    isolatedSubnetSSM: string;
    isolatedSubnetSSMDescription: string;
}

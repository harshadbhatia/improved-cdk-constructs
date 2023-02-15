import { StackProps } from "aws-cdk-lib";
export interface VPCConfig extends StackProps {
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

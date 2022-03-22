export interface VPCConfig {
    stackName: string;
    stackDescription: string;
    natGateways: number;
    cidrMask: number;
    kubernetesClustersToTag: string[];
    vpcIdSSM: string;
    vpcIdSSMDescription: string;
    privateSubnetSSM: string;
    privateSubnetSSMDescription: string
    publicSubnetSSM: string;
    publicSubnetSSMDescription: string
    isolatedSubnetSSM: string;
    isolatedSubnetSSMDescription: string;
}
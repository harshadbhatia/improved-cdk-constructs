export interface EFSStackConfig {
    stackName: string;
    stackDescription: string;
    vpc: string;
    playerName: string;
    fileSystemName: string;
    eksClusterSG?: string;
}

export interface SFTPConfig {
    stackName: string;
    stackDescription: string;
    bucketName: string;
    vpcId: string;
    privateSubnetIds: string;
    publicSubnetIds: string;
    sftpServiceEnabled: boolean;
}
export interface DirItem {
    [key: string]: string | DirItem[] | string[];
}
export interface User {
    name: string;
    publicKeyPath: string;
    allowedIps: string[];
    dirStructure: {
        [key: string]: DirItem[];
    };
}
export interface Users {
    users: User[];
}

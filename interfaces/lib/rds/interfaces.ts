export interface ServerlessRDSConfig {
    stackName: string;
    stackDescription: string;
    databases: ServerlessRDSDatabaseConfig[];
}

export interface ServerlessRDSDatabaseConfig {
    clusterName: string;
    lambdaName: string;
    defaultDBName: string;
    parameterGroupName: string;
    allowedCidr: string;
    snapshotIdentifier?: string;
}
export interface SecretsManagerStackCfg {
    stackName: string;
    stackDescription: string;
    secrets: Secret[];
}
export interface Secret {
    name: string;
    description: string;
    secretType: string;
    secretStringTemplate?: any;
    generateStringKey?: string;
}

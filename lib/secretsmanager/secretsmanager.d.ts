import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { SecretsManagerStackCfg } from '../../interfaces/lib/secretsmanager/interfaces';
export declare class SecretsStack extends Stack {
    config: SecretsManagerStackCfg;
    constructor(scope: Construct, id: string, config: SecretsManagerStackCfg, props?: StackProps);
    createSecrets(): void;
}

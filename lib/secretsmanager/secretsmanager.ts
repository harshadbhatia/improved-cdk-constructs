import secretsmanager = require('aws-cdk-lib/aws-secretsmanager');
import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { SecretsManagerStackCfg } from '../../interfaces/lib/secretsmanager/interfaces';

export class SecretsStack extends Stack {
  config: SecretsManagerStackCfg;

  constructor(scope: Construct, id: string, config: SecretsManagerStackCfg, props?: StackProps) {
    super(scope, id, props);

    this.config = config;
    this.createSecrets();
  }

  createSecrets(): void {
    this.config.secrets.map((secret) => {
      if ((secret.secretType = 'generated')) {
        const templatedSecret = new secretsmanager.Secret(this, secret.name, {
          secretName: secret.name,
          description: secret.description,
          generateSecretString: {
            secretStringTemplate: JSON.stringify(secret.secretStringTemplate),
            generateStringKey: secret.generateStringKey,
          },
        });
      }
    });
  }
}

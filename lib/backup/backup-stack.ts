import {
  aws_backup,
  aws_kms,
  Stack,
  StackProps
} from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { BackupStackConfig } from '../../interfaces/lib/aws_backup/interfaces';
import rds = require('aws-cdk-lib/aws-rds');

export class BackupStack extends Stack {

  config: BackupStackConfig;

  constructor(scope: Construct, id: string, cmk: aws_kms.Key, config: BackupStackConfig, props?: StackProps) {
    super(scope, id, props);
    this.config = config

    // Creating backup vault
    const vault = new aws_backup.BackupVault(this, 'Vault', {
      encryptionKey: cmk // Custom encryption key
    });

    const plan = aws_backup.BackupPlan.dailyWeeklyMonthly5YearRetention(this, 'Plan', vault);
    plan.addSelection('Selection', {
      resources: [
        // aws_backup.BackupResource.fromConstruct(rds.ServerlessCluster),
        aws_backup.BackupResource.fromTag('aws_backup', 'true'), // All resources that are tagged stage=prod in the region/account

      ]
    })
  }
}

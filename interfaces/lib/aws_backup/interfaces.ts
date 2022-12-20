export interface BackupStackConfig {
  stackName: string;
  backups: BackupConfig[];
}

export interface BackupConfig {
  name: string;
  rule_schedule: string;
}
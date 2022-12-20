export interface ACMStackConfig {
  stackName: string;
  stackDescription: string;

  acms?: ACMConfig[];

  cdnAcms?: string[]
}

export interface ACMConfig {
  name: string;
  certificateName: string;
  subjectAlternativeDomainNames: string[];
  hostedZoneDomainName: string
  global: boolean
}
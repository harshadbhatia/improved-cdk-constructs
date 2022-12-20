import {
  aws_ssm as ssm,
  aws_certificatemanager as acm,
  Stack,
  StackProps
} from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { HostedZone } from 'aws-cdk-lib/aws-route53';
import { ACMConfig, ACMStackConfig } from '../../interfaces/lib/acm/interfaces';

export class ACMStack extends Stack {

  config: ACMStackConfig;

  constructor(scope: Construct, id: string, config: ACMStackConfig, props?: StackProps) {
    super(scope, id, props);
    this.config = config
    
    this.config.acms?.forEach(domain => {
      const hostedZone = HostedZone.fromLookup(this, `${domain.name}-HostedZone`, {
        domainName: domain.hostedZoneDomainName
      });
      if(domain.global){
        this.createCdnACMs(domain, (<HostedZone>hostedZone))
      }
      else {
        this.createACMs(domain, (<HostedZone>hostedZone))
      }
    })
  }

  createACMs(domain: ACMConfig, hostedZone: HostedZone) {
    const lg = domain.name.split('.').slice(0, 2).join('');

    const certificate = new acm.Certificate(this, lg, {
      domainName: domain.certificateName,
      subjectAlternativeNames: domain.subjectAlternativeDomainNames,
      validation: acm.CertificateValidation.fromDns(hostedZone),
    });
    new ssm.StringParameter(this, `${domain.certificateName}ZoneParam`, {
      stringValue: hostedZone.hostedZoneId,
      parameterName: `/route53/${domain.certificateName}/zone`,
      description: `${domain.certificateName} Hosted Zone ID`,
      tier: ssm.ParameterTier.STANDARD,
      type: ssm.ParameterType.STRING,
    });
    new ssm.StringParameter(this, `${lg}Param`, {
      stringValue: certificate.certificateArn,
      parameterName: `/acm/regional/${domain.certificateName}`,
      description: `${domain.certificateName} ACM`,
      tier: ssm.ParameterTier.STANDARD,
      type: ssm.ParameterType.STRING,
    });

  }

  createCdnACMs(domain: ACMConfig, hostedZone: HostedZone) {
    // For cloudfront distribution we need to create a certificate
    const cert = new acm.DnsValidatedCertificate(this, 'CrossRegionCertificate', {
      domainName: domain.certificateName,
      subjectAlternativeNames: domain.subjectAlternativeDomainNames,
      hostedZone: hostedZone,
      region: 'us-east-1',
    });

    new ssm.StringParameter(this, `${domain.certificateName}Param`, {
        stringValue: cert.certificateArn,
        parameterName: `/acm/${domain.certificateName}`,
        description: `${domain.certificateName} ACM (Cert in US-East-1)`,
        tier: ssm.ParameterTier.STANDARD,
        type: ssm.ParameterType.STRING,
      })
  }
}

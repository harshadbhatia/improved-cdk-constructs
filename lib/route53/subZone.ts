import iam = require('aws-cdk-lib/aws-iam');
import acm = require('aws-cdk-lib/aws-certificatemanager');
import cdk = require('aws-cdk-lib');
import ssm = require('aws-cdk-lib/aws-ssm');
import { Stack } from 'aws-cdk-lib';
import { CrossAccountZoneDelegationRecord, PublicHostedZone } from 'aws-cdk-lib/aws-route53';
import { Construct } from 'constructs';
import { Route53SubZoneConfig, SubZoneConfig } from '../../interfaces/lib/route53/interfaces';
import { exit } from 'process';

/**
 * Warning - CDK doesnt support multiple subzones in a single stack.
 */

export class Route53SubZoneStack extends cdk.Stack {

  config: Route53SubZoneConfig;
  parentZoneMap: Map<string, PublicHostedZone>;

  constructor(scope: Construct, id: string, config: Route53SubZoneConfig, props?: cdk.StackProps) {
    super(scope, id, props);
    this.config = config;

    this.parentZoneMap = new Map<string, PublicHostedZone>();

    this.config.subZone.filter(a => a.enabled).forEach(zone => {
      this.createSubHostedZone(zone)

    })

    this.createACMs()
    this.createCdnACMs()

  }

  createSubHostedZone(zone: SubZoneConfig) {
    zone.config.forEach(cfg => {
      // domain = zone name + domain
      const k = `${zone.name.replace('.', '').toUpperCase()}${cfg.domainName.replace('.', '').toUpperCase()}`

      const fqdn = `${zone.name}.${cfg.domainName}`
      const subZone = new PublicHostedZone(this, `${k}SubZone`, {
        zoneName: `${fqdn}`,
      });

      const param = new ssm.StringParameter(this, `${k}ZoneParam`, {
        stringValue: subZone.hostedZoneId,
        parameterName: `/route53/${fqdn}/zone`,
        description: `${fqdn} Hosted Zone ID`,
        tier: ssm.ParameterTier.STANDARD,
        type: ssm.ParameterType.STRING,
      });
      this.parentZoneMap.set(fqdn, subZone);

      const delegationRoleArn = Stack.of(this).formatArn({
        region: '', // IAM is global in each partition
        service: 'iam',
        account: cfg.parentAccountId,
        resource: 'role',
        resourceName: cfg.parentRoleName
      });

      const delegationRole = iam.Role.fromRoleArn(this, `${k}DelegationRole`, delegationRoleArn);

      // create the record
      new CrossAccountZoneDelegationRecord(this, `${cfg.domainName.replace('.', '').toUpperCase()}Delegate`, {
        delegatedZone: subZone,
        parentHostedZoneId: cfg.parentHostedZoneId, // or you can use parentHostedZoneId
        delegationRole,
      });
    })
  }

  createACMs() {
    this.config.acms?.forEach(domain => {
      const lg = domain.split('.').slice(0, 2).join('');
      const c = new acm.Certificate(this, lg, {
        domainName: domain,
        subjectAlternativeNames: [`www.${domain}`],
        validation: acm.CertificateValidation.fromDns(), // Records must be added manually
      });

      const param = new ssm.StringParameter(this, `${lg}Param`, {
        stringValue: c.certificateArn,
        parameterName: `/acm/${domain}`,
        description: `${domain} ACM`,
        tier: ssm.ParameterTier.STANDARD,
        type: ssm.ParameterType.STRING,
      });
    })
  }

  createCdnACMs() {


    // For cloudfront distribution we need to create a certificate
    this.config.cdnAcms?.forEach(domain => {
      const hostedZone = this.parentZoneMap.get(domain);
      if (hostedZone) {
        const cert = new acm.DnsValidatedCertificate(this, 'CrossRegionCertificate', {
          domainName: domain,
          hostedZone: hostedZone,
          region: 'us-east-1',
        });

        const param = new ssm.StringParameter(this, `${domain}Param`, {
          stringValue: cert.certificateArn,
          parameterName: `/acm/${domain}`,
          description: `${domain} ACM (Cert in US-East-1)`,
          tier: ssm.ParameterTier.STANDARD,
          type: ssm.ParameterType.STRING,
        });
      } else {
        console.error(`[Route53][subZone] ${domain} not found in parent zone map`)
        exit(1)
      }


    })

  }
}

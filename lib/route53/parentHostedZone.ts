import iam = require('aws-cdk-lib/aws-iam');
import ssm = require('aws-cdk-lib/aws-ssm');
import acm = require('aws-cdk-lib/aws-certificatemanager');
import cdk = require('aws-cdk-lib');
import { Effect } from 'aws-cdk-lib/aws-iam';
import { CnameRecord, HostedZone, MxRecord, PublicHostedZone } from 'aws-cdk-lib/aws-route53';
import { Construct } from 'constructs';
import { DomainRecords, Route53ParentConfig } from '../../interfaces/lib/route53/interfaces';
import { exit } from 'process';

export class Route53ParentStack extends cdk.Stack {
  config: Route53ParentConfig;

  constructor(scope: Construct, id: string, config: Route53ParentConfig, props?: cdk.StackProps) {
    super(scope, id, props);
    this.config = config;

    var parentZoneMap = new Map<string, PublicHostedZone>();

    this.config.domainNames.forEach((domain) => {
      const parentZone = new PublicHostedZone(this, `${domain.replace('.', '')}ParentZone`, {
        zoneName: `${domain}`,
      });

      parentZoneMap.set(domain, parentZone);

      const param = new ssm.StringParameter(this, `${domain.replace('.', '')}ZoneParam`, {
        stringValue: parentZone.hostedZoneId,
        parameterName: `/route53/${domain}/zone`,
        description: `${domain} Hosted Zone ID`,
        tier: ssm.ParameterTier.STANDARD,
        type: ssm.ParameterType.STRING,
      });
    });

    parentZoneMap.forEach((parentZone, domain) => {
      config.crossAccountDelagationIds.map((accountId) => {
        // IAM role allows child account to assume role and create record set
        // for their domain names
        new iam.Role(this, `${domain.replace('.', '').toUpperCase()}Route53Role${accountId}`, {
          roleName: `${domain.replace('.', '').toUpperCase()}-Route53Role-${accountId}`,
          assumedBy: new iam.AccountPrincipal(accountId),
          inlinePolicies: {
            Delegation: new iam.PolicyDocument({
              statements: [
                new iam.PolicyStatement({
                  actions: ['route53:ChangeResourceRecordSets'],
                  effect: Effect.ALLOW,
                  resources: [parentZone.hostedZoneArn],
                }),
                new iam.PolicyStatement({
                  actions: ['route53:ListHostedZonesByName'],
                  effect: Effect.ALLOW,
                  resources: ['*'],
                }),
              ],
            }),
          },
        });
      });
    });

    // most domains are ownership is in dev account. However, for dev account we want to create  some acms as well
    this.createACMs();
    this.createCdnACMs(parentZoneMap);
    this.createDomainRecords(parentZoneMap);
  }

  createDomainRecords(parentZoneMap: Map<string, PublicHostedZone>) {
    this.config.domainRecords?.map((d) => {
      const hostedZone = parentZoneMap.get(d.domain);
      if (hostedZone) {
        this.createMXRecords(d, hostedZone);
      }
    });
  }

  createMXRecords(dr: DomainRecords, hostedZone: PublicHostedZone) {
    dr.mxRecords?.map((rcd) => {
      var values = rcd.values.map((v) => ({
        hostName: v.pointsTo,
        priority: v.priority,
      }));
      const mxRecord = new MxRecord(this, `${dr.domain.replace('.', '')}${rcd.recordName}MXRecord`, {
        values: values,
        zone: hostedZone,
        comment: rcd.comment,
        recordName: rcd.recordName,
        ttl: cdk.Duration.minutes(rcd.ttl),
      });
    });
  }

  createACMs() {
    this.config.acms?.forEach((domain) => {
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
    });
  }

  createCdnACMs(parentZoneMap: Map<string, PublicHostedZone>) {
    // For cloudfront distribution we need to create a certificate
    this.config.cdnAcms?.forEach(c => {
      var lg: string = '';
      // Sometime we just have single zone - Top level domain can simply be passed as Zonedomain
      if (!c.zoneDomain) {
        lg = c.domain.split('.').slice(1, c.domain.split('.').length).join('.');
      } else {
        lg = c.zoneDomain
      }

      // Incase we have already defined outside
      var hostedZone
      if (c.parentHostedZoneId && c.parentHostedZoneName) {
        hostedZone = HostedZone.fromHostedZoneAttributes(this, 'ParentHostedZoneId', {
          hostedZoneId: c.parentHostedZoneId,
          zoneName: c.parentHostedZoneName
        })
      } else {
        hostedZone = parentZoneMap.get(lg);
      }

      if (hostedZone) {
        const cert = new acm.DnsValidatedCertificate(this, 'CrossRegionCertificate', {
          domainName: c.domain ? c.domain : c.zoneDomain!,
          subjectAlternativeNames: c.alternativeDomains,
          hostedZone: hostedZone,
          region: 'us-east-1',
        });

        const param = new ssm.StringParameter(this, `${lg}Param`, {
          stringValue: cert.certificateArn,
          parameterName: `/acm/${c.domain}` ? `/acm/${c.domain}` : `/acm/${c.zoneDomain!}`,
          description: `${c.domain} ACM (Cert in US-East-1)`,
          tier: ssm.ParameterTier.STANDARD,
          type: ssm.ParameterType.STRING,
        });
      } else {
        console.error(`[Route53][ParentZone] ${c.domain} not found in parent zone map`)
        exit(1)
      }
    });
  }
}

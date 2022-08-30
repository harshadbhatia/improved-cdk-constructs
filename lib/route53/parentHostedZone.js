"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Route53ParentStack = void 0;
const iam = require("aws-cdk-lib/aws-iam");
const ssm = require("aws-cdk-lib/aws-ssm");
const acm = require("aws-cdk-lib/aws-certificatemanager");
const cdk = require("aws-cdk-lib");
const aws_iam_1 = require("aws-cdk-lib/aws-iam");
const aws_route53_1 = require("aws-cdk-lib/aws-route53");
const process_1 = require("process");
class Route53ParentStack extends cdk.Stack {
    constructor(scope, id, config, props) {
        super(scope, id, props);
        this.config = config;
        var parentZoneMap = new Map();
        this.config.domainNames.forEach((domain) => {
            const parentZone = new aws_route53_1.PublicHostedZone(this, `${domain.replace('.', '')}ParentZone`, {
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
                                    effect: aws_iam_1.Effect.ALLOW,
                                    resources: [parentZone.hostedZoneArn],
                                }),
                                new iam.PolicyStatement({
                                    actions: ['route53:ListHostedZonesByName'],
                                    effect: aws_iam_1.Effect.ALLOW,
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
    createDomainRecords(parentZoneMap) {
        var _a;
        (_a = this.config.domainRecords) === null || _a === void 0 ? void 0 : _a.map((d) => {
            const hostedZone = parentZoneMap.get(d.domain);
            if (hostedZone) {
                this.createMXRecords(d, hostedZone);
            }
        });
    }
    createMXRecords(dr, hostedZone) {
        var _a;
        (_a = dr.mxRecords) === null || _a === void 0 ? void 0 : _a.map((rcd) => {
            var values = rcd.values.map((v) => ({
                hostName: v.pointsTo,
                priority: v.priority,
            }));
            const mxRecord = new aws_route53_1.MxRecord(this, `${dr.domain.replace('.', '')}${rcd.recordName}MXRecord`, {
                values: values,
                zone: hostedZone,
                comment: rcd.comment,
                recordName: rcd.recordName,
                ttl: cdk.Duration.minutes(rcd.ttl),
            });
        });
    }
    createACMs() {
        var _a;
        (_a = this.config.acms) === null || _a === void 0 ? void 0 : _a.forEach((domain) => {
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
    createCdnACMs(parentZoneMap) {
        var _a;
        // For cloudfront distribution we need to create a certificate
        (_a = this.config.cdnAcms) === null || _a === void 0 ? void 0 : _a.forEach(c => {
            var lg = '';
            // Sometime we just have single zone - Top level domain can simply be passed as Zonedomain
            if (!c.zoneDomain) {
                lg = c.domain.split('.').slice(1, c.domain.split('.').length).join('.');
            }
            else {
                lg = c.zoneDomain;
            }
            // Incase we have already defined outside
            var hostedZone;
            if (c.parentHostedZoneId && c.parentHostedZoneName) {
                hostedZone = aws_route53_1.HostedZone.fromHostedZoneAttributes(this, 'ParentHostedZoneId', {
                    hostedZoneId: c.parentHostedZoneId,
                    zoneName: c.parentHostedZoneName
                });
            }
            else {
                hostedZone = parentZoneMap.get(lg);
            }
            if (hostedZone) {
                const cert = new acm.DnsValidatedCertificate(this, 'CrossRegionCertificate', {
                    domainName: c.domain ? c.domain : c.zoneDomain,
                    subjectAlternativeNames: c.alternativeDomains,
                    hostedZone: hostedZone,
                    region: 'us-east-1',
                });
                const param = new ssm.StringParameter(this, `${lg}Param`, {
                    stringValue: cert.certificateArn,
                    parameterName: `/acm/${c.domain}`,
                    description: `${c.domain} ACM (Cert in US-East-1)`,
                    tier: ssm.ParameterTier.STANDARD,
                    type: ssm.ParameterType.STRING,
                });
            }
            else {
                console.error(`[Route53][subZone] ${c.domain} not found in parent zone map`);
                (0, process_1.exit)(1);
            }
        });
    }
}
exports.Route53ParentStack = Route53ParentStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFyZW50SG9zdGVkWm9uZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInBhcmVudEhvc3RlZFpvbmUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsMkNBQTRDO0FBQzVDLDJDQUE0QztBQUM1QywwREFBMkQ7QUFDM0QsbUNBQW9DO0FBQ3BDLGlEQUE2QztBQUM3Qyx5REFBOEY7QUFHOUYscUNBQStCO0FBRS9CLE1BQWEsa0JBQW1CLFNBQVEsR0FBRyxDQUFDLEtBQUs7SUFHL0MsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxNQUEyQixFQUFFLEtBQXNCO1FBQzNGLEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQ3hCLElBQUksQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFDO1FBRXJCLElBQUksYUFBYSxHQUFHLElBQUksR0FBRyxFQUE0QixDQUFDO1FBRXhELElBQUksQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxDQUFDLE1BQU0sRUFBRSxFQUFFO1lBQ3pDLE1BQU0sVUFBVSxHQUFHLElBQUksOEJBQWdCLENBQUMsSUFBSSxFQUFFLEdBQUcsTUFBTSxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDLFlBQVksRUFBRTtnQkFDcEYsUUFBUSxFQUFFLEdBQUcsTUFBTSxFQUFFO2FBQ3RCLENBQUMsQ0FBQztZQUVILGFBQWEsQ0FBQyxHQUFHLENBQUMsTUFBTSxFQUFFLFVBQVUsQ0FBQyxDQUFDO1lBRXRDLE1BQU0sS0FBSyxHQUFHLElBQUksR0FBRyxDQUFDLGVBQWUsQ0FBQyxJQUFJLEVBQUUsR0FBRyxNQUFNLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUMsV0FBVyxFQUFFO2dCQUNqRixXQUFXLEVBQUUsVUFBVSxDQUFDLFlBQVk7Z0JBQ3BDLGFBQWEsRUFBRSxZQUFZLE1BQU0sT0FBTztnQkFDeEMsV0FBVyxFQUFFLEdBQUcsTUFBTSxpQkFBaUI7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LHVCQUF1QixFQUFFLENBQUMsQ0FBQyxrQkFBa0I7b0JBQzdDLFVBQVUsRUFBRSxVQUFVO29CQUN0QixNQUFNLEVBQUUsV0FBVztpQkFDcEIsQ0FBQyxDQUFDO2dCQUVILE1BQU0sS0FBSyxHQUFHLElBQUksR0FBRyxDQUFDLGVBQWUsQ0FBQyxJQUFJLEVBQUUsR0FBRyxFQUFFLE9BQU8sRUFBRTtvQkFDeEQsV0FBVyxFQUFFLElBQUksQ0FBQyxjQUFjO29CQUNoQyxhQUFhLEVBQUUsUUFBUSxDQUFDLENBQUMsTUFBTSxFQUFFO29CQUNqQyxXQUFXLEVBQUUsR0FBRyxDQUFDLENBQUMsTUFBTSwwQkFBMEI7b0JBQ2xELElBQUksRUFBRSxHQUFHLENBQUMsYUFBYSxDQUFDLFFBQVE7b0JBQ2hDLElBQUksRUFBRSxHQUFHLENBQUMsYUFBYSxDQUFDLE1BQU07aUJBQy9CLENBQUMsQ0FBQzthQUNKO2lCQUFNO2dCQUNMLE9BQU8sQ0FBQyxLQUFLLENBQUMsc0JBQXNCLENBQUMsQ0FBQyxNQUFNLCtCQUErQixDQUFDLENBQUE7Z0JBQzVFLElBQUEsY0FBSSxFQUFDLENBQUMsQ0FBQyxDQUFBO2FBQ1I7UUFDSCxDQUFDLENBQUMsQ0FBQztJQUNMLENBQUM7Q0FDRjtBQWpKRCxnREFpSkMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgaWFtID0gcmVxdWlyZSgnYXdzLWNkay1saWIvYXdzLWlhbScpO1xuaW1wb3J0IHNzbSA9IHJlcXVpcmUoJ2F3cy1jZGstbGliL2F3cy1zc20nKTtcbmltcG9ydCBhY20gPSByZXF1aXJlKCdhd3MtY2RrLWxpYi9hd3MtY2VydGlmaWNhdGVtYW5hZ2VyJyk7XG5pbXBvcnQgY2RrID0gcmVxdWlyZSgnYXdzLWNkay1saWInKTtcbmltcG9ydCB7IEVmZmVjdCB9IGZyb20gJ2F3cy1jZGstbGliL2F3cy1pYW0nO1xuaW1wb3J0IHsgQ25hbWVSZWNvcmQsIEhvc3RlZFpvbmUsIE14UmVjb3JkLCBQdWJsaWNIb3N0ZWRab25lIH0gZnJvbSAnYXdzLWNkay1saWIvYXdzLXJvdXRlNTMnO1xuaW1wb3J0IHsgQ29uc3RydWN0IH0gZnJvbSAnY29uc3RydWN0cyc7XG5pbXBvcnQgeyBEb21haW5SZWNvcmRzLCBSb3V0ZTUzUGFyZW50Q29uZmlnIH0gZnJvbSAnLi4vLi4vaW50ZXJmYWNlcy9saWIvcm91dGU1My9pbnRlcmZhY2VzJztcbmltcG9ydCB7IGV4aXQgfSBmcm9tICdwcm9jZXNzJztcblxuZXhwb3J0IGNsYXNzIFJvdXRlNTNQYXJlbnRTdGFjayBleHRlbmRzIGNkay5TdGFjayB7XG4gIGNvbmZpZzogUm91dGU1M1BhcmVudENvbmZpZztcblxuICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nLCBjb25maWc6IFJvdXRlNTNQYXJlbnRDb25maWcsIHByb3BzPzogY2RrLlN0YWNrUHJvcHMpIHtcbiAgICBzdXBlcihzY29wZSwgaWQsIHByb3BzKTtcbiAgICB0aGlzLmNvbmZpZyA9IGNvbmZpZztcblxuICAgIHZhciBwYXJlbnRab25lTWFwID0gbmV3IE1hcDxzdHJpbmcsIFB1YmxpY0hvc3RlZFpvbmU+KCk7XG5cbiAgICB0aGlzLmNvbmZpZy5kb21haW5OYW1lcy5mb3JFYWNoKChkb21haW4pID0+IHtcbiAgICAgIGNvbnN0IHBhcmVudFpvbmUgPSBuZXcgUHVibGljSG9zdGVkWm9uZSh0aGlzLCBgJHtkb21haW4ucmVwbGFjZSgnLicsICcnKX1QYXJlbnRab25lYCwge1xuICAgICAgICB6b25lTmFtZTogYCR7ZG9tYWlufWAsXG4gICAgICB9KTtcblxuICAgICAgcGFyZW50Wm9uZU1hcC5zZXQoZG9tYWluLCBwYXJlbnRab25lKTtcblxuICAgICAgY29uc3QgcGFyYW0gPSBuZXcgc3NtLlN0cmluZ1BhcmFtZXRlcih0aGlzLCBgJHtkb21haW4ucmVwbGFjZSgnLicsICcnKX1ab25lUGFyYW1gLCB7XG4gICAgICAgIHN0cmluZ1ZhbHVlOiBwYXJlbnRab25lLmhvc3RlZFpvbmVJZCxcbiAgICAgICAgcGFyYW1ldGVyTmFtZTogYC9yb3V0ZTUzLyR7ZG9tYWlufS96b25lYCxcbiAgICAgICAgZGVzY3JpcHRpb246IGAke2RvbWFpbn0gSG9zdGVkIFpvbmUgSURgLFxuICAgICAgICB0aWVyOiBzc20uUGFyYW1ldGVyVGllci5TVEFOREFSRCxcbiAgICAgICAgdHlwZTogc3NtLlBhcmFtZXRlclR5cGUuU1RSSU5HLFxuICAgICAgfSk7XG4gICAgfSk7XG5cbiAgICBwYXJlbnRab25lTWFwLmZvckVhY2goKHBhcmVudFpvbmUsIGRvbWFpbikgPT4ge1xuICAgICAgY29uZmlnLmNyb3NzQWNjb3VudERlbGFnYXRpb25JZHMubWFwKChhY2NvdW50SWQpID0+IHtcbiAgICAgICAgLy8gSUFNIHJvbGUgYWxsb3dzIGNoaWxkIGFjY291bnQgdG8gYXNzdW1lIHJvbGUgYW5kIGNyZWF0ZSByZWNvcmQgc2V0XG4gICAgICAgIC8vIGZvciB0aGVpciBkb21haW4gbmFtZXNcbiAgICAgICAgbmV3IGlhbS5Sb2xlKHRoaXMsIGAke2RvbWFpbi5yZXBsYWNlKCcuJywgJycpLnRvVXBwZXJDYXNlKCl9Um91dGU1M1JvbGUke2FjY291bnRJZH1gLCB7XG4gICAgICAgICAgcm9sZU5hbWU6IGAke2RvbWFpbi5yZXBsYWNlKCcuJywgJycpLnRvVXBwZXJDYXNlKCl9LVJvdXRlNTNSb2xlLSR7YWNjb3VudElkfWAsXG4gICAgICAgICAgYXNzdW1lZEJ5OiBuZXcgaWFtLkFjY291bnRQcmluY2lwYWwoYWNjb3VudElkKSxcbiAgICAgICAgICBpbmxpbmVQb2xpY2llczoge1xuICAgICAgICAgICAgRGVsZWdhdGlvbjogbmV3IGlhbS5Qb2xpY3lEb2N1bWVudCh7XG4gICAgICAgICAgICAgIHN0YXRlbWVudHM6IFtcbiAgICAgICAgICAgICAgICBuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XG4gICAgICAgICAgICAgICAgICBhY3Rpb25zOiBbJ3JvdXRlNTM6Q2hhbmdlUmVzb3VyY2VSZWNvcmRTZXRzJ10sXG4gICAgICAgICAgICAgICAgICBlZmZlY3Q6IEVmZmVjdC5BTExPVyxcbiAgICAgICAgICAgICAgICAgIHJlc291cmNlczogW3BhcmVudFpvbmUuaG9zdGVkWm9uZUFybl0sXG4gICAgICAgICAgICAgICAgfSksXG4gICAgICAgICAgICAgICAgbmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xuICAgICAgICAgICAgICAgICAgYWN0aW9uczogWydyb3V0ZTUzOkxpc3RIb3N0ZWRab25lc0J5TmFtZSddLFxuICAgICAgICAgICAgICAgICAgZWZmZWN0OiBFZmZlY3QuQUxMT1csXG4gICAgICAgICAgICAgICAgICByZXNvdXJjZXM6IFsnKiddLFxuICAgICAgICAgICAgICAgIH0pLFxuICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgfSksXG4gICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgICB9KTtcblxuICAgIC8vIG1vc3QgZG9tYWlucyBhcmUgb3duZXJzaGlwIGlzIGluIGRldiBhY2NvdW50LiBIb3dldmVyLCBmb3IgZGV2IGFjY291bnQgd2Ugd2FudCB0byBjcmVhdGUgIHNvbWUgYWNtcyBhcyB3ZWxsXG4gICAgdGhpcy5jcmVhdGVBQ01zKCk7XG4gICAgdGhpcy5jcmVhdGVDZG5BQ01zKHBhcmVudFpvbmVNYXApO1xuICAgIHRoaXMuY3JlYXRlRG9tYWluUmVjb3JkcyhwYXJlbnRab25lTWFwKTtcbiAgfVxuXG4gIGNyZWF0ZURvbWFpblJlY29yZHMocGFyZW50Wm9uZU1hcDogTWFwPHN0cmluZywgUHVibGljSG9zdGVkWm9uZT4pIHtcbiAgICB0aGlzLmNvbmZpZy5kb21haW5SZWNvcmRzPy5tYXAoKGQpID0+IHtcbiAgICAgIGNvbnN0IGhvc3RlZFpvbmUgPSBwYXJlbnRab25lTWFwLmdldChkLmRvbWFpbik7XG4gICAgICBpZiAoaG9zdGVkWm9uZSkge1xuICAgICAgICB0aGlzLmNyZWF0ZU1YUmVjb3JkcyhkLCBob3N0ZWRab25lKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG4gIGNyZWF0ZU1YUmVjb3JkcyhkcjogRG9tYWluUmVjb3JkcywgaG9zdGVkWm9uZTogUHVibGljSG9zdGVkWm9uZSkge1xuICAgIGRyLm14UmVjb3Jkcz8ubWFwKChyY2QpID0+IHtcbiAgICAgIHZhciB2YWx1ZXMgPSByY2QudmFsdWVzLm1hcCgodikgPT4gKHtcbiAgICAgICAgaG9zdE5hbWU6IHYucG9pbnRzVG8sXG4gICAgICAgIHByaW9yaXR5OiB2LnByaW9yaXR5LFxuICAgICAgfSkpO1xuICAgICAgY29uc3QgbXhSZWNvcmQgPSBuZXcgTXhSZWNvcmQodGhpcywgYCR7ZHIuZG9tYWluLnJlcGxhY2UoJy4nLCAnJyl9JHtyY2QucmVjb3JkTmFtZX1NWFJlY29yZGAsIHtcbiAgICAgICAgdmFsdWVzOiB2YWx1ZXMsXG4gICAgICAgIHpvbmU6IGhvc3RlZFpvbmUsXG4gICAgICAgIGNvbW1lbnQ6IHJjZC5jb21tZW50LFxuICAgICAgICByZWNvcmROYW1lOiByY2QucmVjb3JkTmFtZSxcbiAgICAgICAgdHRsOiBjZGsuRHVyYXRpb24ubWludXRlcyhyY2QudHRsKSxcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9XG5cbiAgY3JlYXRlQUNNcygpIHtcbiAgICB0aGlzLmNvbmZpZy5hY21zPy5mb3JFYWNoKChkb21haW4pID0+IHtcbiAgICAgIGNvbnN0IGxnID0gZG9tYWluLnNwbGl0KCcuJykuc2xpY2UoMCwgMikuam9pbignJyk7XG4gICAgICBjb25zdCBjID0gbmV3IGFjbS5DZXJ0aWZpY2F0ZSh0aGlzLCBsZywge1xuICAgICAgICBkb21haW5OYW1lOiBkb21haW4sXG4gICAgICAgIHN1YmplY3RBbHRlcm5hdGl2ZU5hbWVzOiBbYHd3dy4ke2RvbWFpbn1gXSxcbiAgICAgICAgdmFsaWRhdGlvbjogYWNtLkNlcnRpZmljYXRlVmFsaWRhdGlvbi5mcm9tRG5zKCksIC8vIFJlY29yZHMgbXVzdCBiZSBhZGRlZCBtYW51YWxseVxuICAgICAgfSk7XG5cbiAgICAgIGNvbnN0IHBhcmFtID0gbmV3IHNzbS5TdHJpbmdQYXJhbWV0ZXIodGhpcywgYCR7bGd9UGFyYW1gLCB7XG4gICAgICAgIHN0cmluZ1ZhbHVlOiBjLmNlcnRpZmljYXRlQXJuLFxuICAgICAgICBwYXJhbWV0ZXJOYW1lOiBgL2FjbS8ke2RvbWFpbn1gLFxuICAgICAgICBkZXNjcmlwdGlvbjogYCR7ZG9tYWlufSBBQ01gLFxuICAgICAgICB0aWVyOiBzc20uUGFyYW1ldGVyVGllci5TVEFOREFSRCxcbiAgICAgICAgdHlwZTogc3NtLlBhcmFtZXRlclR5cGUuU1RSSU5HLFxuICAgICAgfSk7XG4gICAgfSk7XG4gIH1cblxuICBjcmVhdGVDZG5BQ01zKHBhcmVudFpvbmVNYXA6IE1hcDxzdHJpbmcsIFB1YmxpY0hvc3RlZFpvbmU+KSB7XG4gICAgLy8gRm9yIGNsb3VkZnJvbnQgZGlzdHJpYnV0aW9uIHdlIG5lZWQgdG8gY3JlYXRlIGEgY2VydGlmaWNhdGVcbiAgICB0aGlzLmNvbmZpZy5jZG5BY21zPy5mb3JFYWNoKGMgPT4ge1xuICAgICAgdmFyIGxnOiBzdHJpbmcgPSAnJztcbiAgICAgIC8vIFNvbWV0aW1lIHdlIGp1c3QgaGF2ZSBzaW5nbGUgem9uZSAtIFRvcCBsZXZlbCBkb21haW4gY2FuIHNpbXBseSBiZSBwYXNzZWQgYXMgWm9uZWRvbWFpblxuICAgICAgaWYgKCFjLnpvbmVEb21haW4pIHtcbiAgICAgICAgbGcgPSBjLmRvbWFpbi5zcGxpdCgnLicpLnNsaWNlKDEsIGMuZG9tYWluLnNwbGl0KCcuJykubGVuZ3RoKS5qb2luKCcuJyk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBsZyA9IGMuem9uZURvbWFpblxuICAgICAgfVxuXG4gICAgICAvLyBJbmNhc2Ugd2UgaGF2ZSBhbHJlYWR5IGRlZmluZWQgb3V0c2lkZVxuICAgICAgdmFyIGhvc3RlZFpvbmVcbiAgICAgIGlmIChjLnBhcmVudEhvc3RlZFpvbmVJZCAmJiBjLnBhcmVudEhvc3RlZFpvbmVOYW1lKSB7XG4gICAgICAgIGhvc3RlZFpvbmUgPSBIb3N0ZWRab25lLmZyb21Ib3N0ZWRab25lQXR0cmlidXRlcyh0aGlzLCAnUGFyZW50SG9zdGVkWm9uZUlkJywge1xuICAgICAgICAgIGhvc3RlZFpvbmVJZDogYy5wYXJlbnRIb3N0ZWRab25lSWQsXG4gICAgICAgICAgem9uZU5hbWU6IGMucGFyZW50SG9zdGVkWm9uZU5hbWVcbiAgICAgICAgfSlcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGhvc3RlZFpvbmUgPSBwYXJlbnRab25lTWFwLmdldChsZyk7XG4gICAgICB9XG5cbiAgICAgIGlmIChob3N0ZWRab25lKSB7XG4gICAgICAgIGNvbnN0IGNlcnQgPSBuZXcgYWNtLkRuc1ZhbGlkYXRlZENlcnRpZmljYXRlKHRoaXMsICdDcm9zc1JlZ2lvbkNlcnRpZmljYXRlJywge1xuICAgICAgICAgIGRvbWFpbk5hbWU6IGMuZG9tYWluID8gYy5kb21haW4gOiBjLnpvbmVEb21haW4hLFxuICAgICAgICAgIHN1YmplY3RBbHRlcm5hdGl2ZU5hbWVzOiBjLmFsdGVybmF0aXZlRG9tYWlucyxcbiAgICAgICAgICBob3N0ZWRab25lOiBob3N0ZWRab25lLFxuICAgICAgICAgIHJlZ2lvbjogJ3VzLWVhc3QtMScsXG4gICAgICAgIH0pO1xuXG4gICAgICAgIGNvbnN0IHBhcmFtID0gbmV3IHNzbS5TdHJpbmdQYXJhbWV0ZXIodGhpcywgYCR7bGd9UGFyYW1gLCB7XG4gICAgICAgICAgc3RyaW5nVmFsdWU6IGNlcnQuY2VydGlmaWNhdGVBcm4sXG4gICAgICAgICAgcGFyYW1ldGVyTmFtZTogYC9hY20vJHtjLmRvbWFpbn1gLFxuICAgICAgICAgIGRlc2NyaXB0aW9uOiBgJHtjLmRvbWFpbn0gQUNNIChDZXJ0IGluIFVTLUVhc3QtMSlgLFxuICAgICAgICAgIHRpZXI6IHNzbS5QYXJhbWV0ZXJUaWVyLlNUQU5EQVJELFxuICAgICAgICAgIHR5cGU6IHNzbS5QYXJhbWV0ZXJUeXBlLlNUUklORyxcbiAgICAgICAgfSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb25zb2xlLmVycm9yKGBbUm91dGU1M11bc3ViWm9uZV0gJHtjLmRvbWFpbn0gbm90IGZvdW5kIGluIHBhcmVudCB6b25lIG1hcGApXG4gICAgICAgIGV4aXQoMSlcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxufVxuIl19
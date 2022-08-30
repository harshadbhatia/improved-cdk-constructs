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
                    parameterName: c.domain ? `/acm/${c.domain}` : `/acm/${c.zoneDomain}`,
                    description: `${c.domain} ACM (Cert in US-East-1)`,
                    tier: ssm.ParameterTier.STANDARD,
                    type: ssm.ParameterType.STRING,
                });
            }
            else {
                console.error(`[Route53][ParentZone] ${c.domain} not found in parent zone map`);
                (0, process_1.exit)(1);
            }
        });
    }
}
exports.Route53ParentStack = Route53ParentStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFyZW50SG9zdGVkWm9uZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInBhcmVudEhvc3RlZFpvbmUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsMkNBQTRDO0FBQzVDLDJDQUE0QztBQUM1QywwREFBMkQ7QUFDM0QsbUNBQW9DO0FBQ3BDLGlEQUE2QztBQUM3Qyx5REFBOEY7QUFHOUYscUNBQStCO0FBRS9CLE1BQWEsa0JBQW1CLFNBQVEsR0FBRyxDQUFDLEtBQUs7SUFHL0MsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxNQUEyQixFQUFFLEtBQXNCO1FBQzNGLEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQ3hCLElBQUksQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFDO1FBRXJCLElBQUksYUFBYSxHQUFHLElBQUksR0FBRyxFQUE0QixDQUFDO1FBRXhELElBQUksQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxDQUFDLE1BQU0sRUFBRSxFQUFFO1lBQ3pDLE1BQU0sVUFBVSxHQUFHLElBQUksOEJBQWdCLENBQUMsSUFBSSxFQUFFLEdBQUcsTUFBTSxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDLFlBQVksRUFBRTtnQkFDcEYsUUFBUSxFQUFFLEdBQUcsTUFBTSxFQUFFO2FBQ3RCLENBQUMsQ0FBQztZQUVILGFBQWEsQ0FBQyxHQUFHLENBQUMsTUFBTSxFQUFFLFVBQVUsQ0FBQyxDQUFDO1lBRXRDLE1BQU0sS0FBSyxHQUFHLElBQUksR0FBRyxDQUFDLGVBQWUsQ0FBQyxJQUFJLEVBQUUsR0FBRyxNQUFNLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUMsV0FBVyxFQUFFO2dCQUNqRixXQUFXLEVBQUUsVUFBVSxDQUFDLFlBQVk7Z0JBQ3BDLGFBQWEsRUFBRSxZQUFZLE1BQU0sT0FBTztnQkFDeEMsV0FBVyxFQUFFLEdBQUcsTUFBTSxpQkFBaUI7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LHVCQUF1QixFQUFFLENBQUMsQ0FBQyxrQkFBa0I7b0JBQzdDLFVBQVUsRUFBRSxVQUFVO29CQUN0QixNQUFNLEVBQUUsV0FBVztpQkFDcEIsQ0FBQyxDQUFDO2dCQUVILE1BQU0sS0FBSyxHQUFHLElBQUksR0FBRyxDQUFDLGVBQWUsQ0FBQyxJQUFJLEVBQUUsR0FBRyxFQUFFLE9BQU8sRUFBRTtvQkFDeEQsV0FBVyxFQUFFLElBQUksQ0FBQyxjQUFjO29CQUNoQyxhQUFhLEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLFVBQVcsRUFBRTtvQkFDdEUsV0FBVyxFQUFFLEdBQUcsQ0FBQyxDQUFDLE1BQU0sMEJBQTBCO29CQUNsRCxJQUFJLEVBQUUsR0FBRyxDQUFDLGFBQWEsQ0FBQyxRQUFRO29CQUNoQyxJQUFJLEVBQUUsR0FBRyxDQUFDLGFBQWEsQ0FBQyxNQUFNO2lCQUMvQixDQUFDLENBQUM7YUFDSjtpQkFBTTtnQkFDTCxPQUFPLENBQUMsS0FBSyxDQUFDLHlCQUF5QixDQUFDLENBQUMsTUFBTSwrQkFBK0IsQ0FBQyxDQUFBO2dCQUMvRSxJQUFBLGNBQUksRUFBQyxDQUFDLENBQUMsQ0FBQTthQUNSO1FBQ0gsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDO0NBQ0Y7QUFqSkQsZ0RBaUpDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IGlhbSA9IHJlcXVpcmUoJ2F3cy1jZGstbGliL2F3cy1pYW0nKTtcbmltcG9ydCBzc20gPSByZXF1aXJlKCdhd3MtY2RrLWxpYi9hd3Mtc3NtJyk7XG5pbXBvcnQgYWNtID0gcmVxdWlyZSgnYXdzLWNkay1saWIvYXdzLWNlcnRpZmljYXRlbWFuYWdlcicpO1xuaW1wb3J0IGNkayA9IHJlcXVpcmUoJ2F3cy1jZGstbGliJyk7XG5pbXBvcnQgeyBFZmZlY3QgfSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtaWFtJztcbmltcG9ydCB7IENuYW1lUmVjb3JkLCBIb3N0ZWRab25lLCBNeFJlY29yZCwgUHVibGljSG9zdGVkWm9uZSB9IGZyb20gJ2F3cy1jZGstbGliL2F3cy1yb3V0ZTUzJztcbmltcG9ydCB7IENvbnN0cnVjdCB9IGZyb20gJ2NvbnN0cnVjdHMnO1xuaW1wb3J0IHsgRG9tYWluUmVjb3JkcywgUm91dGU1M1BhcmVudENvbmZpZyB9IGZyb20gJy4uLy4uL2ludGVyZmFjZXMvbGliL3JvdXRlNTMvaW50ZXJmYWNlcyc7XG5pbXBvcnQgeyBleGl0IH0gZnJvbSAncHJvY2Vzcyc7XG5cbmV4cG9ydCBjbGFzcyBSb3V0ZTUzUGFyZW50U3RhY2sgZXh0ZW5kcyBjZGsuU3RhY2sge1xuICBjb25maWc6IFJvdXRlNTNQYXJlbnRDb25maWc7XG5cbiAgY29uc3RydWN0b3Ioc2NvcGU6IENvbnN0cnVjdCwgaWQ6IHN0cmluZywgY29uZmlnOiBSb3V0ZTUzUGFyZW50Q29uZmlnLCBwcm9wcz86IGNkay5TdGFja1Byb3BzKSB7XG4gICAgc3VwZXIoc2NvcGUsIGlkLCBwcm9wcyk7XG4gICAgdGhpcy5jb25maWcgPSBjb25maWc7XG5cbiAgICB2YXIgcGFyZW50Wm9uZU1hcCA9IG5ldyBNYXA8c3RyaW5nLCBQdWJsaWNIb3N0ZWRab25lPigpO1xuXG4gICAgdGhpcy5jb25maWcuZG9tYWluTmFtZXMuZm9yRWFjaCgoZG9tYWluKSA9PiB7XG4gICAgICBjb25zdCBwYXJlbnRab25lID0gbmV3IFB1YmxpY0hvc3RlZFpvbmUodGhpcywgYCR7ZG9tYWluLnJlcGxhY2UoJy4nLCAnJyl9UGFyZW50Wm9uZWAsIHtcbiAgICAgICAgem9uZU5hbWU6IGAke2RvbWFpbn1gLFxuICAgICAgfSk7XG5cbiAgICAgIHBhcmVudFpvbmVNYXAuc2V0KGRvbWFpbiwgcGFyZW50Wm9uZSk7XG5cbiAgICAgIGNvbnN0IHBhcmFtID0gbmV3IHNzbS5TdHJpbmdQYXJhbWV0ZXIodGhpcywgYCR7ZG9tYWluLnJlcGxhY2UoJy4nLCAnJyl9Wm9uZVBhcmFtYCwge1xuICAgICAgICBzdHJpbmdWYWx1ZTogcGFyZW50Wm9uZS5ob3N0ZWRab25lSWQsXG4gICAgICAgIHBhcmFtZXRlck5hbWU6IGAvcm91dGU1My8ke2RvbWFpbn0vem9uZWAsXG4gICAgICAgIGRlc2NyaXB0aW9uOiBgJHtkb21haW59IEhvc3RlZCBab25lIElEYCxcbiAgICAgICAgdGllcjogc3NtLlBhcmFtZXRlclRpZXIuU1RBTkRBUkQsXG4gICAgICAgIHR5cGU6IHNzbS5QYXJhbWV0ZXJUeXBlLlNUUklORyxcbiAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgcGFyZW50Wm9uZU1hcC5mb3JFYWNoKChwYXJlbnRab25lLCBkb21haW4pID0+IHtcbiAgICAgIGNvbmZpZy5jcm9zc0FjY291bnREZWxhZ2F0aW9uSWRzLm1hcCgoYWNjb3VudElkKSA9PiB7XG4gICAgICAgIC8vIElBTSByb2xlIGFsbG93cyBjaGlsZCBhY2NvdW50IHRvIGFzc3VtZSByb2xlIGFuZCBjcmVhdGUgcmVjb3JkIHNldFxuICAgICAgICAvLyBmb3IgdGhlaXIgZG9tYWluIG5hbWVzXG4gICAgICAgIG5ldyBpYW0uUm9sZSh0aGlzLCBgJHtkb21haW4ucmVwbGFjZSgnLicsICcnKS50b1VwcGVyQ2FzZSgpfVJvdXRlNTNSb2xlJHthY2NvdW50SWR9YCwge1xuICAgICAgICAgIHJvbGVOYW1lOiBgJHtkb21haW4ucmVwbGFjZSgnLicsICcnKS50b1VwcGVyQ2FzZSgpfS1Sb3V0ZTUzUm9sZS0ke2FjY291bnRJZH1gLFxuICAgICAgICAgIGFzc3VtZWRCeTogbmV3IGlhbS5BY2NvdW50UHJpbmNpcGFsKGFjY291bnRJZCksXG4gICAgICAgICAgaW5saW5lUG9saWNpZXM6IHtcbiAgICAgICAgICAgIERlbGVnYXRpb246IG5ldyBpYW0uUG9saWN5RG9jdW1lbnQoe1xuICAgICAgICAgICAgICBzdGF0ZW1lbnRzOiBbXG4gICAgICAgICAgICAgICAgbmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xuICAgICAgICAgICAgICAgICAgYWN0aW9uczogWydyb3V0ZTUzOkNoYW5nZVJlc291cmNlUmVjb3JkU2V0cyddLFxuICAgICAgICAgICAgICAgICAgZWZmZWN0OiBFZmZlY3QuQUxMT1csXG4gICAgICAgICAgICAgICAgICByZXNvdXJjZXM6IFtwYXJlbnRab25lLmhvc3RlZFpvbmVBcm5dLFxuICAgICAgICAgICAgICAgIH0pLFxuICAgICAgICAgICAgICAgIG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcbiAgICAgICAgICAgICAgICAgIGFjdGlvbnM6IFsncm91dGU1MzpMaXN0SG9zdGVkWm9uZXNCeU5hbWUnXSxcbiAgICAgICAgICAgICAgICAgIGVmZmVjdDogRWZmZWN0LkFMTE9XLFxuICAgICAgICAgICAgICAgICAgcmVzb3VyY2VzOiBbJyonXSxcbiAgICAgICAgICAgICAgICB9KSxcbiAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIH0pLFxuICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gICAgfSk7XG5cbiAgICAvLyBtb3N0IGRvbWFpbnMgYXJlIG93bmVyc2hpcCBpcyBpbiBkZXYgYWNjb3VudC4gSG93ZXZlciwgZm9yIGRldiBhY2NvdW50IHdlIHdhbnQgdG8gY3JlYXRlICBzb21lIGFjbXMgYXMgd2VsbFxuICAgIHRoaXMuY3JlYXRlQUNNcygpO1xuICAgIHRoaXMuY3JlYXRlQ2RuQUNNcyhwYXJlbnRab25lTWFwKTtcbiAgICB0aGlzLmNyZWF0ZURvbWFpblJlY29yZHMocGFyZW50Wm9uZU1hcCk7XG4gIH1cblxuICBjcmVhdGVEb21haW5SZWNvcmRzKHBhcmVudFpvbmVNYXA6IE1hcDxzdHJpbmcsIFB1YmxpY0hvc3RlZFpvbmU+KSB7XG4gICAgdGhpcy5jb25maWcuZG9tYWluUmVjb3Jkcz8ubWFwKChkKSA9PiB7XG4gICAgICBjb25zdCBob3N0ZWRab25lID0gcGFyZW50Wm9uZU1hcC5nZXQoZC5kb21haW4pO1xuICAgICAgaWYgKGhvc3RlZFpvbmUpIHtcbiAgICAgICAgdGhpcy5jcmVhdGVNWFJlY29yZHMoZCwgaG9zdGVkWm9uZSk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICBjcmVhdGVNWFJlY29yZHMoZHI6IERvbWFpblJlY29yZHMsIGhvc3RlZFpvbmU6IFB1YmxpY0hvc3RlZFpvbmUpIHtcbiAgICBkci5teFJlY29yZHM/Lm1hcCgocmNkKSA9PiB7XG4gICAgICB2YXIgdmFsdWVzID0gcmNkLnZhbHVlcy5tYXAoKHYpID0+ICh7XG4gICAgICAgIGhvc3ROYW1lOiB2LnBvaW50c1RvLFxuICAgICAgICBwcmlvcml0eTogdi5wcmlvcml0eSxcbiAgICAgIH0pKTtcbiAgICAgIGNvbnN0IG14UmVjb3JkID0gbmV3IE14UmVjb3JkKHRoaXMsIGAke2RyLmRvbWFpbi5yZXBsYWNlKCcuJywgJycpfSR7cmNkLnJlY29yZE5hbWV9TVhSZWNvcmRgLCB7XG4gICAgICAgIHZhbHVlczogdmFsdWVzLFxuICAgICAgICB6b25lOiBob3N0ZWRab25lLFxuICAgICAgICBjb21tZW50OiByY2QuY29tbWVudCxcbiAgICAgICAgcmVjb3JkTmFtZTogcmNkLnJlY29yZE5hbWUsXG4gICAgICAgIHR0bDogY2RrLkR1cmF0aW9uLm1pbnV0ZXMocmNkLnR0bCksXG4gICAgICB9KTtcbiAgICB9KTtcbiAgfVxuXG4gIGNyZWF0ZUFDTXMoKSB7XG4gICAgdGhpcy5jb25maWcuYWNtcz8uZm9yRWFjaCgoZG9tYWluKSA9PiB7XG4gICAgICBjb25zdCBsZyA9IGRvbWFpbi5zcGxpdCgnLicpLnNsaWNlKDAsIDIpLmpvaW4oJycpO1xuICAgICAgY29uc3QgYyA9IG5ldyBhY20uQ2VydGlmaWNhdGUodGhpcywgbGcsIHtcbiAgICAgICAgZG9tYWluTmFtZTogZG9tYWluLFxuICAgICAgICBzdWJqZWN0QWx0ZXJuYXRpdmVOYW1lczogW2B3d3cuJHtkb21haW59YF0sXG4gICAgICAgIHZhbGlkYXRpb246IGFjbS5DZXJ0aWZpY2F0ZVZhbGlkYXRpb24uZnJvbURucygpLCAvLyBSZWNvcmRzIG11c3QgYmUgYWRkZWQgbWFudWFsbHlcbiAgICAgIH0pO1xuXG4gICAgICBjb25zdCBwYXJhbSA9IG5ldyBzc20uU3RyaW5nUGFyYW1ldGVyKHRoaXMsIGAke2xnfVBhcmFtYCwge1xuICAgICAgICBzdHJpbmdWYWx1ZTogYy5jZXJ0aWZpY2F0ZUFybixcbiAgICAgICAgcGFyYW1ldGVyTmFtZTogYC9hY20vJHtkb21haW59YCxcbiAgICAgICAgZGVzY3JpcHRpb246IGAke2RvbWFpbn0gQUNNYCxcbiAgICAgICAgdGllcjogc3NtLlBhcmFtZXRlclRpZXIuU1RBTkRBUkQsXG4gICAgICAgIHR5cGU6IHNzbS5QYXJhbWV0ZXJUeXBlLlNUUklORyxcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9XG5cbiAgY3JlYXRlQ2RuQUNNcyhwYXJlbnRab25lTWFwOiBNYXA8c3RyaW5nLCBQdWJsaWNIb3N0ZWRab25lPikge1xuICAgIC8vIEZvciBjbG91ZGZyb250IGRpc3RyaWJ1dGlvbiB3ZSBuZWVkIHRvIGNyZWF0ZSBhIGNlcnRpZmljYXRlXG4gICAgdGhpcy5jb25maWcuY2RuQWNtcz8uZm9yRWFjaChjID0+IHtcbiAgICAgIHZhciBsZzogc3RyaW5nID0gJyc7XG4gICAgICAvLyBTb21ldGltZSB3ZSBqdXN0IGhhdmUgc2luZ2xlIHpvbmUgLSBUb3AgbGV2ZWwgZG9tYWluIGNhbiBzaW1wbHkgYmUgcGFzc2VkIGFzIFpvbmVkb21haW5cbiAgICAgIGlmICghYy56b25lRG9tYWluKSB7XG4gICAgICAgIGxnID0gYy5kb21haW4uc3BsaXQoJy4nKS5zbGljZSgxLCBjLmRvbWFpbi5zcGxpdCgnLicpLmxlbmd0aCkuam9pbignLicpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbGcgPSBjLnpvbmVEb21haW5cbiAgICAgIH1cblxuICAgICAgLy8gSW5jYXNlIHdlIGhhdmUgYWxyZWFkeSBkZWZpbmVkIG91dHNpZGVcbiAgICAgIHZhciBob3N0ZWRab25lXG4gICAgICBpZiAoYy5wYXJlbnRIb3N0ZWRab25lSWQgJiYgYy5wYXJlbnRIb3N0ZWRab25lTmFtZSkge1xuICAgICAgICBob3N0ZWRab25lID0gSG9zdGVkWm9uZS5mcm9tSG9zdGVkWm9uZUF0dHJpYnV0ZXModGhpcywgJ1BhcmVudEhvc3RlZFpvbmVJZCcsIHtcbiAgICAgICAgICBob3N0ZWRab25lSWQ6IGMucGFyZW50SG9zdGVkWm9uZUlkLFxuICAgICAgICAgIHpvbmVOYW1lOiBjLnBhcmVudEhvc3RlZFpvbmVOYW1lXG4gICAgICAgIH0pXG4gICAgICB9IGVsc2Uge1xuICAgICAgICBob3N0ZWRab25lID0gcGFyZW50Wm9uZU1hcC5nZXQobGcpO1xuICAgICAgfVxuXG4gICAgICBpZiAoaG9zdGVkWm9uZSkge1xuICAgICAgICBjb25zdCBjZXJ0ID0gbmV3IGFjbS5EbnNWYWxpZGF0ZWRDZXJ0aWZpY2F0ZSh0aGlzLCAnQ3Jvc3NSZWdpb25DZXJ0aWZpY2F0ZScsIHtcbiAgICAgICAgICBkb21haW5OYW1lOiBjLmRvbWFpbiA/IGMuZG9tYWluIDogYy56b25lRG9tYWluISxcbiAgICAgICAgICBzdWJqZWN0QWx0ZXJuYXRpdmVOYW1lczogYy5hbHRlcm5hdGl2ZURvbWFpbnMsXG4gICAgICAgICAgaG9zdGVkWm9uZTogaG9zdGVkWm9uZSxcbiAgICAgICAgICByZWdpb246ICd1cy1lYXN0LTEnLFxuICAgICAgICB9KTtcblxuICAgICAgICBjb25zdCBwYXJhbSA9IG5ldyBzc20uU3RyaW5nUGFyYW1ldGVyKHRoaXMsIGAke2xnfVBhcmFtYCwge1xuICAgICAgICAgIHN0cmluZ1ZhbHVlOiBjZXJ0LmNlcnRpZmljYXRlQXJuLFxuICAgICAgICAgIHBhcmFtZXRlck5hbWU6IGMuZG9tYWluID8gYC9hY20vJHtjLmRvbWFpbn1gIDogYC9hY20vJHtjLnpvbmVEb21haW4hfWAsXG4gICAgICAgICAgZGVzY3JpcHRpb246IGAke2MuZG9tYWlufSBBQ00gKENlcnQgaW4gVVMtRWFzdC0xKWAsXG4gICAgICAgICAgdGllcjogc3NtLlBhcmFtZXRlclRpZXIuU1RBTkRBUkQsXG4gICAgICAgICAgdHlwZTogc3NtLlBhcmFtZXRlclR5cGUuU1RSSU5HLFxuICAgICAgICB9KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoYFtSb3V0ZTUzXVtQYXJlbnRab25lXSAke2MuZG9tYWlufSBub3QgZm91bmQgaW4gcGFyZW50IHpvbmUgbWFwYClcbiAgICAgICAgZXhpdCgxKVxuICAgICAgfVxuICAgIH0pO1xuICB9XG59XG4iXX0=
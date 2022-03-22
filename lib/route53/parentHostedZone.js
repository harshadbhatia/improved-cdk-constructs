"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Route53ParentStack = void 0;
const iam = require("aws-cdk-lib/aws-iam");
const ssm = require("aws-cdk-lib/aws-ssm");
const acm = require("aws-cdk-lib/aws-certificatemanager");
const cdk = require("aws-cdk-lib");
const aws_iam_1 = require("aws-cdk-lib/aws-iam");
const aws_route53_1 = require("aws-cdk-lib/aws-route53");
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
                validation: acm.CertificateValidation.fromDns(),
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
        (_a = this.config.cdnAcms) === null || _a === void 0 ? void 0 : _a.forEach((domain) => {
            const lg = domain.split('.').slice(1, domain.split('.').length).join('.');
            const hostedZone = parentZoneMap.get(lg);
            if (hostedZone) {
                const cert = new acm.DnsValidatedCertificate(this, 'CrossRegionCertificate', {
                    domainName: domain,
                    hostedZone: hostedZone,
                    region: 'us-east-1',
                });
                const param = new ssm.StringParameter(this, `${lg}Param`, {
                    stringValue: cert.certificateArn,
                    parameterName: `/acm/${domain}`,
                    description: `${domain} ACM (Cert in US-East-1)`,
                    tier: ssm.ParameterTier.STANDARD,
                    type: ssm.ParameterType.STRING,
                });
            }
        });
    }
}
exports.Route53ParentStack = Route53ParentStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFyZW50SG9zdGVkWm9uZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInBhcmVudEhvc3RlZFpvbmUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsMkNBQTRDO0FBQzVDLDJDQUE0QztBQUM1QywwREFBMkQ7QUFDM0QsbUNBQW9DO0FBQ3BDLGlEQUE2QztBQUM3Qyx5REFBa0Y7QUFLbEYsTUFBYSxrQkFBbUIsU0FBUSxHQUFHLENBQUMsS0FBSztJQUcvQyxZQUFZLEtBQWdCLEVBQUUsRUFBVSxFQUFFLE1BQTJCLEVBQUUsS0FBc0I7UUFDM0YsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDeEIsSUFBSSxDQUFDLE1BQU0sR0FBRyxNQUFNLENBQUM7UUFFckIsSUFBSSxhQUFhLEdBQUcsSUFBSSxHQUFHLEVBQTRCLENBQUM7UUFFeEQsSUFBSSxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLENBQUMsTUFBTSxFQUFFLEVBQUU7WUFDekMsTUFBTSxVQUFVLEdBQUcsSUFBSSw4QkFBZ0IsQ0FBQyxJQUFJLEVBQUUsR0FBRyxNQUFNLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUMsWUFBWSxFQUFFO2dCQUNwRixRQUFRLEVBQUUsR0FBRyxNQUFNLEVBQUU7YUFDdEIsQ0FBQyxDQUFDO1lBRUgsYUFBYSxDQUFDLEdBQUcsQ0FBQyxNQUFNLEVBQUUsVUFBVSxDQUFDLENBQUM7WUFFdEMsTUFBTSxLQUFLLEdBQUcsSUFBSSxHQUFHLENBQUMsZUFBZSxDQUFDLElBQUksRUFBRSxHQUFHLE1BQU0sQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxXQUFXLEVBQUU7Z0JBQ2pGLFdBQVcsRUFBRSxVQUFVLENBQUMsWUFBWTtnQkFDcEMsYUFBYSxFQUFFLFlBQVksTUFBTSxPQUFPO2dCQUN4QyxXQUFXLEVBQUUsR0FBRyxNQUFNLGlCQUFpQjtnQkFDdkMsSUFBSSxF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RDtRQUM5RCxNQUFBLElBQUksQ0FBQyxNQUFNLENBQUMsT0FBTywwQ0FBRSxPQUFPLENBQUMsQ0FBQyxNQUFNLEVBQUUsRUFBRTtZQUN0QyxNQUFNLEVBQUUsR0FBRyxNQUFNLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDMUUsTUFBTSxVQUFVLEdBQUcsYUFBYSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQztZQUV6QyxJQUFJLFVBQVUsRUFBRTtnQkFDZCxNQUFNLElBQUksR0FBRyxJQUFJLEdBQUcsQ0FBQyx1QkFBdUIsQ0FBQyxJQUFJLEVBQUUsd0JBQXdCLEVBQUU7b0JBQzNFLFVBQVUsRUFBRSxNQUFNO29CQUNsQixVQUFVLEVBQUUsVUFBVTtvQkFDdEIsTUFBTSxFQUFFLFdBQVc7aUJBQ3BCLENBQUMsQ0FBQztnQkFFSCxNQUFNLEtBQUssR0FBRyxJQUFJLEdBQUcsQ0FBQyxlQUFlLENBQUMsSUFBSSxFQUFFLEdBQUcsRUFBRSxPQUFPLEVBQUU7b0JBQ3hELFdBQVcsRUFBRSxJQUFJLENBQUMsY0FBYztvQkFDaEMsYUFBYSxFQUFFLFFBQVEsTUFBTSxFQUFFO29CQUMvQixXQUFXLEVBQUUsR0FBRyxNQUFNLDBCQUEwQjtvQkFDaEQsSUFBSSxFQUFFLEdBQUcsQ0FBQyxhQUFhLENBQUMsUUFBUTtvQkFDaEMsSUFBSSxFQUFFLEdBQUcsQ0FBQyxhQUFhLENBQUMsTUFBTTtpQkFDL0IsQ0FBQyxDQUFDO2FBQ0o7UUFDSCxDQUFDLEVBQUU7SUFDTCxDQUFDO0NBQ0Y7QUE3SEQsZ0RBNkhDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IGlhbSA9IHJlcXVpcmUoJ2F3cy1jZGstbGliL2F3cy1pYW0nKTtcbmltcG9ydCBzc20gPSByZXF1aXJlKCdhd3MtY2RrLWxpYi9hd3Mtc3NtJyk7XG5pbXBvcnQgYWNtID0gcmVxdWlyZSgnYXdzLWNkay1saWIvYXdzLWNlcnRpZmljYXRlbWFuYWdlcicpO1xuaW1wb3J0IGNkayA9IHJlcXVpcmUoJ2F3cy1jZGstbGliJyk7XG5pbXBvcnQgeyBFZmZlY3QgfSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtaWFtJztcbmltcG9ydCB7IENuYW1lUmVjb3JkLCBNeFJlY29yZCwgUHVibGljSG9zdGVkWm9uZSB9IGZyb20gJ2F3cy1jZGstbGliL2F3cy1yb3V0ZTUzJztcbmltcG9ydCB7IENvbnN0cnVjdCB9IGZyb20gJ2NvbnN0cnVjdHMnO1xuaW1wb3J0IHsgRG9tYWluUmVjb3JkcywgUm91dGU1M1BhcmVudENvbmZpZyB9IGZyb20gJy4uLy4uL2ludGVyZmFjZXMvbGliL3JvdXRlNTMvaW50ZXJmYWNlcyc7XG5pbXBvcnQgeyBleGl0IH0gZnJvbSAncHJvY2Vzcyc7XG5cbmV4cG9ydCBjbGFzcyBSb3V0ZTUzUGFyZW50U3RhY2sgZXh0ZW5kcyBjZGsuU3RhY2sge1xuICBjb25maWc6IFJvdXRlNTNQYXJlbnRDb25maWc7XG5cbiAgY29uc3RydWN0b3Ioc2NvcGU6IENvbnN0cnVjdCwgaWQ6IHN0cmluZywgY29uZmlnOiBSb3V0ZTUzUGFyZW50Q29uZmlnLCBwcm9wcz86IGNkay5TdGFja1Byb3BzKSB7XG4gICAgc3VwZXIoc2NvcGUsIGlkLCBwcm9wcyk7XG4gICAgdGhpcy5jb25maWcgPSBjb25maWc7XG5cbiAgICB2YXIgcGFyZW50Wm9uZU1hcCA9IG5ldyBNYXA8c3RyaW5nLCBQdWJsaWNIb3N0ZWRab25lPigpO1xuXG4gICAgdGhpcy5jb25maWcuZG9tYWluTmFtZXMuZm9yRWFjaCgoZG9tYWluKSA9PiB7XG4gICAgICBjb25zdCBwYXJlbnRab25lID0gbmV3IFB1YmxpY0hvc3RlZFpvbmUodGhpcywgYCR7ZG9tYWluLnJlcGxhY2UoJy4nLCAnJyl9UGFyZW50Wm9uZWAsIHtcbiAgICAgICAgem9uZU5hbWU6IGAke2RvbWFpbn1gLFxuICAgICAgfSk7XG5cbiAgICAgIHBhcmVudFpvbmVNYXAuc2V0KGRvbWFpbiwgcGFyZW50Wm9uZSk7XG5cbiAgICAgIGNvbnN0IHBhcmFtID0gbmV3IHNzbS5TdHJpbmdQYXJhbWV0ZXIodGhpcywgYCR7ZG9tYWluLnJlcGxhY2UoJy4nLCAnJyl9Wm9uZVBhcmFtYCwge1xuICAgICAgICBzdHJpbmdWYWx1ZTogcGFyZW50Wm9uZS5ob3N0ZWRab25lSWQsXG4gICAgICAgIHBhcmFtZXRlck5hbWU6IGAvcm91dGU1My8ke2RvbWFpbn0vem9uZWAsXG4gICAgICAgIGRlc2NyaXB0aW9uOiBgJHtkb21haW59IEhvc3RlZCBab25lIElEYCxcbiAgICAgICAgdGllcjogc3NtLlBhcmFtZXRlclRpZXIuU1RBTkRBUkQsXG4gICAgICAgIHR5cGU6IHNzbS5QYXJhbWV0ZXJUeXBlLlNUUklORyxcbiAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgcGFyZW50Wm9uZU1hcC5mb3JFYWNoKChwYXJlbnRab25lLCBkb21haW4pID0+IHtcbiAgICAgIGNvbmZpZy5jcm9zc0FjY291bnREZWxhZ2F0aW9uSWRzLm1hcCgoYWNjb3VudElkKSA9PiB7XG4gICAgICAgIC8vIElBTSByb2xlIGFsbG93cyBjaGlsZCBhY2NvdW50IHRvIGFzc3VtZSByb2xlIGFuZCBjcmVhdGUgcmVjb3JkIHNldFxuICAgICAgICAvLyBmb3IgdGhlaXIgZG9tYWluIG5hbWVzXG4gICAgICAgIG5ldyBpYW0uUm9sZSh0aGlzLCBgJHtkb21haW4ucmVwbGFjZSgnLicsICcnKS50b1VwcGVyQ2FzZSgpfVJvdXRlNTNSb2xlJHthY2NvdW50SWR9YCwge1xuICAgICAgICAgIHJvbGVOYW1lOiBgJHtkb21haW4ucmVwbGFjZSgnLicsICcnKS50b1VwcGVyQ2FzZSgpfS1Sb3V0ZTUzUm9sZS0ke2FjY291bnRJZH1gLFxuICAgICAgICAgIGFzc3VtZWRCeTogbmV3IGlhbS5BY2NvdW50UHJpbmNpcGFsKGFjY291bnRJZCksXG4gICAgICAgICAgaW5saW5lUG9saWNpZXM6IHtcbiAgICAgICAgICAgIERlbGVnYXRpb246IG5ldyBpYW0uUG9saWN5RG9jdW1lbnQoe1xuICAgICAgICAgICAgICBzdGF0ZW1lbnRzOiBbXG4gICAgICAgICAgICAgICAgbmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xuICAgICAgICAgICAgICAgICAgYWN0aW9uczogWydyb3V0ZTUzOkNoYW5nZVJlc291cmNlUmVjb3JkU2V0cyddLFxuICAgICAgICAgICAgICAgICAgZWZmZWN0OiBFZmZlY3QuQUxMT1csXG4gICAgICAgICAgICAgICAgICByZXNvdXJjZXM6IFtwYXJlbnRab25lLmhvc3RlZFpvbmVBcm5dLFxuICAgICAgICAgICAgICAgIH0pLFxuICAgICAgICAgICAgICAgIG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcbiAgICAgICAgICAgICAgICAgIGFjdGlvbnM6IFsncm91dGU1MzpMaXN0SG9zdGVkWm9uZXNCeU5hbWUnXSxcbiAgICAgICAgICAgICAgICAgIGVmZmVjdDogRWZmZWN0LkFMTE9XLFxuICAgICAgICAgICAgICAgICAgcmVzb3VyY2VzOiBbJyonXSxcbiAgICAgICAgICAgICAgICB9KSxcbiAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIH0pLFxuICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gICAgfSk7XG5cbiAgICAvLyBtb3N0IGRvbWFpbnMgYXJlIG93bmVyc2hpcCBpcyBpbiBkZXYgYWNjb3VudC4gSG93ZXZlciwgZm9yIGRldiBhY2NvdW50IHdlIHdhbnQgdG8gY3JlYXRlICBzb21lIGFjbXMgYXMgd2VsbFxuICAgIHRoaXMuY3JlYXRlQUNNcygpO1xuICAgIHRoaXMuY3JlYXRlQ2RuQUNNcyhwYXJlbnRab25lTWFwKTtcbiAgICB0aGlzLmNyZWF0ZURvbWFpblJlY29yZHMocGFyZW50Wm9uZU1hcCk7XG4gIH1cblxuICBjcmVhdGVEb21haW5SZWNvcmRzKHBhcmVudFpvbmVNYXA6IE1hcDxzdHJpbmcsIFB1YmxpY0hvc3RlZFpvbmU+KSB7XG4gICAgdGhpcy5jb25maWcuZG9tYWluUmVjb3Jkcz8ubWFwKChkKSA9PiB7XG4gICAgICBjb25zdCBob3N0ZWRab25lID0gcGFyZW50Wm9uZU1hcC5nZXQoZC5kb21haW4pO1xuICAgICAgaWYgKGhvc3RlZFpvbmUpIHtcbiAgICAgICAgdGhpcy5jcmVhdGVNWFJlY29yZHMoZCwgaG9zdGVkWm9uZSk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICBjcmVhdGVNWFJlY29yZHMoZHI6IERvbWFpblJlY29yZHMsIGhvc3RlZFpvbmU6IFB1YmxpY0hvc3RlZFpvbmUpIHtcbiAgICBkci5teFJlY29yZHM/Lm1hcCgocmNkKSA9PiB7XG4gICAgICB2YXIgdmFsdWVzID0gcmNkLnZhbHVlcy5tYXAoKHYpID0+ICh7XG4gICAgICAgIGhvc3ROYW1lOiB2LnBvaW50c1RvLFxuICAgICAgICBwcmlvcml0eTogdi5wcmlvcml0eSxcbiAgICAgIH0pKTtcbiAgICAgIGNvbnN0IG14UmVjb3JkID0gbmV3IE14UmVjb3JkKHRoaXMsIGAke2RyLmRvbWFpbi5yZXBsYWNlKCcuJywgJycpfSR7cmNkLnJlY29yZE5hbWV9TVhSZWNvcmRgLCB7XG4gICAgICAgIHZhbHVlczogdmFsdWVzLFxuICAgICAgICB6b25lOiBob3N0ZWRab25lLFxuICAgICAgICBjb21tZW50OiByY2QuY29tbWVudCxcbiAgICAgICAgcmVjb3JkTmFtZTogcmNkLnJlY29yZE5hbWUsXG4gICAgICAgIHR0bDogY2RrLkR1cmF0aW9uLm1pbnV0ZXMocmNkLnR0bCksXG4gICAgICB9KTtcbiAgICB9KTtcbiAgfVxuXG4gIGNyZWF0ZUFDTXMoKSB7XG4gICAgdGhpcy5jb25maWcuYWNtcz8uZm9yRWFjaCgoZG9tYWluKSA9PiB7XG4gICAgICBjb25zdCBsZyA9IGRvbWFpbi5zcGxpdCgnLicpLnNsaWNlKDAsIDIpLmpvaW4oJycpO1xuICAgICAgY29uc3QgYyA9IG5ldyBhY20uQ2VydGlmaWNhdGUodGhpcywgbGcsIHtcbiAgICAgICAgZG9tYWluTmFtZTogZG9tYWluLFxuICAgICAgICBzdWJqZWN0QWx0ZXJuYXRpdmVOYW1lczogW2B3d3cuJHtkb21haW59YF0sXG4gICAgICAgIHZhbGlkYXRpb246IGFjbS5DZXJ0aWZpY2F0ZVZhbGlkYXRpb24uZnJvbURucygpLCAvLyBSZWNvcmRzIG11c3QgYmUgYWRkZWQgbWFudWFsbHlcbiAgICAgIH0pO1xuXG4gICAgICBjb25zdCBwYXJhbSA9IG5ldyBzc20uU3RyaW5nUGFyYW1ldGVyKHRoaXMsIGAke2xnfVBhcmFtYCwge1xuICAgICAgICBzdHJpbmdWYWx1ZTogYy5jZXJ0aWZpY2F0ZUFybixcbiAgICAgICAgcGFyYW1ldGVyTmFtZTogYC9hY20vJHtkb21haW59YCxcbiAgICAgICAgZGVzY3JpcHRpb246IGAke2RvbWFpbn0gQUNNYCxcbiAgICAgICAgdGllcjogc3NtLlBhcmFtZXRlclRpZXIuU1RBTkRBUkQsXG4gICAgICAgIHR5cGU6IHNzbS5QYXJhbWV0ZXJUeXBlLlNUUklORyxcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9XG5cbiAgY3JlYXRlQ2RuQUNNcyhwYXJlbnRab25lTWFwOiBNYXA8c3RyaW5nLCBQdWJsaWNIb3N0ZWRab25lPikge1xuICAgIC8vIEZvciBjbG91ZGZyb250IGRpc3RyaWJ1dGlvbiB3ZSBuZWVkIHRvIGNyZWF0ZSBhIGNlcnRpZmljYXRlXG4gICAgdGhpcy5jb25maWcuY2RuQWNtcz8uZm9yRWFjaCgoZG9tYWluKSA9PiB7XG4gICAgICBjb25zdCBsZyA9IGRvbWFpbi5zcGxpdCgnLicpLnNsaWNlKDEsIGRvbWFpbi5zcGxpdCgnLicpLmxlbmd0aCkuam9pbignLicpO1xuICAgICAgY29uc3QgaG9zdGVkWm9uZSA9IHBhcmVudFpvbmVNYXAuZ2V0KGxnKTtcblxuICAgICAgaWYgKGhvc3RlZFpvbmUpIHtcbiAgICAgICAgY29uc3QgY2VydCA9IG5ldyBhY20uRG5zVmFsaWRhdGVkQ2VydGlmaWNhdGUodGhpcywgJ0Nyb3NzUmVnaW9uQ2VydGlmaWNhdGUnLCB7XG4gICAgICAgICAgZG9tYWluTmFtZTogZG9tYWluLFxuICAgICAgICAgIGhvc3RlZFpvbmU6IGhvc3RlZFpvbmUsXG4gICAgICAgICAgcmVnaW9uOiAndXMtZWFzdC0xJyxcbiAgICAgICAgfSk7XG5cbiAgICAgICAgY29uc3QgcGFyYW0gPSBuZXcgc3NtLlN0cmluZ1BhcmFtZXRlcih0aGlzLCBgJHtsZ31QYXJhbWAsIHtcbiAgICAgICAgICBzdHJpbmdWYWx1ZTogY2VydC5jZXJ0aWZpY2F0ZUFybixcbiAgICAgICAgICBwYXJhbWV0ZXJOYW1lOiBgL2FjbS8ke2RvbWFpbn1gLFxuICAgICAgICAgIGRlc2NyaXB0aW9uOiBgJHtkb21haW59IEFDTSAoQ2VydCBpbiBVUy1FYXN0LTEpYCxcbiAgICAgICAgICB0aWVyOiBzc20uUGFyYW1ldGVyVGllci5TVEFOREFSRCxcbiAgICAgICAgICB0eXBlOiBzc20uUGFyYW1ldGVyVHlwZS5TVFJJTkcsXG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG59XG4iXX0=
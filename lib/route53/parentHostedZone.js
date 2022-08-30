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
                    parameterName: `/acm/${c.domain}` ? `/acm/${c.domain}` : `/acm/${c.zoneDomain}`,
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFyZW50SG9zdGVkWm9uZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInBhcmVudEhvc3RlZFpvbmUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsMkNBQTRDO0FBQzVDLDJDQUE0QztBQUM1QywwREFBMkQ7QUFDM0QsbUNBQW9DO0FBQ3BDLGlEQUE2QztBQUM3Qyx5REFBOEY7QUFHOUYscUNBQStCO0FBRS9CLE1BQWEsa0JBQW1CLFNBQVEsR0FBRyxDQUFDLEtBQUs7SUFHL0MsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxNQUEyQixFQUFFLEtBQXNCO1FBQzNGLEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQ3hCLElBQUksQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFDO1FBRXJCLElBQUksYUFBYSxHQUFHLElBQUksR0FBRyxFQUE0QixDQUFDO1FBRXhELElBQUksQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxDQUFDLE1BQU0sRUFBRSxFQUFFO1lBQ3pDLE1BQU0sVUFBVSxHQUFHLElBQUksOEJBQWdCLENBQUMsSUFBSSxFQUFFLEdBQUcsTUFBTSxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDLFlBQVksRUFBRTtnQkFDcEYsUUFBUSxFQUFFLEdBQUcsTUFBTSxFQUFFO2FBQ3RCLENBQUMsQ0FBQztZQUVILGFBQWEsQ0FBQyxHQUFHLENBQUMsTUFBTSxFQUFFLFVBQVUsQ0FBQyxDQUFDO1lBRXRDLE1BQU0sS0FBSyxHQUFHLElBQUksR0FBRyxDQUFDLGVBQWUsQ0FBQyxJQUFJLEVBQUUsR0FBRyxNQUFNLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUMsV0FBVyxFQUFFO2dCQUNqRixXQUFXLEVBQUUsVUFBVSxDQUFDLFlBQVk7Z0JBQ3BDLGFBQWEsRUFBRSxZQUFZLE1BQU0sT0FBTztnQkFDeEMsV0FBVyxFQUFFLEdBQUcsTUFBTSxpQkFBaUI7Z0JBQ3ZDLElBQUksRUFBRSxHQUFHLENBQUMsYUFBYSxDQUFDLFFBQVE7Z0JBQ2hDLElBQUksRUFBRSxHQUFHLENBQUMsYUFBYSxDQUFDLE1BQU07YUFDL0IsQ0FBQyxDQUFDO1FBQ0wsQ0FBQyxDQUFDLENBQUM7UUFFSCxhQUFhLENBQUMsT0FBTyxDQUFDLENBQUMsVUFBVSxFQUFFLE1BQU0sRUFBRSxFQUFFO1lBQzNDLE1BQU0sQ0FBQyx5QkFBeUIsQ0FBQyxHQUFHLENBQUMsQ0FBQyxTQUFTLEVBQUUsRUFBRTtnQkFDakQscUVBQXFFO2dCQUNyRSx5QkFBeUI7Z0JBQ3pCLElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsR0FBRyxNQUFNLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUMsQ0FBQyxXQUFXLEVBQUUsY0FBYyxTQUFTLEVBQUUsRUFBRTtvQkFDcEYsUUFBUSxFQUFFLEdBQUcsTUFBTSxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDLENBQUMsV0FBVyxFQUFFLGdCQUFnQixTQUFTLEVBQUU7b0JBQzdFLFNBQVMsRUFBRSxJQUFJLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxTQUFTLENBQUM7b0JBQzlDLGNBQWMsRUFBRTt3QkFDZCxVQUFVLEVBQUUsSUFBSSxHQUFHLENBQUMsY0FBYyxDQUFDOzRCQUNqQyxVQUFVLEVBQUU7Z0NBQ1YsSUFBSSxHQUFHLENBQUMsZUFBZSxDQUFDO29DQUN0QixPQUFPLEVBQUUsQ0FBQyxrQ0FBa0MsQ0FBQztvQ0FDN0MsTUFBTSxFQUFFLGdCQUFNLENBQUMsS0FBSztvQ0FDcEIsU0FBUyxFQUFFLENBQUMsVUFBVSxDQUFDLGFBQWEsQ0FBQztpQ0FDdEMsQ0FBQztnQ0FDRixJQUFJLEdBQUcsQ0FBQyxlQUFlLENBQUM7b0NBQ3RCLE9BQU8sRUFBRSxDQUFDLCtCQUErQixDQUFDO29DQUMxQyxNQUFNLEVBQUUsZ0JBQU0sQ0FBQyxLQUFLO29DQUNwQixTQUFTLEVBQUUsQ0FBQyxHQUFHLENBQUM7aUNBQ2pCLENBQUM7NkJBQ0g7eUJBQ0YsQ0FBQztxQkFDSDtpQkFDRixDQUFDLENBQUM7WUFDTCxDQUFDLENBQUMsQ0FBQztRQUNMLENBQUMsQ0FBQyxDQUFDO1FBRUgsOEdBQThHO1FBQzlHLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQztRQUNsQixJQUFJLENBQUMsYUFBYSxDQUFDLGFBQWEsQ0FBQyxDQUFDO1FBQ2xDLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxhQUFhLENBQUMsQ0FBQztJQUMxQyxDQUFDO0lBRUQsbUJBQW1CLENBQUMsYUFBNEM7O1FBQzlELE1BQUEsSUFBSSxDQUFDLE1BQU0sQ0FBQyxhQUFhLDBDQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFO1lBQ25DLE1BQU0sVUFBVSxHQUFHLGFBQWEsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQy9DLElBQUksVUFBVSxFQUFFO2dCQUNkLElBQUksQ0FBQyxlQUFlLENBQUMsQ0FBQyxFQUFFLFVBQVUsQ0FBQyxDQUFDO2FBQ3JDO1FBQ0gsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDO0lBRUQsZUFBZSxDQUFDLEVBQWlCLEVBQUUsVUFBNEI7O1FBQzdELE1BQUEsRUFBRSxDQUFDLFNBQVMsMENBQUUsR0FBRyxDQUFDLENBQUMsR0FBRyxFQUFFLEVBQUU7WUFDeEIsSUFBSSxNQUFNLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7Z0JBQ2xDLFFBQVEsRUFBRSxDQUFDLENBQUMsUUFBUTtnQkFDcEIsUUFBUSxFQUFFLENBQUMsQ0FBQyxRQUFRO2FBQ3JCLENBQUMsQ0FBQyxDQUFDO1lBQ0osTUFBTSxRQUFRLEdBQUcsSUFBSSxzQkFBUSxDQUFDLElBQUksRUFBRSxHQUFHLEVBQUUsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUMsR0FBRyxHQUFHLENBQUMsVUFBVSxVQUFVLEVBQUU7Z0JBQzVGLE1BQU0sRUFBRSxNQUFNO2dCQUNkLElBQUksRUFBRSxVQUFVO2dCQUNoQixPQUFPLEVBQUUsR0FBRyxDQUFDLE9BQU87Z0JBQ3BCLFVBQVUsRUFBRSxHQUFHLENBQUMsVUFBVTtnQkFDMUIsR0FBRyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUM7YUFDbkMsQ0FBQyxDQUFDO1FBQ0wsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDO0lBRUQsVUFBVTs7UUFDUixNQUFBLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSwwQ0FBRSxPQUFPLENBQUMsQ0FBQyxNQUFNLEVBQUUsRUFBRTtZQUNuQyxNQUFNLEVBQUUsR0FBRyxNQUFNLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQ2xELE1BQU0sQ0FBQyxHQUFHLElBQUksR0FBRyxDQUFDLFdBQVcsQ0FBQyxJQUFJLEVBQUUsRUFBRSxFQUFFO2dCQUN0QyxVQUFVLEVBQUUsTUFBTTtnQkFDbEIsdUJBQXVCLEVBQUUsQ0FBQyxPQUFPLE1BQU0sRUFBRSxDQUFDO2dCQUMxQyxVQUFVLEVBQUUsR0FBRyxDQUFDLHFCQUFxQixDQUFDLE9BQU8sRUFBRSxFQUFFLGlDQUFpQzthQUNuRixDQUFDLENBQUM7WUFFSCxNQUFNLEtBQUssR0FBRyxJQUFJLEdBQUcsQ0FBQyxlQUFlLENBQUMsSUFBSSxFQUFFLEdBQUcsRUFBRSxPQUFPLEVBQUU7Z0JBQ3hELFdBQVcsRUFBRSxDQUFDLENBQUMsY0FBYztnQkFDN0IsYUFBYSxFQUFFLFFBQVEsTUFBTSxFQUFFO2dCQUMvQixXQUFXLEVBQUUsR0FBRyxNQUFNLE1BQU07Z0JBQzVCLElBQUksRUFBRSxHQUFHLENBQUMsYUFBYSxDQUFDLFFBQVE7Z0JBQ2hDLElBQUksRUFBRSxHQUFHLENBQUMsYUFBYSxDQUFDLE1BQU07YUFDL0IsQ0FBQyxDQUFDO1FBQ0wsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDO0lBRUQsYUFBYSxDQUFDLGFBQTRDOztRQUN4RCw4REFBOEQ7UUFDOUQsTUFBQSxJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sMENBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFO1lBQy9CLElBQUksRUFBRSxHQUFXLEVBQUUsQ0FBQztZQUNwQiwwRkFBMEY7WUFDMUYsSUFBSSxDQUFDLENBQUMsQ0FBQyxVQUFVLEVBQUU7Z0JBQ2pCLEVBQUUsR0FBRyxDQUFDLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQzthQUN6RTtpQkFBTTtnQkFDTCxFQUFFLEdBQUcsQ0FBQyxDQUFDLFVBQVUsQ0FBQTthQUNsQjtZQUVELHlDQUF5QztZQUN6QyxJQUFJLFVBQVUsQ0FBQTtZQUNkLElBQUksQ0FBQyxDQUFDLGtCQUFrQixJQUFJLENBQUMsQ0FBQyxvQkFBb0IsRUFBRTtnQkFDbEQsVUFBVSxHQUFHLHdCQUFVLENBQUMsd0JBQXdCLENBQUMsSUFBSSxFQUFFLG9CQUFvQixFQUFFO29CQUMzRSxZQUFZLEVBQUUsQ0FBQyxDQUFDLGtCQUFrQjtvQkFDbEMsUUFBUSxFQUFFLENBQUMsQ0FBQyxvQkFBb0I7aUJBQ2pDLENBQUMsQ0FBQTthQUNIO2lCQUFNO2dCQUNMLFVBQVUsR0FBRyxhQUFhLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDO2FBQ3BDO1lBRUQsSUFBSSxVQUFVLEVBQUU7Z0JBQ2QsTUFBTSxJQUFJLEdBQUcsSUFBSSxHQUFHLENBQUMsdUJBQXVCLENBQUMsSUFBSSxFQUFFLHdCQUF3QixFQUFFO29CQUMzRSxVQUFVLEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVc7b0JBQy9DLHVCQUF1QixFQUFFLENBQUMsQ0FBQyxrQkFBa0I7b0JBQzdDLFVBQVUsRUFBRSxVQUFVO29CQUN0QixNQUFNLEVBQUUsV0FBVztpQkFDcEIsQ0FBQyxDQUFDO2dCQUVILE1BQU0sS0FBSyxHQUFHLElBQUksR0FBRyxDQUFDLGVBQWUsQ0FBQyxJQUFJLEVBQUUsR0FBRyxFQUFFLE9BQU8sRUFBRTtvQkFDeEQsV0FBVyxFQUFFLElBQUksQ0FBQyxjQUFjO29CQUNoQyxhQUFhLEVBQUUsUUFBUSxDQUFDLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxVQUFXLEVBQUU7b0JBQ2hGLFdBQVcsRUFBRSxHQUFHLENBQUMsQ0FBQyxNQUFNLDBCQUEwQjtvQkFDbEQsSUFBSSxFQUFFLEdBQUcsQ0FBQyxhQUFhLENBQUMsUUFBUTtvQkFDaEMsSUFBSSxFQUFFLEdBQUcsQ0FBQyxhQUFhLENBQUMsTUFBTTtpQkFDL0IsQ0FBQyxDQUFDO2FBQ0o7aUJBQU07Z0JBQ0wsT0FBTyxDQUFDLEtBQUssQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDLE1BQU0sK0JBQStCLENBQUMsQ0FBQTtnQkFDL0UsSUFBQSxjQUFJLEVBQUMsQ0FBQyxDQUFDLENBQUE7YUFDUjtRQUNILENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztDQUNGO0FBakpELGdEQWlKQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBpYW0gPSByZXF1aXJlKCdhd3MtY2RrLWxpYi9hd3MtaWFtJyk7XG5pbXBvcnQgc3NtID0gcmVxdWlyZSgnYXdzLWNkay1saWIvYXdzLXNzbScpO1xuaW1wb3J0IGFjbSA9IHJlcXVpcmUoJ2F3cy1jZGstbGliL2F3cy1jZXJ0aWZpY2F0ZW1hbmFnZXInKTtcbmltcG9ydCBjZGsgPSByZXF1aXJlKCdhd3MtY2RrLWxpYicpO1xuaW1wb3J0IHsgRWZmZWN0IH0gZnJvbSAnYXdzLWNkay1saWIvYXdzLWlhbSc7XG5pbXBvcnQgeyBDbmFtZVJlY29yZCwgSG9zdGVkWm9uZSwgTXhSZWNvcmQsIFB1YmxpY0hvc3RlZFpvbmUgfSBmcm9tICdhd3MtY2RrLWxpYi9hd3Mtcm91dGU1Myc7XG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tICdjb25zdHJ1Y3RzJztcbmltcG9ydCB7IERvbWFpblJlY29yZHMsIFJvdXRlNTNQYXJlbnRDb25maWcgfSBmcm9tICcuLi8uLi9pbnRlcmZhY2VzL2xpYi9yb3V0ZTUzL2ludGVyZmFjZXMnO1xuaW1wb3J0IHsgZXhpdCB9IGZyb20gJ3Byb2Nlc3MnO1xuXG5leHBvcnQgY2xhc3MgUm91dGU1M1BhcmVudFN0YWNrIGV4dGVuZHMgY2RrLlN0YWNrIHtcbiAgY29uZmlnOiBSb3V0ZTUzUGFyZW50Q29uZmlnO1xuXG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcsIGNvbmZpZzogUm91dGU1M1BhcmVudENvbmZpZywgcHJvcHM/OiBjZGsuU3RhY2tQcm9wcykge1xuICAgIHN1cGVyKHNjb3BlLCBpZCwgcHJvcHMpO1xuICAgIHRoaXMuY29uZmlnID0gY29uZmlnO1xuXG4gICAgdmFyIHBhcmVudFpvbmVNYXAgPSBuZXcgTWFwPHN0cmluZywgUHVibGljSG9zdGVkWm9uZT4oKTtcblxuICAgIHRoaXMuY29uZmlnLmRvbWFpbk5hbWVzLmZvckVhY2goKGRvbWFpbikgPT4ge1xuICAgICAgY29uc3QgcGFyZW50Wm9uZSA9IG5ldyBQdWJsaWNIb3N0ZWRab25lKHRoaXMsIGAke2RvbWFpbi5yZXBsYWNlKCcuJywgJycpfVBhcmVudFpvbmVgLCB7XG4gICAgICAgIHpvbmVOYW1lOiBgJHtkb21haW59YCxcbiAgICAgIH0pO1xuXG4gICAgICBwYXJlbnRab25lTWFwLnNldChkb21haW4sIHBhcmVudFpvbmUpO1xuXG4gICAgICBjb25zdCBwYXJhbSA9IG5ldyBzc20uU3RyaW5nUGFyYW1ldGVyKHRoaXMsIGAke2RvbWFpbi5yZXBsYWNlKCcuJywgJycpfVpvbmVQYXJhbWAsIHtcbiAgICAgICAgc3RyaW5nVmFsdWU6IHBhcmVudFpvbmUuaG9zdGVkWm9uZUlkLFxuICAgICAgICBwYXJhbWV0ZXJOYW1lOiBgL3JvdXRlNTMvJHtkb21haW59L3pvbmVgLFxuICAgICAgICBkZXNjcmlwdGlvbjogYCR7ZG9tYWlufSBIb3N0ZWQgWm9uZSBJRGAsXG4gICAgICAgIHRpZXI6IHNzbS5QYXJhbWV0ZXJUaWVyLlNUQU5EQVJELFxuICAgICAgICB0eXBlOiBzc20uUGFyYW1ldGVyVHlwZS5TVFJJTkcsXG4gICAgICB9KTtcbiAgICB9KTtcblxuICAgIHBhcmVudFpvbmVNYXAuZm9yRWFjaCgocGFyZW50Wm9uZSwgZG9tYWluKSA9PiB7XG4gICAgICBjb25maWcuY3Jvc3NBY2NvdW50RGVsYWdhdGlvbklkcy5tYXAoKGFjY291bnRJZCkgPT4ge1xuICAgICAgICAvLyBJQU0gcm9sZSBhbGxvd3MgY2hpbGQgYWNjb3VudCB0byBhc3N1bWUgcm9sZSBhbmQgY3JlYXRlIHJlY29yZCBzZXRcbiAgICAgICAgLy8gZm9yIHRoZWlyIGRvbWFpbiBuYW1lc1xuICAgICAgICBuZXcgaWFtLlJvbGUodGhpcywgYCR7ZG9tYWluLnJlcGxhY2UoJy4nLCAnJykudG9VcHBlckNhc2UoKX1Sb3V0ZTUzUm9sZSR7YWNjb3VudElkfWAsIHtcbiAgICAgICAgICByb2xlTmFtZTogYCR7ZG9tYWluLnJlcGxhY2UoJy4nLCAnJykudG9VcHBlckNhc2UoKX0tUm91dGU1M1JvbGUtJHthY2NvdW50SWR9YCxcbiAgICAgICAgICBhc3N1bWVkQnk6IG5ldyBpYW0uQWNjb3VudFByaW5jaXBhbChhY2NvdW50SWQpLFxuICAgICAgICAgIGlubGluZVBvbGljaWVzOiB7XG4gICAgICAgICAgICBEZWxlZ2F0aW9uOiBuZXcgaWFtLlBvbGljeURvY3VtZW50KHtcbiAgICAgICAgICAgICAgc3RhdGVtZW50czogW1xuICAgICAgICAgICAgICAgIG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcbiAgICAgICAgICAgICAgICAgIGFjdGlvbnM6IFsncm91dGU1MzpDaGFuZ2VSZXNvdXJjZVJlY29yZFNldHMnXSxcbiAgICAgICAgICAgICAgICAgIGVmZmVjdDogRWZmZWN0LkFMTE9XLFxuICAgICAgICAgICAgICAgICAgcmVzb3VyY2VzOiBbcGFyZW50Wm9uZS5ob3N0ZWRab25lQXJuXSxcbiAgICAgICAgICAgICAgICB9KSxcbiAgICAgICAgICAgICAgICBuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XG4gICAgICAgICAgICAgICAgICBhY3Rpb25zOiBbJ3JvdXRlNTM6TGlzdEhvc3RlZFpvbmVzQnlOYW1lJ10sXG4gICAgICAgICAgICAgICAgICBlZmZlY3Q6IEVmZmVjdC5BTExPVyxcbiAgICAgICAgICAgICAgICAgIHJlc291cmNlczogWycqJ10sXG4gICAgICAgICAgICAgICAgfSksXG4gICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICB9KSxcbiAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgLy8gbW9zdCBkb21haW5zIGFyZSBvd25lcnNoaXAgaXMgaW4gZGV2IGFjY291bnQuIEhvd2V2ZXIsIGZvciBkZXYgYWNjb3VudCB3ZSB3YW50IHRvIGNyZWF0ZSAgc29tZSBhY21zIGFzIHdlbGxcbiAgICB0aGlzLmNyZWF0ZUFDTXMoKTtcbiAgICB0aGlzLmNyZWF0ZUNkbkFDTXMocGFyZW50Wm9uZU1hcCk7XG4gICAgdGhpcy5jcmVhdGVEb21haW5SZWNvcmRzKHBhcmVudFpvbmVNYXApO1xuICB9XG5cbiAgY3JlYXRlRG9tYWluUmVjb3JkcyhwYXJlbnRab25lTWFwOiBNYXA8c3RyaW5nLCBQdWJsaWNIb3N0ZWRab25lPikge1xuICAgIHRoaXMuY29uZmlnLmRvbWFpblJlY29yZHM/Lm1hcCgoZCkgPT4ge1xuICAgICAgY29uc3QgaG9zdGVkWm9uZSA9IHBhcmVudFpvbmVNYXAuZ2V0KGQuZG9tYWluKTtcbiAgICAgIGlmIChob3N0ZWRab25lKSB7XG4gICAgICAgIHRoaXMuY3JlYXRlTVhSZWNvcmRzKGQsIGhvc3RlZFpvbmUpO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgY3JlYXRlTVhSZWNvcmRzKGRyOiBEb21haW5SZWNvcmRzLCBob3N0ZWRab25lOiBQdWJsaWNIb3N0ZWRab25lKSB7XG4gICAgZHIubXhSZWNvcmRzPy5tYXAoKHJjZCkgPT4ge1xuICAgICAgdmFyIHZhbHVlcyA9IHJjZC52YWx1ZXMubWFwKCh2KSA9PiAoe1xuICAgICAgICBob3N0TmFtZTogdi5wb2ludHNUbyxcbiAgICAgICAgcHJpb3JpdHk6IHYucHJpb3JpdHksXG4gICAgICB9KSk7XG4gICAgICBjb25zdCBteFJlY29yZCA9IG5ldyBNeFJlY29yZCh0aGlzLCBgJHtkci5kb21haW4ucmVwbGFjZSgnLicsICcnKX0ke3JjZC5yZWNvcmROYW1lfU1YUmVjb3JkYCwge1xuICAgICAgICB2YWx1ZXM6IHZhbHVlcyxcbiAgICAgICAgem9uZTogaG9zdGVkWm9uZSxcbiAgICAgICAgY29tbWVudDogcmNkLmNvbW1lbnQsXG4gICAgICAgIHJlY29yZE5hbWU6IHJjZC5yZWNvcmROYW1lLFxuICAgICAgICB0dGw6IGNkay5EdXJhdGlvbi5taW51dGVzKHJjZC50dGwpLFxuICAgICAgfSk7XG4gICAgfSk7XG4gIH1cblxuICBjcmVhdGVBQ01zKCkge1xuICAgIHRoaXMuY29uZmlnLmFjbXM/LmZvckVhY2goKGRvbWFpbikgPT4ge1xuICAgICAgY29uc3QgbGcgPSBkb21haW4uc3BsaXQoJy4nKS5zbGljZSgwLCAyKS5qb2luKCcnKTtcbiAgICAgIGNvbnN0IGMgPSBuZXcgYWNtLkNlcnRpZmljYXRlKHRoaXMsIGxnLCB7XG4gICAgICAgIGRvbWFpbk5hbWU6IGRvbWFpbixcbiAgICAgICAgc3ViamVjdEFsdGVybmF0aXZlTmFtZXM6IFtgd3d3LiR7ZG9tYWlufWBdLFxuICAgICAgICB2YWxpZGF0aW9uOiBhY20uQ2VydGlmaWNhdGVWYWxpZGF0aW9uLmZyb21EbnMoKSwgLy8gUmVjb3JkcyBtdXN0IGJlIGFkZGVkIG1hbnVhbGx5XG4gICAgICB9KTtcblxuICAgICAgY29uc3QgcGFyYW0gPSBuZXcgc3NtLlN0cmluZ1BhcmFtZXRlcih0aGlzLCBgJHtsZ31QYXJhbWAsIHtcbiAgICAgICAgc3RyaW5nVmFsdWU6IGMuY2VydGlmaWNhdGVBcm4sXG4gICAgICAgIHBhcmFtZXRlck5hbWU6IGAvYWNtLyR7ZG9tYWlufWAsXG4gICAgICAgIGRlc2NyaXB0aW9uOiBgJHtkb21haW59IEFDTWAsXG4gICAgICAgIHRpZXI6IHNzbS5QYXJhbWV0ZXJUaWVyLlNUQU5EQVJELFxuICAgICAgICB0eXBlOiBzc20uUGFyYW1ldGVyVHlwZS5TVFJJTkcsXG4gICAgICB9KTtcbiAgICB9KTtcbiAgfVxuXG4gIGNyZWF0ZUNkbkFDTXMocGFyZW50Wm9uZU1hcDogTWFwPHN0cmluZywgUHVibGljSG9zdGVkWm9uZT4pIHtcbiAgICAvLyBGb3IgY2xvdWRmcm9udCBkaXN0cmlidXRpb24gd2UgbmVlZCB0byBjcmVhdGUgYSBjZXJ0aWZpY2F0ZVxuICAgIHRoaXMuY29uZmlnLmNkbkFjbXM/LmZvckVhY2goYyA9PiB7XG4gICAgICB2YXIgbGc6IHN0cmluZyA9ICcnO1xuICAgICAgLy8gU29tZXRpbWUgd2UganVzdCBoYXZlIHNpbmdsZSB6b25lIC0gVG9wIGxldmVsIGRvbWFpbiBjYW4gc2ltcGx5IGJlIHBhc3NlZCBhcyBab25lZG9tYWluXG4gICAgICBpZiAoIWMuem9uZURvbWFpbikge1xuICAgICAgICBsZyA9IGMuZG9tYWluLnNwbGl0KCcuJykuc2xpY2UoMSwgYy5kb21haW4uc3BsaXQoJy4nKS5sZW5ndGgpLmpvaW4oJy4nKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGxnID0gYy56b25lRG9tYWluXG4gICAgICB9XG5cbiAgICAgIC8vIEluY2FzZSB3ZSBoYXZlIGFscmVhZHkgZGVmaW5lZCBvdXRzaWRlXG4gICAgICB2YXIgaG9zdGVkWm9uZVxuICAgICAgaWYgKGMucGFyZW50SG9zdGVkWm9uZUlkICYmIGMucGFyZW50SG9zdGVkWm9uZU5hbWUpIHtcbiAgICAgICAgaG9zdGVkWm9uZSA9IEhvc3RlZFpvbmUuZnJvbUhvc3RlZFpvbmVBdHRyaWJ1dGVzKHRoaXMsICdQYXJlbnRIb3N0ZWRab25lSWQnLCB7XG4gICAgICAgICAgaG9zdGVkWm9uZUlkOiBjLnBhcmVudEhvc3RlZFpvbmVJZCxcbiAgICAgICAgICB6b25lTmFtZTogYy5wYXJlbnRIb3N0ZWRab25lTmFtZVxuICAgICAgICB9KVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaG9zdGVkWm9uZSA9IHBhcmVudFpvbmVNYXAuZ2V0KGxnKTtcbiAgICAgIH1cblxuICAgICAgaWYgKGhvc3RlZFpvbmUpIHtcbiAgICAgICAgY29uc3QgY2VydCA9IG5ldyBhY20uRG5zVmFsaWRhdGVkQ2VydGlmaWNhdGUodGhpcywgJ0Nyb3NzUmVnaW9uQ2VydGlmaWNhdGUnLCB7XG4gICAgICAgICAgZG9tYWluTmFtZTogYy5kb21haW4gPyBjLmRvbWFpbiA6IGMuem9uZURvbWFpbiEsXG4gICAgICAgICAgc3ViamVjdEFsdGVybmF0aXZlTmFtZXM6IGMuYWx0ZXJuYXRpdmVEb21haW5zLFxuICAgICAgICAgIGhvc3RlZFpvbmU6IGhvc3RlZFpvbmUsXG4gICAgICAgICAgcmVnaW9uOiAndXMtZWFzdC0xJyxcbiAgICAgICAgfSk7XG5cbiAgICAgICAgY29uc3QgcGFyYW0gPSBuZXcgc3NtLlN0cmluZ1BhcmFtZXRlcih0aGlzLCBgJHtsZ31QYXJhbWAsIHtcbiAgICAgICAgICBzdHJpbmdWYWx1ZTogY2VydC5jZXJ0aWZpY2F0ZUFybixcbiAgICAgICAgICBwYXJhbWV0ZXJOYW1lOiBgL2FjbS8ke2MuZG9tYWlufWAgPyBgL2FjbS8ke2MuZG9tYWlufWAgOiBgL2FjbS8ke2Muem9uZURvbWFpbiF9YCxcbiAgICAgICAgICBkZXNjcmlwdGlvbjogYCR7Yy5kb21haW59IEFDTSAoQ2VydCBpbiBVUy1FYXN0LTEpYCxcbiAgICAgICAgICB0aWVyOiBzc20uUGFyYW1ldGVyVGllci5TVEFOREFSRCxcbiAgICAgICAgICB0eXBlOiBzc20uUGFyYW1ldGVyVHlwZS5TVFJJTkcsXG4gICAgICAgIH0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29uc29sZS5lcnJvcihgW1JvdXRlNTNdW1BhcmVudFpvbmVdICR7Yy5kb21haW59IG5vdCBmb3VuZCBpbiBwYXJlbnQgem9uZSBtYXBgKVxuICAgICAgICBleGl0KDEpXG4gICAgICB9XG4gICAgfSk7XG4gIH1cbn1cbiJdfQ==
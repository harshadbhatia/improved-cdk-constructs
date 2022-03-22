"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Route53SubZoneStack = void 0;
const iam = require("aws-cdk-lib/aws-iam");
const acm = require("aws-cdk-lib/aws-certificatemanager");
const cdk = require("aws-cdk-lib");
const ssm = require("aws-cdk-lib/aws-ssm");
const aws_cdk_lib_1 = require("aws-cdk-lib");
const aws_route53_1 = require("aws-cdk-lib/aws-route53");
const process_1 = require("process");
/**
 * Warning - CDK doesnt support multiple subzones in a single stack.
 */
class Route53SubZoneStack extends cdk.Stack {
    constructor(scope, id, config, props) {
        super(scope, id, props);
        this.config = config;
        this.parentZoneMap = new Map();
        this.config.subZone.filter(a => a.enabled).forEach(zone => {
            this.createSubHostedZone(zone);
        });
        this.createACMs();
        this.createCdnACMs();
    }
    createSubHostedZone(zone) {
        zone.config.forEach(cfg => {
            // domain = zone name + domain
            const k = `${zone.name.replace('.', '').toUpperCase()}${cfg.domainName.replace('.', '').toUpperCase()}`;
            const fqdn = `${zone.name}.${cfg.domainName}`;
            const subZone = new aws_route53_1.PublicHostedZone(this, `${k}SubZone`, {
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
            const delegationRoleArn = aws_cdk_lib_1.Stack.of(this).formatArn({
                region: '',
                service: 'iam',
                account: cfg.parentAccountId,
                resource: 'role',
                resourceName: cfg.parentRoleName
            });
            const delegationRole = iam.Role.fromRoleArn(this, `${k}DelegationRole`, delegationRoleArn);
            // create the record
            new aws_route53_1.CrossAccountZoneDelegationRecord(this, `${cfg.domainName.replace('.', '').toUpperCase()}Delegate`, {
                delegatedZone: subZone,
                parentHostedZoneId: cfg.parentHostedZoneId,
                delegationRole,
            });
        });
    }
    createACMs() {
        var _a;
        (_a = this.config.acms) === null || _a === void 0 ? void 0 : _a.forEach(domain => {
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
    createCdnACMs() {
        var _a;
        // For cloudfront distribution we need to create a certificate
        (_a = this.config.cdnAcms) === null || _a === void 0 ? void 0 : _a.forEach(domain => {
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
            }
            else {
                console.error(`[Route53][subZone] ${domain} not found in parent zone map`);
                process_1.exit(1);
            }
        });
    }
}
exports.Route53SubZoneStack = Route53SubZoneStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3ViWm9uZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInN1YlpvbmUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsMkNBQTRDO0FBQzVDLDBEQUEyRDtBQUMzRCxtQ0FBb0M7QUFDcEMsMkNBQTRDO0FBQzVDLDZDQUFvQztBQUNwQyx5REFBNkY7QUFHN0YscUNBQStCO0FBRS9COztHQUVHO0FBRUgsTUFBYSxtQkFBb0IsU0FBUSxHQUFHLENBQUMsS0FBSztJQUtoRCxZQUFZLEtBQWdCLEVBQUUsRUFBVSxFQUFFLE1BQTRCLEVBQUUsS0FBc0I7UUFDNUYsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDeEIsSUFBSSxDQUFDLE1BQU0sR0FBRyxNQUFNLENBQUM7UUFFckIsSUFBSSxDQUFDLGFBQWEsR0FBRyxJQUFJLEdBQUcsRUFBNEIsQ0FBQztRQUV6RCxJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFFO1lBQ3hELElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUVoQyxDQUFDLENBQUMsQ0FBQTtRQUVGLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQTtRQUNqQixJQUFJLENBQUMsYUFBYSxFQUFFLENBQUE7SUFFdEIsQ0FBQztJQUVELG1CQUFtQixDQUFDLElBQW1CO1FBQ3JDLElBQUksQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxFQUFFO1lBQ3hCLDhCQUE4QjtZQUM5QixNQUFNLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUMsQ0FBQyxXQUFXLEVBQUUsR0FBRyxHQUFHLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsRUFB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OztRQUdYLDhEQUE4RDtRQUM5RCxNQUFBLElBQUksQ0FBQyxNQUFNLENBQUMsT0FBTywwQ0FBRSxPQUFPLENBQUMsTUFBTSxDQUFDLEVBQUU7WUFDcEMsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDbEQsSUFBSSxVQUFVLEVBQUU7Z0JBQ2QsTUFBTSxJQUFJLEdBQUcsSUFBSSxHQUFHLENBQUMsdUJBQXVCLENBQUMsSUFBSSxFQUFFLHdCQUF3QixFQUFFO29CQUMzRSxVQUFVLEVBQUUsTUFBTTtvQkFDbEIsVUFBVSxFQUFFLFVBQVU7b0JBQ3RCLE1BQU0sRUFBRSxXQUFXO2lCQUNwQixDQUFDLENBQUM7Z0JBRUgsTUFBTSxLQUFLLEdBQUcsSUFBSSxHQUFHLENBQUMsZUFBZSxDQUFDLElBQUksRUFBRSxHQUFHLE1BQU0sT0FBTyxFQUFFO29CQUM1RCxXQUFXLEVBQUUsSUFBSSxDQUFDLGNBQWM7b0JBQ2hDLGFBQWEsRUFBRSxRQUFRLE1BQU0sRUFBRTtvQkFDL0IsV0FBVyxFQUFFLEdBQUcsTUFBTSwwQkFBMEI7b0JBQ2hELElBQUksRUFBRSxHQUFHLENBQUMsYUFBYSxDQUFDLFFBQVE7b0JBQ2hDLElBQUksRUFBRSxHQUFHLENBQUMsYUFBYSxDQUFDLE1BQU07aUJBQy9CLENBQUMsQ0FBQzthQUNKO2lCQUFNO2dCQUNMLE9BQU8sQ0FBQyxLQUFLLENBQUMsc0JBQXNCLE1BQU0sK0JBQStCLENBQUMsQ0FBQTtnQkFDMUUsY0FBSSxDQUFDLENBQUMsQ0FBQyxDQUFBO2FBQ1I7UUFHSCxDQUFDLEVBQUM7SUFFSixDQUFDO0NBQ0Y7QUEzR0Qsa0RBMkdDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IGlhbSA9IHJlcXVpcmUoJ2F3cy1jZGstbGliL2F3cy1pYW0nKTtcbmltcG9ydCBhY20gPSByZXF1aXJlKCdhd3MtY2RrLWxpYi9hd3MtY2VydGlmaWNhdGVtYW5hZ2VyJyk7XG5pbXBvcnQgY2RrID0gcmVxdWlyZSgnYXdzLWNkay1saWInKTtcbmltcG9ydCBzc20gPSByZXF1aXJlKCdhd3MtY2RrLWxpYi9hd3Mtc3NtJyk7XG5pbXBvcnQgeyBTdGFjayB9IGZyb20gJ2F3cy1jZGstbGliJztcbmltcG9ydCB7IENyb3NzQWNjb3VudFpvbmVEZWxlZ2F0aW9uUmVjb3JkLCBQdWJsaWNIb3N0ZWRab25lIH0gZnJvbSAnYXdzLWNkay1saWIvYXdzLXJvdXRlNTMnO1xuaW1wb3J0IHsgQ29uc3RydWN0IH0gZnJvbSAnY29uc3RydWN0cyc7XG5pbXBvcnQgeyBSb3V0ZTUzU3ViWm9uZUNvbmZpZywgU3ViWm9uZUNvbmZpZyB9IGZyb20gJy4uLy4uL2ludGVyZmFjZXMvbGliL3JvdXRlNTMvaW50ZXJmYWNlcyc7XG5pbXBvcnQgeyBleGl0IH0gZnJvbSAncHJvY2Vzcyc7XG5cbi8qKlxuICogV2FybmluZyAtIENESyBkb2VzbnQgc3VwcG9ydCBtdWx0aXBsZSBzdWJ6b25lcyBpbiBhIHNpbmdsZSBzdGFjay5cbiAqL1xuXG5leHBvcnQgY2xhc3MgUm91dGU1M1N1YlpvbmVTdGFjayBleHRlbmRzIGNkay5TdGFjayB7XG5cbiAgY29uZmlnOiBSb3V0ZTUzU3ViWm9uZUNvbmZpZztcbiAgcGFyZW50Wm9uZU1hcDogTWFwPHN0cmluZywgUHVibGljSG9zdGVkWm9uZT47XG5cbiAgY29uc3RydWN0b3Ioc2NvcGU6IENvbnN0cnVjdCwgaWQ6IHN0cmluZywgY29uZmlnOiBSb3V0ZTUzU3ViWm9uZUNvbmZpZywgcHJvcHM/OiBjZGsuU3RhY2tQcm9wcykge1xuICAgIHN1cGVyKHNjb3BlLCBpZCwgcHJvcHMpO1xuICAgIHRoaXMuY29uZmlnID0gY29uZmlnO1xuXG4gICAgdGhpcy5wYXJlbnRab25lTWFwID0gbmV3IE1hcDxzdHJpbmcsIFB1YmxpY0hvc3RlZFpvbmU+KCk7XG5cbiAgICB0aGlzLmNvbmZpZy5zdWJab25lLmZpbHRlcihhID0+IGEuZW5hYmxlZCkuZm9yRWFjaCh6b25lID0+IHtcbiAgICAgIHRoaXMuY3JlYXRlU3ViSG9zdGVkWm9uZSh6b25lKVxuXG4gICAgfSlcblxuICAgIHRoaXMuY3JlYXRlQUNNcygpXG4gICAgdGhpcy5jcmVhdGVDZG5BQ01zKClcblxuICB9XG5cbiAgY3JlYXRlU3ViSG9zdGVkWm9uZSh6b25lOiBTdWJab25lQ29uZmlnKSB7XG4gICAgem9uZS5jb25maWcuZm9yRWFjaChjZmcgPT4ge1xuICAgICAgLy8gZG9tYWluID0gem9uZSBuYW1lICsgZG9tYWluXG4gICAgICBjb25zdCBrID0gYCR7em9uZS5uYW1lLnJlcGxhY2UoJy4nLCAnJykudG9VcHBlckNhc2UoKX0ke2NmZy5kb21haW5OYW1lLnJlcGxhY2UoJy4nLCAnJykudG9VcHBlckNhc2UoKX1gXG5cbiAgICAgIGNvbnN0IGZxZG4gPSBgJHt6b25lLm5hbWV9LiR7Y2ZnLmRvbWFpbk5hbWV9YFxuICAgICAgY29uc3Qgc3ViWm9uZSA9IG5ldyBQdWJsaWNIb3N0ZWRab25lKHRoaXMsIGAke2t9U3ViWm9uZWAsIHtcbiAgICAgICAgem9uZU5hbWU6IGAke2ZxZG59YCxcbiAgICAgIH0pO1xuXG4gICAgICBjb25zdCBwYXJhbSA9IG5ldyBzc20uU3RyaW5nUGFyYW1ldGVyKHRoaXMsIGAke2t9Wm9uZVBhcmFtYCwge1xuICAgICAgICBzdHJpbmdWYWx1ZTogc3ViWm9uZS5ob3N0ZWRab25lSWQsXG4gICAgICAgIHBhcmFtZXRlck5hbWU6IGAvcm91dGU1My8ke2ZxZG59L3pvbmVgLFxuICAgICAgICBkZXNjcmlwdGlvbjogYCR7ZnFkbn0gSG9zdGVkIFpvbmUgSURgLFxuICAgICAgICB0aWVyOiBzc20uUGFyYW1ldGVyVGllci5TVEFOREFSRCxcbiAgICAgICAgdHlwZTogc3NtLlBhcmFtZXRlclR5cGUuU1RSSU5HLFxuICAgICAgfSk7XG4gICAgICB0aGlzLnBhcmVudFpvbmVNYXAuc2V0KGZxZG4sIHN1YlpvbmUpO1xuXG4gICAgICBjb25zdCBkZWxlZ2F0aW9uUm9sZUFybiA9IFN0YWNrLm9mKHRoaXMpLmZvcm1hdEFybih7XG4gICAgICAgIHJlZ2lvbjogJycsIC8vIElBTSBpcyBnbG9iYWwgaW4gZWFjaCBwYXJ0aXRpb25cbiAgICAgICAgc2VydmljZTogJ2lhbScsXG4gICAgICAgIGFjY291bnQ6IGNmZy5wYXJlbnRBY2NvdW50SWQsXG4gICAgICAgIHJlc291cmNlOiAncm9sZScsXG4gICAgICAgIHJlc291cmNlTmFtZTogY2ZnLnBhcmVudFJvbGVOYW1lXG4gICAgICB9KTtcblxuICAgICAgY29uc3QgZGVsZWdhdGlvblJvbGUgPSBpYW0uUm9sZS5mcm9tUm9sZUFybih0aGlzLCBgJHtrfURlbGVnYXRpb25Sb2xlYCwgZGVsZWdhdGlvblJvbGVBcm4pO1xuXG4gICAgICAvLyBjcmVhdGUgdGhlIHJlY29yZFxuICAgICAgbmV3IENyb3NzQWNjb3VudFpvbmVEZWxlZ2F0aW9uUmVjb3JkKHRoaXMsIGAke2NmZy5kb21haW5OYW1lLnJlcGxhY2UoJy4nLCAnJykudG9VcHBlckNhc2UoKX1EZWxlZ2F0ZWAsIHtcbiAgICAgICAgZGVsZWdhdGVkWm9uZTogc3ViWm9uZSxcbiAgICAgICAgcGFyZW50SG9zdGVkWm9uZUlkOiBjZmcucGFyZW50SG9zdGVkWm9uZUlkLCAvLyBvciB5b3UgY2FuIHVzZSBwYXJlbnRIb3N0ZWRab25lSWRcbiAgICAgICAgZGVsZWdhdGlvblJvbGUsXG4gICAgICB9KTtcbiAgICB9KVxuICB9XG5cbiAgY3JlYXRlQUNNcygpIHtcbiAgICB0aGlzLmNvbmZpZy5hY21zPy5mb3JFYWNoKGRvbWFpbiA9PiB7XG4gICAgICBjb25zdCBsZyA9IGRvbWFpbi5zcGxpdCgnLicpLnNsaWNlKDAsIDIpLmpvaW4oJycpO1xuICAgICAgY29uc3QgYyA9IG5ldyBhY20uQ2VydGlmaWNhdGUodGhpcywgbGcsIHtcbiAgICAgICAgZG9tYWluTmFtZTogZG9tYWluLFxuICAgICAgICBzdWJqZWN0QWx0ZXJuYXRpdmVOYW1lczogW2B3d3cuJHtkb21haW59YF0sXG4gICAgICAgIHZhbGlkYXRpb246IGFjbS5DZXJ0aWZpY2F0ZVZhbGlkYXRpb24uZnJvbURucygpLCAvLyBSZWNvcmRzIG11c3QgYmUgYWRkZWQgbWFudWFsbHlcbiAgICAgIH0pO1xuXG4gICAgICBjb25zdCBwYXJhbSA9IG5ldyBzc20uU3RyaW5nUGFyYW1ldGVyKHRoaXMsIGAke2xnfVBhcmFtYCwge1xuICAgICAgICBzdHJpbmdWYWx1ZTogYy5jZXJ0aWZpY2F0ZUFybixcbiAgICAgICAgcGFyYW1ldGVyTmFtZTogYC9hY20vJHtkb21haW59YCxcbiAgICAgICAgZGVzY3JpcHRpb246IGAke2RvbWFpbn0gQUNNYCxcbiAgICAgICAgdGllcjogc3NtLlBhcmFtZXRlclRpZXIuU1RBTkRBUkQsXG4gICAgICAgIHR5cGU6IHNzbS5QYXJhbWV0ZXJUeXBlLlNUUklORyxcbiAgICAgIH0pO1xuICAgIH0pXG4gIH1cblxuICBjcmVhdGVDZG5BQ01zKCkge1xuXG5cbiAgICAvLyBGb3IgY2xvdWRmcm9udCBkaXN0cmlidXRpb24gd2UgbmVlZCB0byBjcmVhdGUgYSBjZXJ0aWZpY2F0ZVxuICAgIHRoaXMuY29uZmlnLmNkbkFjbXM/LmZvckVhY2goZG9tYWluID0+IHtcbiAgICAgIGNvbnN0IGhvc3RlZFpvbmUgPSB0aGlzLnBhcmVudFpvbmVNYXAuZ2V0KGRvbWFpbik7XG4gICAgICBpZiAoaG9zdGVkWm9uZSkge1xuICAgICAgICBjb25zdCBjZXJ0ID0gbmV3IGFjbS5EbnNWYWxpZGF0ZWRDZXJ0aWZpY2F0ZSh0aGlzLCAnQ3Jvc3NSZWdpb25DZXJ0aWZpY2F0ZScsIHtcbiAgICAgICAgICBkb21haW5OYW1lOiBkb21haW4sXG4gICAgICAgICAgaG9zdGVkWm9uZTogaG9zdGVkWm9uZSxcbiAgICAgICAgICByZWdpb246ICd1cy1lYXN0LTEnLFxuICAgICAgICB9KTtcblxuICAgICAgICBjb25zdCBwYXJhbSA9IG5ldyBzc20uU3RyaW5nUGFyYW1ldGVyKHRoaXMsIGAke2RvbWFpbn1QYXJhbWAsIHtcbiAgICAgICAgICBzdHJpbmdWYWx1ZTogY2VydC5jZXJ0aWZpY2F0ZUFybixcbiAgICAgICAgICBwYXJhbWV0ZXJOYW1lOiBgL2FjbS8ke2RvbWFpbn1gLFxuICAgICAgICAgIGRlc2NyaXB0aW9uOiBgJHtkb21haW59IEFDTSAoQ2VydCBpbiBVUy1FYXN0LTEpYCxcbiAgICAgICAgICB0aWVyOiBzc20uUGFyYW1ldGVyVGllci5TVEFOREFSRCxcbiAgICAgICAgICB0eXBlOiBzc20uUGFyYW1ldGVyVHlwZS5TVFJJTkcsXG4gICAgICAgIH0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29uc29sZS5lcnJvcihgW1JvdXRlNTNdW3N1YlpvbmVdICR7ZG9tYWlufSBub3QgZm91bmQgaW4gcGFyZW50IHpvbmUgbWFwYClcbiAgICAgICAgZXhpdCgxKVxuICAgICAgfVxuXG5cbiAgICB9KVxuXG4gIH1cbn1cbiJdfQ==
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
    createCdnACMs() {
        var _a;
        // For cloudfront distribution we need to create a certificate
        (_a = this.config.cdnAcms) === null || _a === void 0 ? void 0 : _a.forEach(c => {
            var hostedZone;
            if (c.parentHostedZoneId && c.parentHostedZoneName) {
                hostedZone = aws_route53_1.HostedZone.fromHostedZoneAttributes(this, 'ParentHostedZoneId', {
                    hostedZoneId: c.parentHostedZoneId,
                    zoneName: c.parentHostedZoneName
                });
            }
            else {
                hostedZone = this.parentZoneMap.get(c.domain);
            }
            if (hostedZone) {
                const cert = new acm.DnsValidatedCertificate(this, 'CrossRegionCertificate', {
                    domainName: c.domain,
                    subjectAlternativeNames: c.alternativeDomains,
                    hostedZone: hostedZone,
                    region: 'us-east-1',
                });
                const param = new ssm.StringParameter(this, `${c.domain}Param`, {
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
exports.Route53SubZoneStack = Route53SubZoneStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3ViWm9uZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInN1YlpvbmUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsMkNBQTRDO0FBQzVDLDBEQUEyRDtBQUMzRCxtQ0FBb0M7QUFDcEMsMkNBQTRDO0FBQzVDLDZDQUFvQztBQUNwQyx5REFBeUc7QUFHekcscUNBQStCO0FBRS9COztHQUVHO0FBRUgsTUFBYSxtQkFBb0IsU0FBUSxHQUFHLENBQUMsS0FBSztJQUtoRCxZQUFZLEtBQWdCLEVBQUUsRUFBVSxFQUFFLE1BQTRCLEVBQUUsS0FBc0I7UUFDNUYsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDeEIsSUFBSSxDQUFDLE1BQU0sR0FBRyxNQUFNLENBQUM7UUFFckIsSUFBSSxDQUFDLGFBQWEsR0FBRyxJQUFJLEdBQUcsRUFBNEIsQ0FBQztRQUV6RCxJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFFO1lBQ3hELElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUVoQyxDQUFDLENBQUMsQ0FBQTtRQUVGLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQTtRQUNqQixJQUFJLENBQUMsYUFBYSxFQUFFLENBQUE7SUFFdEIsQ0FBQztJQUVELG1CQUFtQixDQUFDLElBQW1CO1FBQ3JDLElBQUksQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxFQUFFO1lBQ3hCLDhCQUE4QjtZQUM5QixNQUFNLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUMsQ0FBQyxXQUFXLEVBQUUsR0FBRyxHQUFHLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsRUFB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YUFBYSxDQUFDLE1BQU07aUJBQy9CLENBQUMsQ0FBQzthQUNKO2lCQUFNO2dCQUNMLE9BQU8sQ0FBQyxLQUFLLENBQUMsc0JBQXNCLENBQUMsQ0FBQyxNQUFNLCtCQUErQixDQUFDLENBQUE7Z0JBQzVFLElBQUEsY0FBSSxFQUFDLENBQUMsQ0FBQyxDQUFBO2FBQ1I7UUFFSCxDQUFDLENBQUMsQ0FBQTtJQUVKLENBQUM7Q0FDRjtBQWxIRCxrREFrSEMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgaWFtID0gcmVxdWlyZSgnYXdzLWNkay1saWIvYXdzLWlhbScpO1xuaW1wb3J0IGFjbSA9IHJlcXVpcmUoJ2F3cy1jZGstbGliL2F3cy1jZXJ0aWZpY2F0ZW1hbmFnZXInKTtcbmltcG9ydCBjZGsgPSByZXF1aXJlKCdhd3MtY2RrLWxpYicpO1xuaW1wb3J0IHNzbSA9IHJlcXVpcmUoJ2F3cy1jZGstbGliL2F3cy1zc20nKTtcbmltcG9ydCB7IFN0YWNrIH0gZnJvbSAnYXdzLWNkay1saWInO1xuaW1wb3J0IHsgQ3Jvc3NBY2NvdW50Wm9uZURlbGVnYXRpb25SZWNvcmQsIFB1YmxpY0hvc3RlZFpvbmUsIEhvc3RlZFpvbmUgfSBmcm9tICdhd3MtY2RrLWxpYi9hd3Mtcm91dGU1Myc7XG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tICdjb25zdHJ1Y3RzJztcbmltcG9ydCB7IFJvdXRlNTNTdWJab25lQ29uZmlnLCBTdWJab25lQ29uZmlnIH0gZnJvbSAnLi4vLi4vaW50ZXJmYWNlcy9saWIvcm91dGU1My9pbnRlcmZhY2VzJztcbmltcG9ydCB7IGV4aXQgfSBmcm9tICdwcm9jZXNzJztcblxuLyoqXG4gKiBXYXJuaW5nIC0gQ0RLIGRvZXNudCBzdXBwb3J0IG11bHRpcGxlIHN1YnpvbmVzIGluIGEgc2luZ2xlIHN0YWNrLlxuICovXG5cbmV4cG9ydCBjbGFzcyBSb3V0ZTUzU3ViWm9uZVN0YWNrIGV4dGVuZHMgY2RrLlN0YWNrIHtcblxuICBjb25maWc6IFJvdXRlNTNTdWJab25lQ29uZmlnO1xuICBwYXJlbnRab25lTWFwOiBNYXA8c3RyaW5nLCBQdWJsaWNIb3N0ZWRab25lPjtcblxuICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nLCBjb25maWc6IFJvdXRlNTNTdWJab25lQ29uZmlnLCBwcm9wcz86IGNkay5TdGFja1Byb3BzKSB7XG4gICAgc3VwZXIoc2NvcGUsIGlkLCBwcm9wcyk7XG4gICAgdGhpcy5jb25maWcgPSBjb25maWc7XG5cbiAgICB0aGlzLnBhcmVudFpvbmVNYXAgPSBuZXcgTWFwPHN0cmluZywgUHVibGljSG9zdGVkWm9uZT4oKTtcblxuICAgIHRoaXMuY29uZmlnLnN1YlpvbmUuZmlsdGVyKGEgPT4gYS5lbmFibGVkKS5mb3JFYWNoKHpvbmUgPT4ge1xuICAgICAgdGhpcy5jcmVhdGVTdWJIb3N0ZWRab25lKHpvbmUpXG5cbiAgICB9KVxuXG4gICAgdGhpcy5jcmVhdGVBQ01zKClcbiAgICB0aGlzLmNyZWF0ZUNkbkFDTXMoKVxuXG4gIH1cblxuICBjcmVhdGVTdWJIb3N0ZWRab25lKHpvbmU6IFN1YlpvbmVDb25maWcpIHtcbiAgICB6b25lLmNvbmZpZy5mb3JFYWNoKGNmZyA9PiB7XG4gICAgICAvLyBkb21haW4gPSB6b25lIG5hbWUgKyBkb21haW5cbiAgICAgIGNvbnN0IGsgPSBgJHt6b25lLm5hbWUucmVwbGFjZSgnLicsICcnKS50b1VwcGVyQ2FzZSgpfSR7Y2ZnLmRvbWFpbk5hbWUucmVwbGFjZSgnLicsICcnKS50b1VwcGVyQ2FzZSgpfWBcblxuICAgICAgY29uc3QgZnFkbiA9IGAke3pvbmUubmFtZX0uJHtjZmcuZG9tYWluTmFtZX1gXG4gICAgICBjb25zdCBzdWJab25lID0gbmV3IFB1YmxpY0hvc3RlZFpvbmUodGhpcywgYCR7a31TdWJab25lYCwge1xuICAgICAgICB6b25lTmFtZTogYCR7ZnFkbn1gLFxuICAgICAgfSk7XG5cbiAgICAgIGNvbnN0IHBhcmFtID0gbmV3IHNzbS5TdHJpbmdQYXJhbWV0ZXIodGhpcywgYCR7a31ab25lUGFyYW1gLCB7XG4gICAgICAgIHN0cmluZ1ZhbHVlOiBzdWJab25lLmhvc3RlZFpvbmVJZCxcbiAgICAgICAgcGFyYW1ldGVyTmFtZTogYC9yb3V0ZTUzLyR7ZnFkbn0vem9uZWAsXG4gICAgICAgIGRlc2NyaXB0aW9uOiBgJHtmcWRufSBIb3N0ZWQgWm9uZSBJRGAsXG4gICAgICAgIHRpZXI6IHNzbS5QYXJhbWV0ZXJUaWVyLlNUQU5EQVJELFxuICAgICAgICB0eXBlOiBzc20uUGFyYW1ldGVyVHlwZS5TVFJJTkcsXG4gICAgICB9KTtcbiAgICAgIHRoaXMucGFyZW50Wm9uZU1hcC5zZXQoZnFkbiwgc3ViWm9uZSk7XG5cbiAgICAgIGNvbnN0IGRlbGVnYXRpb25Sb2xlQXJuID0gU3RhY2sub2YodGhpcykuZm9ybWF0QXJuKHtcbiAgICAgICAgcmVnaW9uOiAnJywgLy8gSUFNIGlzIGdsb2JhbCBpbiBlYWNoIHBhcnRpdGlvblxuICAgICAgICBzZXJ2aWNlOiAnaWFtJyxcbiAgICAgICAgYWNjb3VudDogY2ZnLnBhcmVudEFjY291bnRJZCxcbiAgICAgICAgcmVzb3VyY2U6ICdyb2xlJyxcbiAgICAgICAgcmVzb3VyY2VOYW1lOiBjZmcucGFyZW50Um9sZU5hbWVcbiAgICAgIH0pO1xuXG4gICAgICBjb25zdCBkZWxlZ2F0aW9uUm9sZSA9IGlhbS5Sb2xlLmZyb21Sb2xlQXJuKHRoaXMsIGAke2t9RGVsZWdhdGlvblJvbGVgLCBkZWxlZ2F0aW9uUm9sZUFybik7XG5cbiAgICAgIC8vIGNyZWF0ZSB0aGUgcmVjb3JkXG4gICAgICBuZXcgQ3Jvc3NBY2NvdW50Wm9uZURlbGVnYXRpb25SZWNvcmQodGhpcywgYCR7Y2ZnLmRvbWFpbk5hbWUucmVwbGFjZSgnLicsICcnKS50b1VwcGVyQ2FzZSgpfURlbGVnYXRlYCwge1xuICAgICAgICBkZWxlZ2F0ZWRab25lOiBzdWJab25lLFxuICAgICAgICBwYXJlbnRIb3N0ZWRab25lSWQ6IGNmZy5wYXJlbnRIb3N0ZWRab25lSWQsIC8vIG9yIHlvdSBjYW4gdXNlIHBhcmVudEhvc3RlZFpvbmVJZFxuICAgICAgICBkZWxlZ2F0aW9uUm9sZSxcbiAgICAgIH0pO1xuICAgIH0pXG4gIH1cblxuICBjcmVhdGVBQ01zKCkge1xuICAgIHRoaXMuY29uZmlnLmFjbXM/LmZvckVhY2goZG9tYWluID0+IHtcbiAgICAgIGNvbnN0IGxnID0gZG9tYWluLnNwbGl0KCcuJykuc2xpY2UoMCwgMikuam9pbignJyk7XG4gICAgICBjb25zdCBjID0gbmV3IGFjbS5DZXJ0aWZpY2F0ZSh0aGlzLCBsZywge1xuICAgICAgICBkb21haW5OYW1lOiBkb21haW4sXG4gICAgICAgIHN1YmplY3RBbHRlcm5hdGl2ZU5hbWVzOiBbYHd3dy4ke2RvbWFpbn1gXSxcbiAgICAgICAgdmFsaWRhdGlvbjogYWNtLkNlcnRpZmljYXRlVmFsaWRhdGlvbi5mcm9tRG5zKCksIC8vIFJlY29yZHMgbXVzdCBiZSBhZGRlZCBtYW51YWxseVxuICAgICAgfSk7XG5cbiAgICAgIGNvbnN0IHBhcmFtID0gbmV3IHNzbS5TdHJpbmdQYXJhbWV0ZXIodGhpcywgYCR7bGd9UGFyYW1gLCB7XG4gICAgICAgIHN0cmluZ1ZhbHVlOiBjLmNlcnRpZmljYXRlQXJuLFxuICAgICAgICBwYXJhbWV0ZXJOYW1lOiBgL2FjbS8ke2RvbWFpbn1gLFxuICAgICAgICBkZXNjcmlwdGlvbjogYCR7ZG9tYWlufSBBQ01gLFxuICAgICAgICB0aWVyOiBzc20uUGFyYW1ldGVyVGllci5TVEFOREFSRCxcbiAgICAgICAgdHlwZTogc3NtLlBhcmFtZXRlclR5cGUuU1RSSU5HLFxuICAgICAgfSk7XG4gICAgfSlcbiAgfVxuXG4gIGNyZWF0ZUNkbkFDTXMoKSB7XG4gICAgLy8gRm9yIGNsb3VkZnJvbnQgZGlzdHJpYnV0aW9uIHdlIG5lZWQgdG8gY3JlYXRlIGEgY2VydGlmaWNhdGVcbiAgICB0aGlzLmNvbmZpZy5jZG5BY21zPy5mb3JFYWNoKGMgPT4ge1xuICAgICAgdmFyIGhvc3RlZFpvbmVcbiAgICAgIGlmIChjLnBhcmVudEhvc3RlZFpvbmVJZCAmJiBjLnBhcmVudEhvc3RlZFpvbmVOYW1lKSB7XG4gICAgICAgIGhvc3RlZFpvbmUgPSBIb3N0ZWRab25lLmZyb21Ib3N0ZWRab25lQXR0cmlidXRlcyh0aGlzLCAnUGFyZW50SG9zdGVkWm9uZUlkJywge1xuICAgICAgICAgICAgaG9zdGVkWm9uZUlkOiBjLnBhcmVudEhvc3RlZFpvbmVJZCxcbiAgICAgICAgICAgIHpvbmVOYW1lOiBjLnBhcmVudEhvc3RlZFpvbmVOYW1lXG4gICAgICAgIH0pXG4gICAgICB9IGVsc2Uge1xuICAgICAgICBob3N0ZWRab25lID0gdGhpcy5wYXJlbnRab25lTWFwLmdldChjLmRvbWFpbik7XG4gICAgICB9XG4gICAgICBcbiAgICAgIGlmIChob3N0ZWRab25lKSB7XG4gICAgICAgIGNvbnN0IGNlcnQgPSBuZXcgYWNtLkRuc1ZhbGlkYXRlZENlcnRpZmljYXRlKHRoaXMsICdDcm9zc1JlZ2lvbkNlcnRpZmljYXRlJywge1xuICAgICAgICAgIGRvbWFpbk5hbWU6IGMuZG9tYWluLFxuICAgICAgICAgIHN1YmplY3RBbHRlcm5hdGl2ZU5hbWVzOiBjLmFsdGVybmF0aXZlRG9tYWlucyxcbiAgICAgICAgICBob3N0ZWRab25lOiBob3N0ZWRab25lLFxuICAgICAgICAgIHJlZ2lvbjogJ3VzLWVhc3QtMScsXG4gICAgICAgIH0pO1xuXG4gICAgICAgIGNvbnN0IHBhcmFtID0gbmV3IHNzbS5TdHJpbmdQYXJhbWV0ZXIodGhpcywgYCR7Yy5kb21haW59UGFyYW1gLCB7XG4gICAgICAgICAgc3RyaW5nVmFsdWU6IGNlcnQuY2VydGlmaWNhdGVBcm4sXG4gICAgICAgICAgcGFyYW1ldGVyTmFtZTogYC9hY20vJHtjLmRvbWFpbn1gLFxuICAgICAgICAgIGRlc2NyaXB0aW9uOiBgJHtjLmRvbWFpbn0gQUNNIChDZXJ0IGluIFVTLUVhc3QtMSlgLFxuICAgICAgICAgIHRpZXI6IHNzbS5QYXJhbWV0ZXJUaWVyLlNUQU5EQVJELFxuICAgICAgICAgIHR5cGU6IHNzbS5QYXJhbWV0ZXJUeXBlLlNUUklORyxcbiAgICAgICAgfSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb25zb2xlLmVycm9yKGBbUm91dGU1M11bc3ViWm9uZV0gJHtjLmRvbWFpbn0gbm90IGZvdW5kIGluIHBhcmVudCB6b25lIG1hcGApXG4gICAgICAgIGV4aXQoMSlcbiAgICAgIH1cblxuICAgIH0pXG5cbiAgfVxufVxuIl19
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebsiteStack = void 0;
const iam = require("aws-cdk-lib/aws-iam");
const ssm = require("aws-cdk-lib/aws-ssm");
const route53 = require("aws-cdk-lib/aws-route53");
const acm = require("aws-cdk-lib/aws-certificatemanager");
const cloudfront = require("aws-cdk-lib/aws-cloudfront");
const origins = require("aws-cdk-lib/aws-cloudfront-origins");
const targets = require("aws-cdk-lib/aws-route53-targets");
const s3 = require("aws-cdk-lib/aws-s3");
const cdk = require("aws-cdk-lib");
const aws_cdk_lib_1 = require("aws-cdk-lib");
const aws_cloudfront_1 = require("aws-cdk-lib/aws-cloudfront");
class WebsiteStack extends cdk.Stack {
    constructor(scope, id, config, props) {
        var _a;
        super(scope, id, props);
        this.config = config;
        const hostingBucket = new s3.Bucket(this, this.config.website.bucket.bucketName, {
            bucketName: this.config.website.bucket.bucketName,
            websiteIndexDocument: 'index.html',
            websiteErrorDocument: 'error.html',
            publicReadAccess: true,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            enforceSSL: true,
            encryption: s3.BucketEncryption.S3_MANAGED,
        });
        hostingBucket.grantReadWrite(new iam.ArnPrincipal(`arn:aws:iam::${cdk.Stack.of(this).account}:role/buildkite-deployment-role`));
        const acmArn = ssm.StringParameter.valueForStringParameter(this, `/acm/${this.config.website.domain}`);
        const certificate = acm.Certificate.fromCertificateArn(this, "Certificate", acmArn);
        var defaultBehavior = {
            origin: new origins.S3Origin(hostingBucket),
            viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        };
        // If config is passed
        if (this.config.website.responseHeaderBehaviour) {
            var shb;
            if (this.config.website.responseHeaderBehaviour.strictTransportSecurity) {
                const t = aws_cdk_lib_1.Duration.seconds(Number(this.config.website.responseHeaderBehaviour.strictTransportSecurity.accessControlMaxAge));
                // Duration doesnt have the method to convert config
                shb = {
                    ...this.config.website.responseHeaderBehaviour,
                    strictTransportSecurity: {
                        ...this.config.website.responseHeaderBehaviour.strictTransportSecurity,
                        accessControlMaxAge: t
                    }
                };
            }
            else {
                shb = this.config.website.responseHeaderBehaviour;
            }
            const responseHeaderPolicy = new cloudfront.ResponseHeadersPolicy(this, 'ResponseHeadersPolicy', {
                responseHeadersPolicyName: 'ResponseHeaderCustomPolicy',
                comment: 'A default response policy with security headers',
                securityHeadersBehavior: shb,
            });
            defaultBehavior = {
                origin: new origins.S3Origin(hostingBucket),
                viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
                responseHeadersPolicy: responseHeaderPolicy
            };
        }
        const al = this.config.website.certificateAliases ? [this.config.website.domain, ...this.config.website.certificateAliases] : [this.config.website.domain];
        // Use new style distribution
        const cf = new cloudfront.Distribution(this, 'WebDistribution', {
            comment: this.config.website.domain,
            httpVersion: aws_cloudfront_1.HttpVersion.HTTP2_AND_3,
            webAclId: this.config.website.webACLId ? this.config.website.webACLId : undefined,
            defaultBehavior: defaultBehavior,
            errorResponses: [
                {
                    httpStatus: 403,
                    responseHttpStatus: 200,
                    responsePagePath: '/index.html'
                }
            ],
            domainNames: al,
            certificate: certificate,
            minimumProtocolVersion: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021
        });
        // incase we have cross account hosting zone domains to support
        var d;
        if (this.config.website.ignorePrefix && this.config.website.domain.startsWith(this.config.website.ignorePrefix)) {
            d = this.config.website.domain.split(".").slice(1).join(".");
        }
        else {
            d = this.config.website.domain;
        }
        const zoneId = ssm.StringParameter.valueForStringParameter(this, `/route53/${d}/zone`);
        const zone = route53.HostedZone.fromHostedZoneAttributes(this, "DomainHostedZone", {
            zoneName: d,
            hostedZoneId: zoneId,
        });
        // // Adding out A Record code
        new route53.ARecord(this, "CDNARecord", {
            recordName: this.config.website.domain,
            ttl: cdk.Duration.seconds(60),
            zone,
            target: route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(cf)),
        });
        new route53.AaaaRecord(this, "AliasRecord", {
            recordName: this.config.website.domain,
            ttl: cdk.Duration.seconds(60),
            zone,
            target: route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(cf)),
        });
        (_a = this.config.website.addtionalARecords) === null || _a === void 0 ? void 0 : _a.map(r => {
            new route53.ARecord(this, `${r.recordName}CDNARecord`, {
                recordName: r.recordName,
                ttl: cdk.Duration.seconds(r.ttl),
                zone,
                target: route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(cf)),
            });
        });
    }
}
exports.WebsiteStack = WebsiteStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2Vic2l0ZVN0YWNrLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsid2Vic2l0ZVN0YWNrLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLDJDQUE0QztBQUM1QywyQ0FBNEM7QUFDNUMsbURBQW9EO0FBQ3BELDBEQUEyRDtBQUMzRCx5REFBMEQ7QUFDMUQsOERBQStEO0FBQy9ELDJEQUE0RDtBQUM1RCx5Q0FBMEM7QUFDMUMsbUNBQW9DO0FBR3BDLDZDQUF1QztBQUN2QywrREFBMkc7QUFJM0csTUFBYSxZQUFhLFNBQVEsR0FBRyxDQUFDLEtBQUs7SUFJdkMsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxNQUFxQixFQUFFLEtBQXNCOztRQUNuRixLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUV4QixJQUFJLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQztRQUVyQixNQUFNLGFBQWEsR0FBRyxJQUFJLEVBQUUsQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxVQUFVLEVBQUU7WUFDN0UsVUFBVSxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxVQUFVO1lBQ2pELG9CQUFvQixFQUFFLFlBQVk7WUFDbEMsb0JBQW9CLEVBQUUsWUFBWTtZQUNsQyxnQkFBZ0IsRUFBRSxJQUFJO1lBQ3RCLGFBQWEsRUFBRSxHQUFHLENBQUMsYUFBYSxDQUFDLE9BQU87WUFDeEMsVUFBVSxFQUFFLElBQUk7WUFDaEIsVUFBVSxFQUFFLEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQyxVQUFVO1NBQzdDLENBQUMsQ0FBQTtRQUdGLGFBQWEsQ0FBQyxjQUFjLENBQUMsSUFBSSxHQUFHLENBQUMsWUFBWSxDQUFDLGdCQUFnQixHQUFHLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxPQUFPLGlDQUFpQyxDQUFD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LFFBQVEsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1lBQzdCLElBQUk7WUFDSixNQUFNLEVBQUUsT0FBTyxDQUFDLFlBQVksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLENBQUMsZ0JBQWdCLENBQUMsRUFBRSxDQUFDLENBQUM7U0FDM0UsQ0FBQyxDQUFDO1FBRUgsSUFBSSxPQUFPLENBQUMsVUFBVSxDQUFDLElBQUksRUFBRSxhQUFhLEVBQUU7WUFDeEMsVUFBVSxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLE1BQU07WUFDdEMsR0FBRyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztZQUM3QixJQUFJO1lBQ0osTUFBTSxFQUFFLE9BQU8sQ0FBQyxZQUFZLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxDQUFDLGdCQUFnQixDQUFDLEVBQUUsQ0FBQyxDQUFDO1NBQzNFLENBQUMsQ0FBQztRQUVILE1BQUEsSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsaUJBQWlCLDBDQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRTtZQUMzQyxJQUFJLE9BQU8sQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLEdBQUcsQ0FBQyxDQUFDLFVBQVUsWUFBWSxFQUFFO2dCQUNuRCxVQUFVLEVBQUUsQ0FBQyxDQUFDLFVBQVU7Z0JBQ3hCLEdBQUcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDO2dCQUNoQyxJQUFJO2dCQUNKLE1BQU0sRUFBRSxPQUFPLENBQUMsWUFBWSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxFQUFFLENBQUMsQ0FBQzthQUMzRSxDQUFDLENBQUM7UUFDUCxDQUFDLENBQUMsQ0FBQTtJQUNOLENBQUM7Q0FDSjtBQTdIRCxvQ0E2SEMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgaWFtID0gcmVxdWlyZSgnYXdzLWNkay1saWIvYXdzLWlhbScpO1xuaW1wb3J0IHNzbSA9IHJlcXVpcmUoJ2F3cy1jZGstbGliL2F3cy1zc20nKTtcbmltcG9ydCByb3V0ZTUzID0gcmVxdWlyZSgnYXdzLWNkay1saWIvYXdzLXJvdXRlNTMnKTtcbmltcG9ydCBhY20gPSByZXF1aXJlKCdhd3MtY2RrLWxpYi9hd3MtY2VydGlmaWNhdGVtYW5hZ2VyJyk7XG5pbXBvcnQgY2xvdWRmcm9udCA9IHJlcXVpcmUoJ2F3cy1jZGstbGliL2F3cy1jbG91ZGZyb250Jyk7XG5pbXBvcnQgb3JpZ2lucyA9IHJlcXVpcmUoJ2F3cy1jZGstbGliL2F3cy1jbG91ZGZyb250LW9yaWdpbnMnKTtcbmltcG9ydCB0YXJnZXRzID0gcmVxdWlyZSgnYXdzLWNkay1saWIvYXdzLXJvdXRlNTMtdGFyZ2V0cycpO1xuaW1wb3J0IHMzID0gcmVxdWlyZSgnYXdzLWNkay1saWIvYXdzLXMzJyk7XG5pbXBvcnQgY2RrID0gcmVxdWlyZSgnYXdzLWNkay1saWInKTtcbmltcG9ydCB7IENvbnN0cnVjdCB9IGZyb20gJ2NvbnN0cnVjdHMnO1xuaW1wb3J0IHsgV2Vic2l0ZUNvbmZpZyB9IGZyb20gJy4uLy4uL2ludGVyZmFjZXMvbGliL3dlYnNpdGUvaW50ZXJmYWNlcyc7XG5pbXBvcnQgeyBEdXJhdGlvbiB9IGZyb20gJ2F3cy1jZGstbGliJztcbmltcG9ydCB7IEJlaGF2aW9yT3B0aW9ucywgSHR0cFZlcnNpb24sIFJlc3BvbnNlU2VjdXJpdHlIZWFkZXJzQmVoYXZpb3IgfSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtY2xvdWRmcm9udCc7XG5pbXBvcnQgeyBleGl0IH0gZnJvbSAncHJvY2Vzcyc7XG5cblxuZXhwb3J0IGNsYXNzIFdlYnNpdGVTdGFjayBleHRlbmRzIGNkay5TdGFjayB7XG5cbiAgICBjb25maWc6IFdlYnNpdGVDb25maWc7XG5cbiAgICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nLCBjb25maWc6IFdlYnNpdGVDb25maWcsIHByb3BzPzogY2RrLlN0YWNrUHJvcHMpIHtcbiAgICAgICAgc3VwZXIoc2NvcGUsIGlkLCBwcm9wcyk7XG5cbiAgICAgICAgdGhpcy5jb25maWcgPSBjb25maWc7XG5cbiAgICAgICAgY29uc3QgaG9zdGluZ0J1Y2tldCA9IG5ldyBzMy5CdWNrZXQodGhpcywgdGhpcy5jb25maWcud2Vic2l0ZS5idWNrZXQuYnVja2V0TmFtZSwge1xuICAgICAgICAgICAgYnVja2V0TmFtZTogdGhpcy5jb25maWcud2Vic2l0ZS5idWNrZXQuYnVja2V0TmFtZSxcbiAgICAgICAgICAgIHdlYnNpdGVJbmRleERvY3VtZW50OiAnaW5kZXguaHRtbCcsXG4gICAgICAgICAgICB3ZWJzaXRlRXJyb3JEb2N1bWVudDogJ2Vycm9yLmh0bWwnLCAvLyBDbG91ZEZvcm1hdGlvbiBkb2Vzbid0IHJlcXVpcmUgdGhpcyBidXQgdGhlIFMzIGNvbnNvbGUgdWkgZG9lc1xuICAgICAgICAgICAgcHVibGljUmVhZEFjY2VzczogdHJ1ZSxcbiAgICAgICAgICAgIHJlbW92YWxQb2xpY3k6IGNkay5SZW1vdmFsUG9saWN5LkRFU1RST1ksXG4gICAgICAgICAgICBlbmZvcmNlU1NMOiB0cnVlLFxuICAgICAgICAgICAgZW5jcnlwdGlvbjogczMuQnVja2V0RW5jcnlwdGlvbi5TM19NQU5BR0VELFxuICAgICAgICB9KVxuXG5cbiAgICAgICAgaG9zdGluZ0J1Y2tldC5ncmFudFJlYWRXcml0ZShuZXcgaWFtLkFyblByaW5jaXBhbChgYXJuOmF3czppYW06OiR7Y2RrLlN0YWNrLm9mKHRoaXMpLmFjY291bnR9OnJvbGUvYnVpbGRraXRlLWRlcGxveW1lbnQtcm9sZWApKVxuXG4gICAgICAgIGNvbnN0IGFjbUFybiA9IHNzbS5TdHJpbmdQYXJhbWV0ZXIudmFsdWVGb3JTdHJpbmdQYXJhbWV0ZXIoXG4gICAgICAgICAgICB0aGlzLCBgL2FjbS8ke3RoaXMuY29uZmlnLndlYnNpdGUuZG9tYWlufWBcbiAgICAgICAgKVxuXG4gICAgICAgIGNvbnN0IGNlcnRpZmljYXRlID0gYWNtLkNlcnRpZmljYXRlLmZyb21DZXJ0aWZpY2F0ZUFybih0aGlzLCBcIkNlcnRpZmljYXRlXCIsIGFjbUFybik7XG5cbiAgICAgICAgdmFyIGRlZmF1bHRCZWhhdmlvcjogQmVoYXZpb3JPcHRpb25zID0ge1xuICAgICAgICAgICAgb3JpZ2luOiBuZXcgb3JpZ2lucy5TM09yaWdpbihob3N0aW5nQnVja2V0KSxcbiAgICAgICAgICAgIHZpZXdlclByb3RvY29sUG9saWN5OiBjbG91ZGZyb250LlZpZXdlclByb3RvY29sUG9saWN5LlJFRElSRUNUX1RPX0hUVFBTLFxuICAgICAgICB9XG4gICAgICAgIC8vIElmIGNvbmZpZyBpcyBwYXNzZWRcbiAgICAgICAgaWYgKHRoaXMuY29uZmlnLndlYnNpdGUucmVzcG9uc2VIZWFkZXJCZWhhdmlvdXIpIHtcbiAgICAgICAgICAgIHZhciBzaGI6IFJlc3BvbnNlU2VjdXJpdHlIZWFkZXJzQmVoYXZpb3JcblxuICAgICAgICAgICAgaWYgKHRoaXMuY29uZmlnLndlYnNpdGUucmVzcG9uc2VIZWFkZXJCZWhhdmlvdXIuc3RyaWN0VHJhbnNwb3J0U2VjdXJpdHkpIHtcbiAgICAgICAgICAgICAgICBjb25zdCB0ID0gRHVyYXRpb24uc2Vjb25kcyhOdW1iZXIodGhpcy5jb25maWcud2Vic2l0ZS5yZXNwb25zZUhlYWRlckJlaGF2aW91ci5zdHJpY3RUcmFuc3BvcnRTZWN1cml0eS5hY2Nlc3NDb250cm9sTWF4QWdlKSlcbiAgICAgICAgICAgICAgICAvLyBEdXJhdGlvbiBkb2VzbnQgaGF2ZSB0aGUgbWV0aG9kIHRvIGNvbnZlcnQgY29uZmlnXG4gICAgICAgICAgICAgICAgc2hiID0ge1xuICAgICAgICAgICAgICAgICAgICAuLi50aGlzLmNvbmZpZy53ZWJzaXRlLnJlc3BvbnNlSGVhZGVyQmVoYXZpb3VyLFxuICAgICAgICAgICAgICAgICAgICBzdHJpY3RUcmFuc3BvcnRTZWN1cml0eToge1xuICAgICAgICAgICAgICAgICAgICAgICAgLi4udGhpcy5jb25maWcud2Vic2l0ZS5yZXNwb25zZUhlYWRlckJlaGF2aW91ci5zdHJpY3RUcmFuc3BvcnRTZWN1cml0eSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGFjY2Vzc0NvbnRyb2xNYXhBZ2U6IHRcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgc2hiID0gdGhpcy5jb25maWcud2Vic2l0ZS5yZXNwb25zZUhlYWRlckJlaGF2aW91clxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjb25zdCByZXNwb25zZUhlYWRlclBvbGljeSA9IG5ldyBjbG91ZGZyb250LlJlc3BvbnNlSGVhZGVyc1BvbGljeSh0aGlzLCAnUmVzcG9uc2VIZWFkZXJzUG9saWN5Jywge1xuICAgICAgICAgICAgICAgIHJlc3BvbnNlSGVhZGVyc1BvbGljeU5hbWU6ICdSZXNwb25zZUhlYWRlckN1c3RvbVBvbGljeScsXG4gICAgICAgICAgICAgICAgY29tbWVudDogJ0EgZGVmYXVsdCByZXNwb25zZSBwb2xpY3kgd2l0aCBzZWN1cml0eSBoZWFkZXJzJyxcbiAgICAgICAgICAgICAgICBzZWN1cml0eUhlYWRlcnNCZWhhdmlvcjogc2hiLFxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIGRlZmF1bHRCZWhhdmlvciA9IHtcbiAgICAgICAgICAgICAgICBvcmlnaW46IG5ldyBvcmlnaW5zLlMzT3JpZ2luKGhvc3RpbmdCdWNrZXQpLFxuICAgICAgICAgICAgICAgIHZpZXdlclByb3RvY29sUG9saWN5OiBjbG91ZGZyb250LlZpZXdlclByb3RvY29sUG9saWN5LlJFRElSRUNUX1RPX0hUVFBTLFxuICAgICAgICAgICAgICAgIHJlc3BvbnNlSGVhZGVyc1BvbGljeTogcmVzcG9uc2VIZWFkZXJQb2xpY3lcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGFsID0gdGhpcy5jb25maWcud2Vic2l0ZS5jZXJ0aWZpY2F0ZUFsaWFzZXMgPyBbdGhpcy5jb25maWcud2Vic2l0ZS5kb21haW4sIC4uLnRoaXMuY29uZmlnLndlYnNpdGUuY2VydGlmaWNhdGVBbGlhc2VzXSA6IFt0aGlzLmNvbmZpZy53ZWJzaXRlLmRvbWFpbl1cbiAgICAgICAgLy8gVXNlIG5ldyBzdHlsZSBkaXN0cmlidXRpb25cbiAgICAgICAgY29uc3QgY2YgPSBuZXcgY2xvdWRmcm9udC5EaXN0cmlidXRpb24odGhpcywgJ1dlYkRpc3RyaWJ1dGlvbicsIHtcbiAgICAgICAgICAgIGNvbW1lbnQ6IHRoaXMuY29uZmlnLndlYnNpdGUuZG9tYWluLFxuICAgICAgICAgICAgaHR0cFZlcnNpb246IEh0dHBWZXJzaW9uLkhUVFAyX0FORF8zLFxuICAgICAgICAgICAgd2ViQWNsSWQ6IHRoaXMuY29uZmlnLndlYnNpdGUud2ViQUNMSWQgPyB0aGlzLmNvbmZpZy53ZWJzaXRlLndlYkFDTElkIDogdW5kZWZpbmVkLFxuICAgICAgICAgICAgZGVmYXVsdEJlaGF2aW9yOiBkZWZhdWx0QmVoYXZpb3IsXG4gICAgICAgICAgICBlcnJvclJlc3BvbnNlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgaHR0cFN0YXR1czogNDAzLFxuICAgICAgICAgICAgICAgICAgICByZXNwb25zZUh0dHBTdGF0dXM6IDIwMCxcbiAgICAgICAgICAgICAgICAgICAgcmVzcG9uc2VQYWdlUGF0aDogJy9pbmRleC5odG1sJ1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBkb21haW5OYW1lczogYWwsXG4gICAgICAgICAgICBjZXJ0aWZpY2F0ZTogY2VydGlmaWNhdGUsXG4gICAgICAgICAgICBtaW5pbXVtUHJvdG9jb2xWZXJzaW9uOiBjbG91ZGZyb250LlNlY3VyaXR5UG9saWN5UHJvdG9jb2wuVExTX1YxXzJfMjAyMVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBpbmNhc2Ugd2UgaGF2ZSBjcm9zcyBhY2NvdW50IGhvc3Rpbmcgem9uZSBkb21haW5zIHRvIHN1cHBvcnRcbiAgICAgICAgdmFyIGQ6IHN0cmluZ1xuXG4gICAgICAgIGlmICh0aGlzLmNvbmZpZy53ZWJzaXRlLmlnbm9yZVByZWZpeCAmJiB0aGlzLmNvbmZpZy53ZWJzaXRlLmRvbWFpbi5zdGFydHNXaXRoKHRoaXMuY29uZmlnLndlYnNpdGUuaWdub3JlUHJlZml4KSkge1xuICAgICAgICAgICAgZCA9IHRoaXMuY29uZmlnLndlYnNpdGUuZG9tYWluLnNwbGl0KFwiLlwiKS5zbGljZSgxKS5qb2luKFwiLlwiKTtcblxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZCA9IHRoaXMuY29uZmlnLndlYnNpdGUuZG9tYWluXG4gICAgICAgIH1cblxuXG4gICAgICAgIGNvbnN0IHpvbmVJZCA9IHNzbS5TdHJpbmdQYXJhbWV0ZXIudmFsdWVGb3JTdHJpbmdQYXJhbWV0ZXIodGhpcywgYC9yb3V0ZTUzLyR7ZH0vem9uZWApXG4gICAgICAgIGNvbnN0IHpvbmUgPSByb3V0ZTUzLkhvc3RlZFpvbmUuZnJvbUhvc3RlZFpvbmVBdHRyaWJ1dGVzKHRoaXMsIFwiRG9tYWluSG9zdGVkWm9uZVwiLFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIHpvbmVOYW1lOiBkLFxuICAgICAgICAgICAgICAgIGhvc3RlZFpvbmVJZDogem9uZUlkLFxuICAgICAgICAgICAgfVxuICAgICAgICApO1xuXG4gICAgICAgIC8vIC8vIEFkZGluZyBvdXQgQSBSZWNvcmQgY29kZVxuICAgICAgICBuZXcgcm91dGU1My5BUmVjb3JkKHRoaXMsIFwiQ0ROQVJlY29yZFwiLCB7XG4gICAgICAgICAgICByZWNvcmROYW1lOiB0aGlzLmNvbmZpZy53ZWJzaXRlLmRvbWFpbixcbiAgICAgICAgICAgIHR0bDogY2RrLkR1cmF0aW9uLnNlY29uZHMoNjApLFxuICAgICAgICAgICAgem9uZSxcbiAgICAgICAgICAgIHRhcmdldDogcm91dGU1My5SZWNvcmRUYXJnZXQuZnJvbUFsaWFzKG5ldyB0YXJnZXRzLkNsb3VkRnJvbnRUYXJnZXQoY2YpKSxcbiAgICAgICAgfSk7XG5cbiAgICAgICAgbmV3IHJvdXRlNTMuQWFhYVJlY29yZCh0aGlzLCBcIkFsaWFzUmVjb3JkXCIsIHtcbiAgICAgICAgICAgIHJlY29yZE5hbWU6IHRoaXMuY29uZmlnLndlYnNpdGUuZG9tYWluLFxuICAgICAgICAgICAgdHRsOiBjZGsuRHVyYXRpb24uc2Vjb25kcyg2MCksXG4gICAgICAgICAgICB6b25lLFxuICAgICAgICAgICAgdGFyZ2V0OiByb3V0ZTUzLlJlY29yZFRhcmdldC5mcm9tQWxpYXMobmV3IHRhcmdldHMuQ2xvdWRGcm9udFRhcmdldChjZikpLFxuICAgICAgICB9KTtcblxuICAgICAgICB0aGlzLmNvbmZpZy53ZWJzaXRlLmFkZHRpb25hbEFSZWNvcmRzPy5tYXAociA9PiB7XG4gICAgICAgICAgICBuZXcgcm91dGU1My5BUmVjb3JkKHRoaXMsIGAke3IucmVjb3JkTmFtZX1DRE5BUmVjb3JkYCwge1xuICAgICAgICAgICAgICAgIHJlY29yZE5hbWU6IHIucmVjb3JkTmFtZSxcbiAgICAgICAgICAgICAgICB0dGw6IGNkay5EdXJhdGlvbi5zZWNvbmRzKHIudHRsKSxcbiAgICAgICAgICAgICAgICB6b25lLFxuICAgICAgICAgICAgICAgIHRhcmdldDogcm91dGU1My5SZWNvcmRUYXJnZXQuZnJvbUFsaWFzKG5ldyB0YXJnZXRzLkNsb3VkRnJvbnRUYXJnZXQoY2YpKSxcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KVxuICAgIH1cbn1cbiJdfQ==
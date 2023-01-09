import iam = require('aws-cdk-lib/aws-iam');
import ssm = require('aws-cdk-lib/aws-ssm');
import route53 = require('aws-cdk-lib/aws-route53');
import acm = require('aws-cdk-lib/aws-certificatemanager');
import cloudfront = require('aws-cdk-lib/aws-cloudfront');
import origins = require('aws-cdk-lib/aws-cloudfront-origins');
import targets = require('aws-cdk-lib/aws-route53-targets');
import s3 = require('aws-cdk-lib/aws-s3');
import cdk = require('aws-cdk-lib');
import { Construct } from 'constructs';
import { WebsiteConfig } from '../../interfaces/lib/website/interfaces';
import { Duration } from 'aws-cdk-lib';
import { BehaviorOptions, HttpVersion, ResponseSecurityHeadersBehavior } from 'aws-cdk-lib/aws-cloudfront';
import { exit } from 'process';


export class WebsiteStack extends cdk.Stack {

    config: WebsiteConfig;

    constructor(scope: Construct, id: string, config: WebsiteConfig, props?: cdk.StackProps) {
        super(scope, id, props);

        this.config = config;

        const hostingBucket = new s3.Bucket(this, this.config.website.bucket.bucketName, {
            bucketName: this.config.website.bucket.bucketName,
            websiteIndexDocument: 'index.html',
            websiteErrorDocument: 'error.html', // CloudFormation doesn't require this but the S3 console ui does
            publicReadAccess: true,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            enforceSSL: true,
            encryption: s3.BucketEncryption.S3_MANAGED,
        })


        hostingBucket.grantReadWrite(new iam.ArnPrincipal(`arn:aws:iam::${cdk.Stack.of(this).account}:role/buildkite-deployment-role`))

        const originAccessIdentity = new cloudfront.OriginAccessIdentity(
            this,
            "OriginAccessIdentiy"
        )
        hostingBucket.grantRead(originAccessIdentity)
        const acmArn = ssm.StringParameter.valueForStringParameter(
            this, `/acm/${this.config.website.domain}`
        )

        const certificate = acm.Certificate.fromCertificateArn(this, "Certificate", acmArn);

        const origin = new origins.S3Origin(hostingBucket, {originAccessIdentity})
        var defaultBehavior: BehaviorOptions = {
            origin: origin,
            viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        }
        // If config is passed
        if (this.config.website.responseHeaderBehaviour) {
            var shb: ResponseSecurityHeadersBehavior

            if (this.config.website.responseHeaderBehaviour.strictTransportSecurity) {
                const t = Duration.seconds(Number(this.config.website.responseHeaderBehaviour.strictTransportSecurity.accessControlMaxAge))
                // Duration doesnt have the method to convert config
                shb = {
                    ...this.config.website.responseHeaderBehaviour,
                    strictTransportSecurity: {
                        ...this.config.website.responseHeaderBehaviour.strictTransportSecurity,
                        accessControlMaxAge: t
                    }
                }
            } else {
                shb = this.config.website.responseHeaderBehaviour
            }

            const responseHeaderPolicy = new cloudfront.ResponseHeadersPolicy(this, 'ResponseHeadersPolicy', {
                responseHeadersPolicyName: this.config.website.responseHeaderName || 'ResponseHeaderCustomPolicy',
                comment: 'A default response policy with security headers',
                securityHeadersBehavior: shb,
            });

            defaultBehavior = {
                origin: origin,
                viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
                responseHeadersPolicy: responseHeaderPolicy
            }
        }

        const al = this.config.website.certificateAliases ? [this.config.website.domain, ...this.config.website.certificateAliases] : [this.config.website.domain]
        // Use new style distribution
        const cf = new cloudfront.Distribution(this, 'WebDistribution', {
            comment: this.config.website.domain,
            httpVersion: HttpVersion.HTTP2_AND_3,
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
        var d: string

        if (this.config.website.ignorePrefix && this.config.website.domain.startsWith(this.config.website.ignorePrefix)) {
            d = this.config.website.domain.split(".").slice(1).join(".");

        } else {
            d = this.config.website.domain
        }


        const zoneId = ssm.StringParameter.valueForStringParameter(this, `/route53/${d}/zone`)
        const zone = route53.HostedZone.fromHostedZoneAttributes(this, "DomainHostedZone",
            {
                zoneName: d,
                hostedZoneId: zoneId,
            }
        );

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

        this.config.website.addtionalARecords?.map(r => {
            new route53.ARecord(this, `${r.recordName}CDNARecord`, {
                recordName: r.recordName,
                ttl: cdk.Duration.seconds(r.ttl),
                zone,
                target: route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(cf)),
            });
        })
    }
}

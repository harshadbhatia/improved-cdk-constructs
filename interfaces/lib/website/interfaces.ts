import { BucketProps } from "aws-cdk-lib/aws-s3";
import { CloudFrontWebDistributionProps, ResponseSecurityHeadersBehavior } from "aws-cdk-lib/aws-cloudfront";


export interface WebsiteConfig {
    stackName: string;
    stackDescription: string;

    website: WebsiteStackProps



}

export interface WebsiteStackProps {
    domain: string
    bucket: {
        bucketName: string,
    }
    ignorePrefix?: string
    certificateAliases?: string[]

    addtionalARecords?: AdditionalARecord[]
    // cloudfront?: CloudFrontWebDistributionProps

    responseHeaderBehaviour?: ResponseSecurityHeadersBehavior
    responseHeaderName?: string

    webACLId?: string // WAF ACL id
}

export interface AdditionalARecord {
    ttl: number
    recordName: string
}

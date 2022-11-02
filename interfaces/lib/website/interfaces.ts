import { cloudfront } from "../../../deps.ts";

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

    responseHeaderBehaviour?: cloudfront.ResponseSecurityHeadersBehavior

    webACLId?: string // WAF ACL id
}

export interface AdditionalARecord {
    ttl: number
    recordName: string
}

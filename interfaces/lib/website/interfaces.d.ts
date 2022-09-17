import { ResponseSecurityHeadersBehavior } from "aws-cdk-lib/aws-cloudfront";
export interface WebsiteConfig {
    stackName: string;
    stackDescription: string;
    website: WebsiteStackProps;
}
export interface WebsiteStackProps {
    domain: string;
    bucket: {
        bucketName: string;
    };
    ignorePrefix?: string;
    certificateAliases?: string[];
    addtionalARecords?: AdditionalARecord[];
    responseHeaderBehaviour?: ResponseSecurityHeadersBehavior;
    webACLId?: string;
}
export interface AdditionalARecord {
    ttl: number;
    recordName: string;
}

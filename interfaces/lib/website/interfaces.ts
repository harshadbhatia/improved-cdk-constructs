import { BucketProps } from "aws-cdk-lib/aws-s3";
import { CloudFrontWebDistributionProps } from "aws-cdk-lib/aws-cloudfront";

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
    // cloudfront?: CloudFrontWebDistributionProps
}

import { StackProps } from "aws-cdk-lib";
import { CorsRule } from "aws-cdk-lib/aws-s3";

// Default is
export interface S3BucketCfg {
  name: string
  isPrivateWithCors?: boolean
  cors?: CorsRule[]
}

export interface PrivateS3BucketsStackProps extends StackProps {
  s3Buckets?: S3BucketCfg[];
}
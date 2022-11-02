import { cdk, s3 } from "../../../deps.ts";


// Default is
export interface S3BucketCfg {
  name: string
  isPrivateWithCors?: boolean
  enableEventbridge?: boolean
  cors?: s3.CorsRule[]
}

export interface PrivateS3BucketsStackProps extends cdk.StackProps {
  s3Buckets?: S3BucketCfg[];
}
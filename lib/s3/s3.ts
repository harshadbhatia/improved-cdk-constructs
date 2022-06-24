import cdk = require('aws-cdk-lib');
import { RemovalPolicy } from 'aws-cdk-lib';
import { BlockPublicAccess, Bucket, BucketEncryption } from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';
import { PrivateS3BucketsStackProps } from '../../interfaces/lib/s3/interfaces';


export class PrivateS3BucketsStack extends cdk.Stack {
  config: PrivateS3BucketsStackProps;

  constructor(scope: Construct, id: string, props?: PrivateS3BucketsStackProps) {
    super(scope, id, props);
    this.config = props!

    this.createS3Buckets()
  }

  createS3Buckets(): void {
    this.config.s3Buckets?.forEach(bucket => {
      if (bucket.isPrivateWithCors) {
        const b = new Bucket(this, bucket.name, {
          bucketName: bucket.name,
          encryption: BucketEncryption.S3_MANAGED,
          enforceSSL: true,
          publicReadAccess: false,
          eventBridgeEnabled: bucket.enableEventbridge,
          blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
          cors: bucket.cors,
          versioned: true,
          removalPolicy: RemovalPolicy.DESTROY,
        });
      } else {
        const b = new Bucket(this, bucket.name, {
          bucketName: bucket.name,
          encryption: BucketEncryption.S3_MANAGED,
          enforceSSL: true,
          publicReadAccess: false,
          eventBridgeEnabled: bucket.enableEventbridge,
          blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
          versioned: true,
          removalPolicy: RemovalPolicy.DESTROY,
        });
      }
    });
  }
}

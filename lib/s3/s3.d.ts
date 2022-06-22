import cdk = require('aws-cdk-lib');
import { Construct } from 'constructs';
import { PrivateS3BucketsStackProps } from '../../interfaces/lib/s3/interfaces';
export declare class PrivateS3BucketsStack extends cdk.Stack {
    config: PrivateS3BucketsStackProps;
    constructor(scope: Construct, id: string, props?: PrivateS3BucketsStackProps);
    createS3Buckets(): void;
}

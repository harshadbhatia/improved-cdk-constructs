import cdk = require('aws-cdk-lib');
import { Construct } from 'constructs';
import { WebsiteConfig } from '../../interfaces/lib/website/interfaces';
export declare class WebsiteStack extends cdk.Stack {
    config: WebsiteConfig;
    constructor(scope: Construct, id: string, config: WebsiteConfig, props?: cdk.StackProps);
}

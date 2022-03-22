import ec2 = require('aws-cdk-lib/aws-ec2');
import cdk = require('aws-cdk-lib');
import { Construct } from 'constructs';
import { ServerlessRDSConfig } from '../../interfaces/lib/rds/interfaces';
export declare class ServerlessRDSStack extends cdk.Stack {
    config: ServerlessRDSConfig;
    constructor(scope: Construct, id: string, config: ServerlessRDSConfig, props?: cdk.StackProps);
    getVPC(): ec2.IVpc;
    createRDS(): void;
}

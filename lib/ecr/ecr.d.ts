import cdk = require('aws-cdk-lib');
import { Stack } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { ECRCfg } from '../../interfaces/lib/ecr/interfaces';
export declare class ECRStack extends Stack {
    config: ECRCfg;
    constructor(scope: Construct, id: string, config: ECRCfg, props?: cdk.StackProps);
}

import cdk = require('aws-cdk-lib');
import { PublicHostedZone } from 'aws-cdk-lib/aws-route53';
import { Construct } from 'constructs';
import { Route53SubZoneConfig, SubZoneConfig } from '../../interfaces/lib/route53/interfaces';
/**
 * Warning - CDK doesnt support multiple subzones in a single stack.
 */
export declare class Route53SubZoneStack extends cdk.Stack {
    config: Route53SubZoneConfig;
    parentZoneMap: Map<string, PublicHostedZone>;
    constructor(scope: Construct, id: string, config: Route53SubZoneConfig, props?: cdk.StackProps);
    createSubHostedZone(zone: SubZoneConfig): void;
    createACMs(): void;
    createCdnACMs(): void;
}

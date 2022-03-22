import cdk = require('aws-cdk-lib');
import { PublicHostedZone } from 'aws-cdk-lib/aws-route53';
import { Construct } from 'constructs';
import { DomainRecords, Route53ParentConfig } from '../../interfaces/lib/route53/interfaces';
export declare class Route53ParentStack extends cdk.Stack {
    config: Route53ParentConfig;
    constructor(scope: Construct, id: string, config: Route53ParentConfig, props?: cdk.StackProps);
    createDomainRecords(parentZoneMap: Map<string, PublicHostedZone>): void;
    createMXRecords(dr: DomainRecords, hostedZone: PublicHostedZone): void;
    createACMs(): void;
    createCdnACMs(parentZoneMap: Map<string, PublicHostedZone>): void;
}

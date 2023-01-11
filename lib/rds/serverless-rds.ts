import iam = require('aws-cdk-lib/aws-iam');
import rds = require('aws-cdk-lib/aws-rds');
import ec2 = require('aws-cdk-lib/aws-ec2');
import ssm = require('aws-cdk-lib/aws-ssm');
import lambda = require('aws-cdk-lib/aws-lambda');
import cdk = require('aws-cdk-lib');
import { Construct } from 'constructs';
import { ServerlessRDSConfig } from '../../interfaces/lib/rds/interfaces';
import { SecurityGroup } from 'aws-cdk-lib/aws-ec2';


export class ServerlessRDSStack extends cdk.Stack {

    config: ServerlessRDSConfig;

    constructor(scope: Construct, id: string, config: ServerlessRDSConfig, props?: cdk.StackProps) {
        super(scope, id, props);
        this.config = config;

        this.createRDS();
    }

    getVPC(): ec2.IVpc {

        const vpcId = ssm.StringParameter.valueFromLookup(this, '/account/vpc/id');
        const vpc = ec2.Vpc.fromLookup(this, 'VPC', { vpcId: vpcId });

        return vpc

    }

    createRDS() {

        const vpc = this.getVPC();

        this.config.databases.map(cfg => {
            const securityGroup = new SecurityGroup(this, `${cfg.defaultDBName}-DBSecurityGroup`, {
                vpc,
                description: `${cfg.defaultDBName} - Database ingress`,
                securityGroupName: `${cfg.defaultDBName}-DBSecurityGroup`,

            });

            securityGroup.addIngressRule(
                ec2.Peer.ipv4(cfg.allowedCidr),
                ec2.Port.tcp(5432),
                `${cfg.defaultDBName} - Database ingress`
            );

            if (cfg.snapshotIdentifier) {
                const cluster = new rds.ServerlessClusterFromSnapshot(this, cfg.clusterName, {
                    engine: rds.DatabaseClusterEngine.AURORA_POSTGRESQL,
                    snapshotIdentifier: cfg.snapshotIdentifier,
                    vpc: vpc,
                    enableDataApi: true,
                    parameterGroup: rds.ParameterGroup.fromParameterGroupName(this, 'ParameterGroup', cfg.parameterGroupName),
                    defaultDatabaseName: cfg.defaultDBName,
                    securityGroups: [securityGroup],
                });

            }
            else {
                const cluster = new rds.ServerlessCluster(this, cfg.clusterName, {
                    engine: rds.DatabaseClusterEngine.AURORA_POSTGRESQL,
                    vpc: vpc,
                    enableDataApi: true,
                    parameterGroup: rds.ParameterGroup.fromParameterGroupName(this, 'ParameterGroup', cfg.parameterGroupName),
                    defaultDatabaseName: cfg.defaultDBName,
                    securityGroups: [securityGroup],
                });
            }


        })

    }
}
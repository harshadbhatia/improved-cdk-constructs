import { IAspect } from "aws-cdk-lib";
import { Construct, IConstruct } from "constructs";
import iam = require('aws-cdk-lib/aws-iam');
export declare class PermissionsBoundaryAspect implements IAspect {
    readonly permissionsBoundaryArn: string;
    constructor(roleName?: string);
    visit(node: IConstruct): void;
}
export declare function permissionBoundary(scope: Construct): iam.IManagedPolicy;

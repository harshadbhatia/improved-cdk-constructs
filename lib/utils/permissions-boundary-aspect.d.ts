import { IAspect } from "aws-cdk-lib";
import { Construct, IConstruct } from "constructs";
export declare class PermissionsBoundaryAspect implements IAspect {
    readonly permissionsBoundaryArn: string;
    constructor(roleName?: string);
    visit(node: IConstruct): void;
}
export declare function permissionBoundary(scope: Construct): any;

import { IAspect } from "aws-cdk-lib";
import { IConstruct } from "constructs";
/**
 * Aspect to automatically allow lambda to access the secret Name
 */
export declare class ApplyDatadogRoleAspect implements IAspect {
    private readonly secretName;
    constructor(secretName?: string);
    visit(node: IConstruct): void;
}

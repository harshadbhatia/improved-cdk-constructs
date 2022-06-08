import { IAspect } from "aws-cdk-lib";
import { IConstruct } from "constructs";
export declare class ApplyDatadogRoleAspect implements IAspect {
    private readonly secretName;
    constructor(secretName?: string);
    visit(node: IConstruct): void;
}

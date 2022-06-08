"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApplyDatadogRoleAspect = void 0;
const aws_iam_1 = require("aws-cdk-lib/aws-iam");
const aws_lambda_1 = require("aws-cdk-lib/aws-lambda");
/**
 * Aspect to automatically allow lambda to access the secret Name
 */
class ApplyDatadogRoleAspect {
    constructor(secretName = "/account/datadog/api-key") {
        this.secretName = secretName;
    }
    visit(node) {
        if (node instanceof aws_lambda_1.Function) {
            node.addToRolePolicy(new aws_iam_1.PolicyStatement({
                sid: "AllowDataDogAPIKeySecretAccess",
                effect: aws_iam_1.Effect.ALLOW,
                actions: [
                    "secretsmanager:GetSecretValue",
                ],
                resources: [`arn:aws:secretsmanager:${process.env.CDK_DEFAULT_REGION}:${process.env.CDK_DEFAULT_ACCOUNT}:secret:${this.secretName}-*`]
            }));
        }
    }
}
exports.ApplyDatadogRoleAspect = ApplyDatadogRoleAspect;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXNwZWN0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiYXNwZWN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUNBLGlEQUE4RDtBQUM5RCx1REFBb0U7QUFHcEU7O0dBRUc7QUFDSCxNQUFhLHNCQUFzQjtJQUUvQixZQUE2QixhQUFhLDBCQUEwQjtRQUF2QyxlQUFVLEdBQVYsVUFBVSxDQUE2QjtJQUFJLENBQUM7SUFFekUsS0FBSyxDQUFDLElBQWdCO1FBQ2xCLElBQUksSUFBSSxZQUFZLHFCQUFjLEVBQUU7WUFDaEMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxJQUFJLHlCQUFlLENBQ3BDO2dCQUNJLEdBQUcsRUFBRSxnQ0FBZ0M7Z0JBQ3JDLE1BQU0sRUFBRSxnQkFBTSxDQUFDLEtBQUs7Z0JBQ3BCLE9BQU8sRUFBRTtvQkFDTCwrQkFBK0I7aUJBQ2xDO2dCQUNELFNBQVMsRUFBRSxDQUFDLDBCQUEwQixPQUFPLENBQUMsR0FBRyxDQUFDLGtCQUFrQixJQUFJLE9BQU8sQ0FBQyxHQUFHLENBQUMsbUJBQW1CLFdBQVcsSUFBSSxDQUFDLFVBQVUsSUFBSSxDQUFDO2FBQ3pJLENBQ0osQ0FBQyxDQUFBO1NBQ0w7SUFDTCxDQUFDO0NBQ0o7QUFsQkQsd0RBa0JDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgSUFzcGVjdCB9IGZyb20gXCJhd3MtY2RrLWxpYlwiO1xuaW1wb3J0IHsgRWZmZWN0LCBQb2xpY3lTdGF0ZW1lbnQgfSBmcm9tIFwiYXdzLWNkay1saWIvYXdzLWlhbVwiO1xuaW1wb3J0IHsgRnVuY3Rpb24gYXMgTGFtYmRhRnVuY3Rpb24gfSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtbGFtYmRhJztcbmltcG9ydCB7IElDb25zdHJ1Y3QgfSBmcm9tIFwiY29uc3RydWN0c1wiO1xuXG4vKipcbiAqIEFzcGVjdCB0byBhdXRvbWF0aWNhbGx5IGFsbG93IGxhbWJkYSB0byBhY2Nlc3MgdGhlIHNlY3JldCBOYW1lXG4gKi9cbmV4cG9ydCBjbGFzcyBBcHBseURhdGFkb2dSb2xlQXNwZWN0IGltcGxlbWVudHMgSUFzcGVjdCB7XG5cbiAgICBjb25zdHJ1Y3Rvcihwcml2YXRlIHJlYWRvbmx5IHNlY3JldE5hbWUgPSBcIi9hY2NvdW50L2RhdGFkb2cvYXBpLWtleVwiKSB7IH1cblxuICAgIHZpc2l0KG5vZGU6IElDb25zdHJ1Y3QpOiB2b2lkIHtcbiAgICAgICAgaWYgKG5vZGUgaW5zdGFuY2VvZiBMYW1iZGFGdW5jdGlvbikge1xuICAgICAgICAgICAgbm9kZS5hZGRUb1JvbGVQb2xpY3kobmV3IFBvbGljeVN0YXRlbWVudChcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHNpZDogXCJBbGxvd0RhdGFEb2dBUElLZXlTZWNyZXRBY2Nlc3NcIixcbiAgICAgICAgICAgICAgICAgICAgZWZmZWN0OiBFZmZlY3QuQUxMT1csXG4gICAgICAgICAgICAgICAgICAgIGFjdGlvbnM6IFtcbiAgICAgICAgICAgICAgICAgICAgICAgIFwic2VjcmV0c21hbmFnZXI6R2V0U2VjcmV0VmFsdWVcIixcbiAgICAgICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICAgICAgcmVzb3VyY2VzOiBbYGFybjphd3M6c2VjcmV0c21hbmFnZXI6JHtwcm9jZXNzLmVudi5DREtfREVGQVVMVF9SRUdJT059OiR7cHJvY2Vzcy5lbnYuQ0RLX0RFRkFVTFRfQUNDT1VOVH06c2VjcmV0OiR7dGhpcy5zZWNyZXROYW1lfS0qYF1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICApKVxuICAgICAgICB9XG4gICAgfVxufSJdfQ==
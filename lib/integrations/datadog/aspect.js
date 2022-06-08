"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApplyDatadogRoleAspect = void 0;
const aws_iam_1 = require("aws-cdk-lib/aws-iam");
const aws_lambda_1 = require("aws-cdk-lib/aws-lambda");
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXNwZWN0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiYXNwZWN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUNBLGlEQUE4RDtBQUM5RCx1REFBb0U7QUFHcEUsTUFBYSxzQkFBc0I7SUFFL0IsWUFBNkIsYUFBYSwwQkFBMEI7UUFBdkMsZUFBVSxHQUFWLFVBQVUsQ0FBNkI7SUFBRyxDQUFDO0lBRXhFLEtBQUssQ0FBQyxJQUFnQjtRQUNsQixJQUFJLElBQUksWUFBWSxxQkFBYyxFQUFFO1lBQ2hDLElBQUksQ0FBQyxlQUFlLENBQUMsSUFBSSx5QkFBZSxDQUNwQztnQkFDSSxHQUFHLEVBQUUsZ0NBQWdDO2dCQUNyQyxNQUFNLEVBQUUsZ0JBQU0sQ0FBQyxLQUFLO2dCQUNwQixPQUFPLEVBQUU7b0JBQ0wsK0JBQStCO2lCQUNsQztnQkFDRCxTQUFTLEVBQUUsQ0FBQywwQkFBMEIsT0FBTyxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsSUFBSSxPQUFPLENBQUMsR0FBRyxDQUFDLG1CQUFtQixXQUFXLElBQUksQ0FBQyxVQUFVLElBQUksQ0FBQzthQUN6SSxDQUNKLENBQUMsQ0FBQTtTQUNMO0lBQ0wsQ0FBQztDQUNKO0FBbEJELHdEQWtCQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IElBc3BlY3QgfSBmcm9tIFwiYXdzLWNkay1saWJcIjtcbmltcG9ydCB7IEVmZmVjdCwgUG9saWN5U3RhdGVtZW50IH0gZnJvbSBcImF3cy1jZGstbGliL2F3cy1pYW1cIjtcbmltcG9ydCB7IEZ1bmN0aW9uIGFzIExhbWJkYUZ1bmN0aW9uIH0gZnJvbSAnYXdzLWNkay1saWIvYXdzLWxhbWJkYSc7XG5pbXBvcnQgeyBJQ29uc3RydWN0IH0gZnJvbSBcImNvbnN0cnVjdHNcIjtcblxuZXhwb3J0IGNsYXNzIEFwcGx5RGF0YWRvZ1JvbGVBc3BlY3QgaW1wbGVtZW50cyBJQXNwZWN0IHtcblxuICAgIGNvbnN0cnVjdG9yKHByaXZhdGUgcmVhZG9ubHkgc2VjcmV0TmFtZSA9IFwiL2FjY291bnQvZGF0YWRvZy9hcGkta2V5XCIpIHt9XG5cbiAgICB2aXNpdChub2RlOiBJQ29uc3RydWN0KTogdm9pZCB7XG4gICAgICAgIGlmIChub2RlIGluc3RhbmNlb2YgTGFtYmRhRnVuY3Rpb24pIHtcbiAgICAgICAgICAgIG5vZGUuYWRkVG9Sb2xlUG9saWN5KG5ldyBQb2xpY3lTdGF0ZW1lbnQoXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBzaWQ6IFwiQWxsb3dEYXRhRG9nQVBJS2V5U2VjcmV0QWNjZXNzXCIsXG4gICAgICAgICAgICAgICAgICAgIGVmZmVjdDogRWZmZWN0LkFMTE9XLFxuICAgICAgICAgICAgICAgICAgICBhY3Rpb25zOiBbXG4gICAgICAgICAgICAgICAgICAgICAgICBcInNlY3JldHNtYW5hZ2VyOkdldFNlY3JldFZhbHVlXCIsXG4gICAgICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgICAgIHJlc291cmNlczogW2Bhcm46YXdzOnNlY3JldHNtYW5hZ2VyOiR7cHJvY2Vzcy5lbnYuQ0RLX0RFRkFVTFRfUkVHSU9OfToke3Byb2Nlc3MuZW52LkNES19ERUZBVUxUX0FDQ09VTlR9OnNlY3JldDoke3RoaXMuc2VjcmV0TmFtZX0tKmBdXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgKSlcbiAgICAgICAgfVxuICAgIH1cbn0iXX0=
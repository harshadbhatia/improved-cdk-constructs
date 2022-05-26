import { IAspect } from "aws-cdk-lib";
import { Effect, PolicyStatement } from "aws-cdk-lib/aws-iam";
import { Function as LambdaFunction } from 'aws-cdk-lib/aws-lambda';
import { IConstruct } from "constructs";

export class ApplyDatadogRoleAspect implements IAspect {

    constructor(private readonly secretName = "/account/datadog/api-key") {}

    visit(node: IConstruct): void {
        if (node instanceof LambdaFunction) {
            node.addToRolePolicy(new PolicyStatement(
                {
                    sid: "AllowDataDogAPIKeySecretAccess",
                    effect: Effect.ALLOW,
                    actions: [
                        "secretsmanager:GetSecretValue",
                    ],
                    resources: [`arn:aws:secretsmanager:${process.env.CDK_DEFAULT_REGION}:${process.env.CDK_DEFAULT_ACCOUNT}:secret:${this.secretName}-*`]
                }
            ))
        }
    }
}
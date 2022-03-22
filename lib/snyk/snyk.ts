import { Stack, StackProps, CfnOutput } from 'aws-cdk-lib';
import { ArnPrincipal, Effect, PolicyDocument, PolicyStatement, Role } from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import { SnykConfig } from '../../interfaces/lib/snyk/interfaces';

export class SnykStack extends Stack {

  config: SnykConfig
  snykRole: Role

  constructor(scope: Construct, id: string, config: SnykConfig, props?: StackProps) {
    super(scope, id, props);

    this.config = config;
    this.snykReadOnlyAccess();
    this.setOutputs();
  }

  snykReadOnlyAccess(): void {
    this.snykRole = new Role(this, "SnykServiceRole", {
      roleName: "SnykServiceRole",
      description: "Allows EC2 instances to call Snyk AWS services on your behalf",
      assumedBy: new ArnPrincipal("arn:aws:iam::198361731867:user/ecr-integration-user").withConditions({
        "StringEquals": {
          "sts:ExternalId": "53b86440-9408-4732-8182-613fea22da9d"
        }
      }),
      inlinePolicies: { ecrPullPolicies: this.snykInlinePolicies() }
    }
    )
  };

  snykInlinePolicies(): PolicyDocument {
    const snykPolicy = new PolicyStatement(
      {
        sid: "SnykAllowPull",
        effect: Effect.ALLOW,
        actions: [
          "ecr:GetLifecyclePolicyPreview",
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage",
          "ecr:DescribeImages",
          "ecr:GetAuthorizationToken",
          "ecr:DescribeRepositories",
          "ecr:ListTagsForResource",
          "ecr:ListImages",
          "ecr:BatchCheckLayerAvailability",
          "ecr:GetRepositoryPolicy",
          "ecr:GetLifecyclePolicy",
        ],
        resources: ["*"]
      }
    );

    const document = new PolicyDocument();
    document.addStatements(snykPolicy);

    return document;
  }

  setOutputs(): void {
    new CfnOutput(this, "SnykServiceRoleARN", { value: this.snykRole.roleArn })
  };

}

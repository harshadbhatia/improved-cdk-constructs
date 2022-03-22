import { Aws, DefaultStackSynthesizer } from "aws-cdk-lib";

export function newSynthesizer(deploymentRole: string, cfnExecRole: string): DefaultStackSynthesizer {
  return new DefaultStackSynthesizer({
    deployRoleArn: "arn:aws:iam::${AWS::AccountId}:role/" + deploymentRole, // Assume role warning here
    cloudFormationExecutionRole: "arn:aws:iam::${AWS::AccountId}:role/" + cfnExecRole,
  })
}
import {  aws_inspector, Stack, StackProps, Tags } from 'aws-cdk-lib';
import { Construct } from 'constructs';

export class InspectorStack extends Stack {

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);
    const cfnAssessmentTarget = new aws_inspector.CfnAssessmentTarget(this, 'MyCfnAssessmentTarget', /* all optional props */ {
      assessmentTargetName: 'dataCoAssessmentTarget',
    });
  }
}
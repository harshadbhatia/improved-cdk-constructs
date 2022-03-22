import * as cdk from 'aws-cdk-lib';
import * as Lib from '../../lib/vpc/vpc';

test('VPC Dummy test', () => {
    const app = new cdk.App();
    // WHEN
    // const stack = new Lib.AnzVPCStack(app, 'MyTestStack',);
    // THEN
    // const actual = JSON.stringify(app.synth().getStackArtifact(stack.artifactId).template);
    // expect(actual).toContain('AWS::SQS::Queue');
    // expect(actual).toContain('AWS::SNS::Topic');
});

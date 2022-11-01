import { assertSnapshot } from "https://deno.land/std@0.161.0/testing/snapshot.ts";
import { cdk, cdk_assertions } from "../../deps.ts";
import { VPCConfig } from "../../interfaces/lib/vpc/interfaces.ts";
import { yamlCfgFileReader } from "../../lib/utils/file-reader.ts";

// Deno.test('VPC Dummy test', () => {
//     const app = new cdk.App();
//     const cfg = yamlCfgFileReader('vpc/vpc.yaml', '../../examples/') as VPCConfig
//     const stack = new VPCStack(app, 'MyTestVPCStack', cfg)
//     const actual = JSON.stringify(app.synth().getStackArtifact(stack.artifactId).template);
//     // assertStringIncludes(actual, 'AWS::SNS::Topic')

// });

Deno.test("isECRSnapshotMatch", async function (t): Promise<void> {
    const app = new cdk.App();
    const cfg = yamlCfgFileReader('ecr/ecr.yaml', '../../examples/') as VPCConfig

    const stack = new ECRStack(app, 'MyECRStack', cfg)
    const template = cdk_assertions.Template.fromStack(stack);

    await assertSnapshot(t, template.toJSON());
});
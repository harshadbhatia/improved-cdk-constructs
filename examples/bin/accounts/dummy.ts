import { cdk } from "../../../deps.ts";
import { CDKEnv } from '../../../interfaces/interfaces.ts'
import { VPCConfig } from '../../../interfaces/lib/vpc/interfaces.ts'

import { yamlCfgFileReader } from '../../../lib/utils/file-reader.ts'

import { VPCStack } from '../../../lib/vpc/vpc.ts'

export function dummyAccountStacks(app: cdk.App, env: CDKEnv) {
  const cfg = yamlCfgFileReader('vpc/vpc.yaml', '../../examples/') as VPCConfig

  const _vpcStack = new VPCStack(app, cfg.stackName, cfg, {
    description: cfg.stackDescription,
    env: env
  });

}

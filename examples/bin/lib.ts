
import { cdk } from "../../deps.ts";
import { CDKEnv } from "../../interfaces/interfaces.ts";
import { dummyAccountStacks } from './accounts/dummy.ts';

// import * as dotenv from 'dotenv';

// dotenv.config();

const env: CDKEnv = {
  account: Deno.env.get("CDK_DEFAULT_ACCOUNT") || "",
  region: Deno.env.get("CDK_DEFAULT_REGION") || "ap-southeast-2",
}

async function createApp(): Promise<cdk.App> {
  const app = new cdk.App();

  // For each account we have set of stacks
  await dummyAccountStacks(app, env)
  return app

}

createApp().then((a) => a.synth())
# Welcome to Improved CDK Constructs !

The lib contains set of constructs which build and bake some required services in a stack.

The idea is to define config files which will drive the change for Cloudformation stacks.

For example, a website stack contains an S3 bucket and cloudfront distribution.
These are synonymous to L3 cdk constructs.

# Versioning / etc

It is done using conventialcommit and husky for git hooks to validate messages.

# Github Actions

- New release is made PR is merged to master. This will push a commit.

## Useful commands

- `npm run build` compile typescript to js
- `npm run watch` watch for changes and compile
- `npm run test` perform the jest unit tests
- `cdk deploy` deploy this stack to your default AWS account/region
- `cdk diff` compare deployed stack with current state
- `cdk synth` emits the synthesized CloudFormation template

## TODO

- Add tests
- Cleanup
- Write documentation
- Do proper branching strategy

## Notes on specific modules

- Datadog currently operator is not fully functional when paired with CSI secret driver. Defect has been raised.
- Alternative is to install datadog integration, create a secret called and pass it to the DatadogOperator stack.
  params used is `datadogK8ExistingSecret`

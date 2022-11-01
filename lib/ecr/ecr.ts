
// import cdk = require('aws-cdk-lib');
// import { Stack } from 'aws-cdk-lib';
// import { Repository } from 'aws-cdk-lib/aws-ecr';
// import { Construct } from 'constructs';
import { ECRCfg } from '../../interfaces/lib/ecr/interfaces';
// import { AccountPrincipal, Effect, PolicyStatement, ServicePrincipal } from 'aws-cdk-lib/aws-iam';


import { cdk, constructs, ec2, ssm } from "../../deps.ts";
import { VPCConfig } from '../../interfaces/lib/vpc/interfaces.ts';

export class ECRStack extends Stack {

  config: ECRCfg;

  constructor(scope: Construct, id: string, config: ECRCfg, props?: cdk.StackProps) {
    super(scope, id);

    this.config = config;

    for (let repo of this.config.repos) {

      const r = new Repository(this, `Repo${repo.repositoryName.replace("-", "")}`, {
        repositoryName: repo.repositoryName,
      })

      r.addToResourcePolicy(new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage",
          "ecr:BatchCheckLayerAvailability",
          "ecr:PutImage",
          "ecr:InitiateLayerUpload",
          "ecr:UploadLayerPart",
          "ecr:CompleteLayerUpload"
        ],
        principals: repo.allowAccountAccess.map(a => {
          return new AccountPrincipal(a)
        }),
        sid: "AllowAccountAccess"
      }))

      if (repo.lambdaContainer) {
        r.addToResourcePolicy(new PolicyStatement({
          effect: Effect.ALLOW,
          actions: [
            "ecr:GetDownloadUrlForLayer",
            "ecr:BatchGetImage",
          ],
          principals: [
            new ServicePrincipal('lambda.amazonaws.com'),
          ],
          sid: "LambdaECRImageRetrievalPolicy"
        }))
      }
      if (repo.rules)
        Object.entries(repo.rules).forEach(([event, rule]) => {
          if (rule.tagPrefix && rule.maxImageCount) {
            r.addLifecycleRule({ tagPrefixList: rule.tagPrefix, maxImageCount: rule.maxImageCount })
          } else if (rule.maxAge) {
            r.addLifecycleRule({ maxImageAge: cdk.Duration.days(rule.maxAge) })
          }
        })
    }

    // >>TODO this doesnt work - There is PR open for lookup function on CDK repo
    // Add access for any existing repos
    // for (let rep of this.config.existingRepos) {

    //   const r = Repository.(
    //     this, `Repo${rep.repositoryName.replace("-", "")}`, rep.repositoryName
    //   )

    //   r.addToResourcePolicy(new PolicyStatement({
    //     effect: Effect.ALLOW,
    //     actions: [
    //       "ecr:GetDownloadUrlForLayer",
    //       "ecr:BatchGetImage",
    //       "ecr:BatchCheckLayerAvailability",
    //       "ecr:PutImage",
    //       "ecr:InitiateLayerUpload",
    //       "ecr:UploadLayerPart",
    //       "ecr:CompleteLayerUpload"
    //     ],
    //     principals: rep.allowAccountAccess.map(a => {
    //       return new AccountPrincipal(a)
    //     }),
    //     sid: "AllowAccountAccessA"
    //   }))


    // }
  }


}


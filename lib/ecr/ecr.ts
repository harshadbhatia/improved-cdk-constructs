import { cdk, constructs, ecr, iam } from "../../deps.ts";
import { ECRStackProps } from '../../interfaces/index.ts';

export class ECRStack extends cdk.Stack {

  config: ECRStackProps;

  constructor(scope: constructs.Construct, id: string, props?: ECRStackProps) {
    super(scope, id, props);

    this.config = props!;

    for (const repo of this.config.repos) {

      const r = new ecr.Repository(this, `Repo${repo.repositoryName.replace("-", "")}`, {
        repositoryName: repo.repositoryName,
      })

      r.addToResourcePolicy(new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage",
          "ecr:BatchCheckLayerAvailability",
          "ecr:PutImage",
          "ecr:InitiateLayerUpload",
          "ecr:UploadLayerPart",
          "ecr:CompleteLayerUpload"
        ],
        principals: repo.allowAccountAccess ? repo.allowAccountAccess.map(a => {
          return new iam.AccountPrincipal(a)
        }) : [new iam.AccountPrincipal(cdk.Aws.ACCOUNT_ID)],
        sid: "AllowAccountAccess"
      }))

      if (repo.lambdaContainer) {
        r.addToResourcePolicy(new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: [
            "ecr:GetDownloadUrlForLayer",
            "ecr:BatchGetImage",
          ],
          principals: [
            new iam.ServicePrincipal('lambda.amazonaws.com'),
          ],
          sid: "LambdaECRImageRetrievalPolicy"
        }))
      }
      if (repo.rules)
        Object.entries(repo.rules).forEach(([_event, rule]) => {
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


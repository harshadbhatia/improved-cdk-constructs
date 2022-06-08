"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ECRStack = void 0;
const cdk = require("aws-cdk-lib");
const aws_cdk_lib_1 = require("aws-cdk-lib");
const aws_ecr_1 = require("aws-cdk-lib/aws-ecr");
const aws_iam_1 = require("aws-cdk-lib/aws-iam");
class ECRStack extends aws_cdk_lib_1.Stack {
    constructor(scope, id, config, props) {
        super(scope, id);
        this.config = config;
        for (let repo of this.config.repos) {
            const r = new aws_ecr_1.Repository(this, `Repo${repo.repositoryName.replace("-", "")}`, {
                repositoryName: repo.repositoryName,
            });
            r.addToResourcePolicy(new aws_iam_1.PolicyStatement({
                effect: aws_iam_1.Effect.ALLOW,
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
                    return new aws_iam_1.AccountPrincipal(a);
                }),
                sid: "AllowAccountAccess"
            }));
            if (repo.lambdaContainer) {
                r.addToResourcePolicy(new aws_iam_1.PolicyStatement({
                    effect: aws_iam_1.Effect.ALLOW,
                    actions: [
                        "ecr:GetDownloadUrlForLayer",
                        "ecr:BatchGetImage",
                    ],
                    principals: [
                        new aws_iam_1.ServicePrincipal('lambda.amazonaws.com'),
                    ],
                    sid: "LambdaECRImageRetrievalPolicy"
                }));
            }
            if (repo.rules)
                Object.entries(repo.rules).forEach(([event, rule]) => {
                    if (rule.tagPrefix && rule.maxImageCount) {
                        r.addLifecycleRule({ tagPrefixList: rule.tagPrefix, maxImageCount: rule.maxImageCount });
                    }
                    else if (rule.maxAge) {
                        r.addLifecycleRule({ maxImageAge: cdk.Duration.days(rule.maxAge) });
                    }
                });
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
exports.ECRStack = ECRStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWNyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZWNyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUNBLG1DQUFvQztBQUNwQyw2Q0FBb0M7QUFDcEMsaURBQWlEO0FBR2pELGlEQUFrRztBQUdsRyxNQUFhLFFBQVMsU0FBUSxtQkFBSztJQUlqQyxZQUFZLEtBQWdCLEVBQUUsRUFBVSxFQUFFLE1BQWMsRUFBRSxLQUFzQjtRQUM5RSxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBRWpCLElBQUksQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFDO1FBRXJCLEtBQUssSUFBSSxJQUFJLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUU7WUFFbEMsTUFBTSxDQUFDLEdBQUcsSUFBSSxvQkFBVSxDQUFDLElBQUksRUFBRSxPQUFPLElBQUksQ0FBQyxjQUFjLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFO2dCQUM1RSxjQUFjLEVBQUUsSUFBSSxDQUFDLGNBQWM7YUFDcEMsQ0FBQyxDQUFBO1lBRUYsQ0FBQyxDQUFDLG1CQUFtQixDQUFDLElBQUkseUJBQWUsQ0FBQztnQkFDeEMsTUFBTSxFQUFFLGdCQUFNLENBQUMsS0FBSztnQkFDcEIsT0FBTyxFQUFFO29CQUNQLDRCQUE0QjtvQkFDNUIsbUJBQW1CO29CQUNuQixpQ0FBaUM7b0JBQ2pDLGNBQWM7b0JBQ2QseUJBQXlCO29CQUN6QixxQkFBcUI7b0JBQ3JCLHlCQUF5QjtpQkFDMUI7Z0JBQ0QsVUFBVSxFQUFFLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUU7b0JBQzFDLE9BQU8sSUFBSSwwQkFBZ0IsQ0FBQyxDQUFDLENBQUMsQ0FBQTtnQkFDaEMsQ0FBQyxDQUFDO2dCQUNGLEdBQUcsRUFBRSxvQkFBb0I7YUFDMUIsQ0FBQyxDQUFDLENBQUE7WUFFSCxJQUFJLElBQUksQ0FBQyxlQUFlLEVBQUU7Z0JBQ3hCLENBQUMsQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLHlCQUFlLENBQUM7b0JBQ3hDLE1BQU0sRUFBRSxnQkFBTSxDQUFDLEtBQUs7b0JBQ3BCLE9BQU8sRUFBRTt3QkFDUCw0QkFBNEI7d0JBQzVCLG1CQUFtQjtxQkFDcEI7b0JBQ0QsVUFBVSxFQUFFO3dCQUNWLElBQUksMEJBQWdCLENBQUMsc0JBQXNCLENBQUM7cUJBQzdDO29CQUNELEdBQUcsRUFBRSwrQkFBK0I7aUJBQ3JDLENBQUMsQ0FBQyxDQUFBO2FBQ0o7WUFDRCxJQUFJLElBQUksQ0FBQyxLQUFLO2dCQUNaLE1BQU0sQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxFQUFFLEVBQUU7b0JBQ25ELElBQUksSUFBSSxDQUFDLFNBQVMsSUFBSSxJQUFJLENBQUMsYUFBYSxFQUFFO3dCQUN4QyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsRUFBRSxhQUFhLEVBQUUsSUFBSSxDQUFDLFNBQVMsRUFBRSxhQUFhLEVBQUUsSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDLENBQUE7cUJBQ3pGO3lCQUFNLElBQUksSUFBSSxDQUFDLE1BQU0sRUFBRTt3QkFDdEIsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLEVBQUUsV0FBVyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUE7cUJBQ3BFO2dCQUNILENBQUMsQ0FBQyxDQUFBO1NBQ0w7UUFFRCw2RUFBNkU7UUFDN0Usb0NBQW9DO1FBQ3BDLCtDQUErQztRQUUvQywyQkFBMkI7UUFDM0IsNkVBQTZFO1FBQzdFLE1BQU07UUFFTixnREFBZ0Q7UUFDaEQsNEJBQTRCO1FBQzVCLGlCQUFpQjtRQUNqQixzQ0FBc0M7UUFDdEMsNkJBQTZCO1FBQzdCLDJDQUEyQztRQUMzQyx3QkFBd0I7UUFDeEIsbUNBQW1DO1FBQ25DLCtCQUErQjtRQUMvQixrQ0FBa0M7UUFDbEMsU0FBUztRQUNULG9EQUFvRDtRQUNwRCx1Q0FBdUM7UUFDdkMsVUFBVTtRQUNWLGlDQUFpQztRQUNqQyxRQUFRO1FBR1IsSUFBSTtJQUNOLENBQUM7Q0FHRjtBQXJGRCw0QkFxRkMiLCJzb3VyY2VzQ29udGVudCI6WyJcbmltcG9ydCBjZGsgPSByZXF1aXJlKCdhd3MtY2RrLWxpYicpO1xuaW1wb3J0IHsgU3RhY2sgfSBmcm9tICdhd3MtY2RrLWxpYic7XG5pbXBvcnQgeyBSZXBvc2l0b3J5IH0gZnJvbSAnYXdzLWNkay1saWIvYXdzLWVjcic7XG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tICdjb25zdHJ1Y3RzJztcbmltcG9ydCB7IEVDUkNmZyB9IGZyb20gJy4uLy4uL2ludGVyZmFjZXMvbGliL2Vjci9pbnRlcmZhY2VzJztcbmltcG9ydCB7IEFjY291bnRQcmluY2lwYWwsIEVmZmVjdCwgUG9saWN5U3RhdGVtZW50LCBTZXJ2aWNlUHJpbmNpcGFsIH0gZnJvbSAnYXdzLWNkay1saWIvYXdzLWlhbSc7XG5cblxuZXhwb3J0IGNsYXNzIEVDUlN0YWNrIGV4dGVuZHMgU3RhY2sge1xuXG4gIGNvbmZpZzogRUNSQ2ZnO1xuXG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcsIGNvbmZpZzogRUNSQ2ZnLCBwcm9wcz86IGNkay5TdGFja1Byb3BzKSB7XG4gICAgc3VwZXIoc2NvcGUsIGlkKTtcblxuICAgIHRoaXMuY29uZmlnID0gY29uZmlnO1xuXG4gICAgZm9yIChsZXQgcmVwbyBvZiB0aGlzLmNvbmZpZy5yZXBvcykge1xuXG4gICAgICBjb25zdCByID0gbmV3IFJlcG9zaXRvcnkodGhpcywgYFJlcG8ke3JlcG8ucmVwb3NpdG9yeU5hbWUucmVwbGFjZShcIi1cIiwgXCJcIil9YCwge1xuICAgICAgICByZXBvc2l0b3J5TmFtZTogcmVwby5yZXBvc2l0b3J5TmFtZSxcbiAgICAgIH0pXG5cbiAgICAgIHIuYWRkVG9SZXNvdXJjZVBvbGljeShuZXcgUG9saWN5U3RhdGVtZW50KHtcbiAgICAgICAgZWZmZWN0OiBFZmZlY3QuQUxMT1csXG4gICAgICAgIGFjdGlvbnM6IFtcbiAgICAgICAgICBcImVjcjpHZXREb3dubG9hZFVybEZvckxheWVyXCIsXG4gICAgICAgICAgXCJlY3I6QmF0Y2hHZXRJbWFnZVwiLFxuICAgICAgICAgIFwiZWNyOkJhdGNoQ2hlY2tMYXllckF2YWlsYWJpbGl0eVwiLFxuICAgICAgICAgIFwiZWNyOlB1dEltYWdlXCIsXG4gICAgICAgICAgXCJlY3I6SW5pdGlhdGVMYXllclVwbG9hZFwiLFxuICAgICAgICAgIFwiZWNyOlVwbG9hZExheWVyUGFydFwiLFxuICAgICAgICAgIFwiZWNyOkNvbXBsZXRlTGF5ZXJVcGxvYWRcIlxuICAgICAgICBdLFxuICAgICAgICBwcmluY2lwYWxzOiByZXBvLmFsbG93QWNjb3VudEFjY2Vzcy5tYXAoYSA9PiB7XG4gICAgICAgICAgcmV0dXJuIG5ldyBBY2NvdW50UHJpbmNpcGFsKGEpXG4gICAgICAgIH0pLFxuICAgICAgICBzaWQ6IFwiQWxsb3dBY2NvdW50QWNjZXNzXCJcbiAgICAgIH0pKVxuXG4gICAgICBpZiAocmVwby5sYW1iZGFDb250YWluZXIpIHtcbiAgICAgICAgci5hZGRUb1Jlc291cmNlUG9saWN5KG5ldyBQb2xpY3lTdGF0ZW1lbnQoe1xuICAgICAgICAgIGVmZmVjdDogRWZmZWN0LkFMTE9XLFxuICAgICAgICAgIGFjdGlvbnM6IFtcbiAgICAgICAgICAgIFwiZWNyOkdldERvd25sb2FkVXJsRm9yTGF5ZXJcIixcbiAgICAgICAgICAgIFwiZWNyOkJhdGNoR2V0SW1hZ2VcIixcbiAgICAgICAgICBdLFxuICAgICAgICAgIHByaW5jaXBhbHM6IFtcbiAgICAgICAgICAgIG5ldyBTZXJ2aWNlUHJpbmNpcGFsKCdsYW1iZGEuYW1hem9uYXdzLmNvbScpLFxuICAgICAgICAgIF0sXG4gICAgICAgICAgc2lkOiBcIkxhbWJkYUVDUkltYWdlUmV0cmlldmFsUG9saWN5XCJcbiAgICAgICAgfSkpXG4gICAgICB9XG4gICAgICBpZiAocmVwby5ydWxlcylcbiAgICAgICAgT2JqZWN0LmVudHJpZXMocmVwby5ydWxlcykuZm9yRWFjaCgoW2V2ZW50LCBydWxlXSkgPT4ge1xuICAgICAgICAgIGlmIChydWxlLnRhZ1ByZWZpeCAmJiBydWxlLm1heEltYWdlQ291bnQpIHtcbiAgICAgICAgICAgIHIuYWRkTGlmZWN5Y2xlUnVsZSh7IHRhZ1ByZWZpeExpc3Q6IHJ1bGUudGFnUHJlZml4LCBtYXhJbWFnZUNvdW50OiBydWxlLm1heEltYWdlQ291bnQgfSlcbiAgICAgICAgICB9IGVsc2UgaWYgKHJ1bGUubWF4QWdlKSB7XG4gICAgICAgICAgICByLmFkZExpZmVjeWNsZVJ1bGUoeyBtYXhJbWFnZUFnZTogY2RrLkR1cmF0aW9uLmRheXMocnVsZS5tYXhBZ2UpIH0pXG4gICAgICAgICAgfVxuICAgICAgICB9KVxuICAgIH1cblxuICAgIC8vID4+VE9ETyB0aGlzIGRvZXNudCB3b3JrIC0gVGhlcmUgaXMgUFIgb3BlbiBmb3IgbG9va3VwIGZ1bmN0aW9uIG9uIENESyByZXBvXG4gICAgLy8gQWRkIGFjY2VzcyBmb3IgYW55IGV4aXN0aW5nIHJlcG9zXG4gICAgLy8gZm9yIChsZXQgcmVwIG9mIHRoaXMuY29uZmlnLmV4aXN0aW5nUmVwb3MpIHtcblxuICAgIC8vICAgY29uc3QgciA9IFJlcG9zaXRvcnkuKFxuICAgIC8vICAgICB0aGlzLCBgUmVwbyR7cmVwLnJlcG9zaXRvcnlOYW1lLnJlcGxhY2UoXCItXCIsIFwiXCIpfWAsIHJlcC5yZXBvc2l0b3J5TmFtZVxuICAgIC8vICAgKVxuXG4gICAgLy8gICByLmFkZFRvUmVzb3VyY2VQb2xpY3kobmV3IFBvbGljeVN0YXRlbWVudCh7XG4gICAgLy8gICAgIGVmZmVjdDogRWZmZWN0LkFMTE9XLFxuICAgIC8vICAgICBhY3Rpb25zOiBbXG4gICAgLy8gICAgICAgXCJlY3I6R2V0RG93bmxvYWRVcmxGb3JMYXllclwiLFxuICAgIC8vICAgICAgIFwiZWNyOkJhdGNoR2V0SW1hZ2VcIixcbiAgICAvLyAgICAgICBcImVjcjpCYXRjaENoZWNrTGF5ZXJBdmFpbGFiaWxpdHlcIixcbiAgICAvLyAgICAgICBcImVjcjpQdXRJbWFnZVwiLFxuICAgIC8vICAgICAgIFwiZWNyOkluaXRpYXRlTGF5ZXJVcGxvYWRcIixcbiAgICAvLyAgICAgICBcImVjcjpVcGxvYWRMYXllclBhcnRcIixcbiAgICAvLyAgICAgICBcImVjcjpDb21wbGV0ZUxheWVyVXBsb2FkXCJcbiAgICAvLyAgICAgXSxcbiAgICAvLyAgICAgcHJpbmNpcGFsczogcmVwLmFsbG93QWNjb3VudEFjY2Vzcy5tYXAoYSA9PiB7XG4gICAgLy8gICAgICAgcmV0dXJuIG5ldyBBY2NvdW50UHJpbmNpcGFsKGEpXG4gICAgLy8gICAgIH0pLFxuICAgIC8vICAgICBzaWQ6IFwiQWxsb3dBY2NvdW50QWNjZXNzQVwiXG4gICAgLy8gICB9KSlcblxuXG4gICAgLy8gfVxuICB9XG5cblxufVxuXG4iXX0=
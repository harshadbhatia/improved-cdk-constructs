"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SnykStack = void 0;
const aws_cdk_lib_1 = require("aws-cdk-lib");
const aws_iam_1 = require("aws-cdk-lib/aws-iam");
class SnykStack extends aws_cdk_lib_1.Stack {
    constructor(scope, id, config, props) {
        super(scope, id, props);
        this.config = config;
        this.snykReadOnlyAccess();
        this.setOutputs();
    }
    snykReadOnlyAccess() {
        this.snykRole = new aws_iam_1.Role(this, "SnykServiceRole", {
            roleName: "SnykServiceRole",
            description: "Allows EC2 instances to call Snyk AWS services on your behalf",
            assumedBy: new aws_iam_1.ArnPrincipal("arn:aws:iam::198361731867:user/ecr-integration-user").withConditions({
                "StringEquals": {
                    "sts:ExternalId": "53b86440-9408-4732-8182-613fea22da9d"
                }
            }),
            inlinePolicies: { ecrPullPolicies: this.snykInlinePolicies() }
        });
    }
    ;
    snykInlinePolicies() {
        const snykPolicy = new aws_iam_1.PolicyStatement({
            sid: "SnykAllowPull",
            effect: aws_iam_1.Effect.ALLOW,
            actions: [
                "ecr:GetLifecyclePolicyPreview",
                "ecr:GetDownloadUrlForLayer",
                "ecr:BatchGetImage",
                "ecr:DescribeImages",
                "ecr:GetAuthorizationToken",
                "ecr:DescribeRepositories",
                "ecr:ListTagsForResource",
                "ecr:ListImages",
                "ecr:BatchCheckLayerAvailability",
                "ecr:GetRepositoryPolicy",
                "ecr:GetLifecyclePolicy",
            ],
            resources: ["*"]
        });
        const document = new aws_iam_1.PolicyDocument();
        document.addStatements(snykPolicy);
        return document;
    }
    setOutputs() {
        new aws_cdk_lib_1.CfnOutput(this, "SnykServiceRoleARN", { value: this.snykRole.roleArn });
    }
    ;
}
exports.SnykStack = SnykStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic255ay5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInNueWsudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsNkNBQTJEO0FBQzNELGlEQUFrRztBQUlsRyxNQUFhLFNBQVUsU0FBUSxtQkFBSztJQUtsQyxZQUFZLEtBQWdCLEVBQUUsRUFBVSxFQUFFLE1BQWtCLEVBQUUsS0FBa0I7UUFDOUUsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFFeEIsSUFBSSxDQUFDLE1BQU0sR0FBRyxNQUFNLENBQUM7UUFDckIsSUFBSSxDQUFDLGtCQUFrQixFQUFFLENBQUM7UUFDMUIsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDO0lBQ3BCLENBQUM7SUFFRCxrQkFBa0I7UUFDaEIsSUFBSSxDQUFDLFFBQVEsR0FBRyxJQUFJLGNBQUksQ0FBQyxJQUFJLEVBQUUsaUJBQWlCLEVBQUU7WUFDaEQsUUFBUSxFQUFFLGlCQUFpQjtZQUMzQixXQUFXLEVBQUUsK0RBQStEO1lBQzVFLFNBQVMsRUFBRSxJQUFJLHNCQUFZLENBQUMscURBQXFELENBQUMsQ0FBQyxjQUFjLENBQUM7Z0JBQ2hHLGNBQWMsRUFBRTtvQkFDZCxnQkFBZ0IsRUFBRSxzQ0FBc0M7aUJBQ3pEO2FBQ0YsQ0FBQztZQUNGLGNBQWMsRUFBRSxFQUFFLGVBQWUsRUFBRSxJQUFJLENBQUMsa0JBQWtCLEVBQUUsRUFBRTtTQUMvRCxDQUNBLENBQUE7SUFDSCxDQUFDO0lBQUEsQ0FBQztJQUVGLGtCQUFrQjtRQUNoQixNQUFNLFVBQVUsR0FBRyxJQUFJLHlCQUFlLENBQ3BDO1lBQ0UsR0FBRyxFQUFFLGVBQWU7WUFDcEIsTUFBTSxFQUFFLGdCQUFNLENBQUMsS0FBSztZQUNwQixPQUFPLEVBQUU7Z0JBQ1AsK0JBQStCO2dCQUMvQiw0QkFBNEI7Z0JBQzVCLG1CQUFtQjtnQkFDbkIsb0JBQW9CO2dCQUNwQiwyQkFBMkI7Z0JBQzNCLDBCQUEwQjtnQkFDMUIseUJBQXlCO2dCQUN6QixnQkFBZ0I7Z0JBQ2hCLGlDQUFpQztnQkFDakMseUJBQXlCO2dCQUN6Qix3QkFBd0I7YUFDekI7WUFDRCxTQUFTLEVBQUUsQ0FBQyxHQUFHLENBQUM7U0FDakIsQ0FDRixDQUFDO1FBRUYsTUFBTSxRQUFRLEdBQUcsSUFBSSx3QkFBYyxFQUFFLENBQUM7UUFDdEMsUUFBUSxDQUFDLGFBQWEsQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUVuQyxPQUFPLFFBQVEsQ0FBQztJQUNsQixDQUFDO0lBRUQsVUFBVTtRQUNSLElBQUksdUJBQVMsQ0FBQyxJQUFJLEVBQUUsb0JBQW9CLEVBQUUsRUFBRSxLQUFLLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFBO0lBQzdFLENBQUM7SUFBQSxDQUFDO0NBRUg7QUEzREQsOEJBMkRDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgU3RhY2ssIFN0YWNrUHJvcHMsIENmbk91dHB1dCB9IGZyb20gJ2F3cy1jZGstbGliJztcbmltcG9ydCB7IEFyblByaW5jaXBhbCwgRWZmZWN0LCBQb2xpY3lEb2N1bWVudCwgUG9saWN5U3RhdGVtZW50LCBSb2xlIH0gZnJvbSAnYXdzLWNkay1saWIvYXdzLWlhbSc7XG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tICdjb25zdHJ1Y3RzJztcbmltcG9ydCB7IFNueWtDb25maWcgfSBmcm9tICcuLi8uLi9pbnRlcmZhY2VzL2xpYi9zbnlrL2ludGVyZmFjZXMnO1xuXG5leHBvcnQgY2xhc3MgU255a1N0YWNrIGV4dGVuZHMgU3RhY2sge1xuXG4gIGNvbmZpZzogU255a0NvbmZpZ1xuICBzbnlrUm9sZTogUm9sZVxuXG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcsIGNvbmZpZzogU255a0NvbmZpZywgcHJvcHM/OiBTdGFja1Byb3BzKSB7XG4gICAgc3VwZXIoc2NvcGUsIGlkLCBwcm9wcyk7XG5cbiAgICB0aGlzLmNvbmZpZyA9IGNvbmZpZztcbiAgICB0aGlzLnNueWtSZWFkT25seUFjY2VzcygpO1xuICAgIHRoaXMuc2V0T3V0cHV0cygpO1xuICB9XG5cbiAgc255a1JlYWRPbmx5QWNjZXNzKCk6IHZvaWQge1xuICAgIHRoaXMuc255a1JvbGUgPSBuZXcgUm9sZSh0aGlzLCBcIlNueWtTZXJ2aWNlUm9sZVwiLCB7XG4gICAgICByb2xlTmFtZTogXCJTbnlrU2VydmljZVJvbGVcIixcbiAgICAgIGRlc2NyaXB0aW9uOiBcIkFsbG93cyBFQzIgaW5zdGFuY2VzIHRvIGNhbGwgU255ayBBV1Mgc2VydmljZXMgb24geW91ciBiZWhhbGZcIixcbiAgICAgIGFzc3VtZWRCeTogbmV3IEFyblByaW5jaXBhbChcImFybjphd3M6aWFtOjoxOTgzNjE3MzE4Njc6dXNlci9lY3ItaW50ZWdyYXRpb24tdXNlclwiKS53aXRoQ29uZGl0aW9ucyh7XG4gICAgICAgIFwiU3RyaW5nRXF1YWxzXCI6IHtcbiAgICAgICAgICBcInN0czpFeHRlcm5hbElkXCI6IFwiNTNiODY0NDAtOTQwOC00NzMyLTgxODItNjEzZmVhMjJkYTlkXCJcbiAgICAgICAgfVxuICAgICAgfSksXG4gICAgICBpbmxpbmVQb2xpY2llczogeyBlY3JQdWxsUG9saWNpZXM6IHRoaXMuc255a0lubGluZVBvbGljaWVzKCkgfVxuICAgIH1cbiAgICApXG4gIH07XG5cbiAgc255a0lubGluZVBvbGljaWVzKCk6IFBvbGljeURvY3VtZW50IHtcbiAgICBjb25zdCBzbnlrUG9saWN5ID0gbmV3IFBvbGljeVN0YXRlbWVudChcbiAgICAgIHtcbiAgICAgICAgc2lkOiBcIlNueWtBbGxvd1B1bGxcIixcbiAgICAgICAgZWZmZWN0OiBFZmZlY3QuQUxMT1csXG4gICAgICAgIGFjdGlvbnM6IFtcbiAgICAgICAgICBcImVjcjpHZXRMaWZlY3ljbGVQb2xpY3lQcmV2aWV3XCIsXG4gICAgICAgICAgXCJlY3I6R2V0RG93bmxvYWRVcmxGb3JMYXllclwiLFxuICAgICAgICAgIFwiZWNyOkJhdGNoR2V0SW1hZ2VcIixcbiAgICAgICAgICBcImVjcjpEZXNjcmliZUltYWdlc1wiLFxuICAgICAgICAgIFwiZWNyOkdldEF1dGhvcml6YXRpb25Ub2tlblwiLFxuICAgICAgICAgIFwiZWNyOkRlc2NyaWJlUmVwb3NpdG9yaWVzXCIsXG4gICAgICAgICAgXCJlY3I6TGlzdFRhZ3NGb3JSZXNvdXJjZVwiLFxuICAgICAgICAgIFwiZWNyOkxpc3RJbWFnZXNcIixcbiAgICAgICAgICBcImVjcjpCYXRjaENoZWNrTGF5ZXJBdmFpbGFiaWxpdHlcIixcbiAgICAgICAgICBcImVjcjpHZXRSZXBvc2l0b3J5UG9saWN5XCIsXG4gICAgICAgICAgXCJlY3I6R2V0TGlmZWN5Y2xlUG9saWN5XCIsXG4gICAgICAgIF0sXG4gICAgICAgIHJlc291cmNlczogW1wiKlwiXVxuICAgICAgfVxuICAgICk7XG5cbiAgICBjb25zdCBkb2N1bWVudCA9IG5ldyBQb2xpY3lEb2N1bWVudCgpO1xuICAgIGRvY3VtZW50LmFkZFN0YXRlbWVudHMoc255a1BvbGljeSk7XG5cbiAgICByZXR1cm4gZG9jdW1lbnQ7XG4gIH1cblxuICBzZXRPdXRwdXRzKCk6IHZvaWQge1xuICAgIG5ldyBDZm5PdXRwdXQodGhpcywgXCJTbnlrU2VydmljZVJvbGVBUk5cIiwgeyB2YWx1ZTogdGhpcy5zbnlrUm9sZS5yb2xlQXJuIH0pXG4gIH07XG5cbn1cbiJdfQ==
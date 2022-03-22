"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SecretsStack = void 0;
const secretsmanager = require("aws-cdk-lib/aws-secretsmanager");
const aws_cdk_lib_1 = require("aws-cdk-lib");
class SecretsStack extends aws_cdk_lib_1.Stack {
    constructor(scope, id, config, props) {
        super(scope, id, props);
        this.config = config;
        this.createSecrets();
    }
    createSecrets() {
        this.config.secrets.map((secret) => {
            if ((secret.secretType = 'generated')) {
                const templatedSecret = new secretsmanager.Secret(this, secret.name, {
                    secretName: secret.name,
                    description: secret.description,
                    generateSecretString: {
                        secretStringTemplate: JSON.stringify(secret.secretStringTemplate),
                        generateStringKey: secret.generateStringKey,
                    },
                });
            }
        });
    }
}
exports.SecretsStack = SecretsStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VjcmV0c21hbmFnZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJzZWNyZXRzbWFuYWdlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxpRUFBa0U7QUFDbEUsNkNBQWdEO0FBSWhELE1BQWEsWUFBYSxTQUFRLG1CQUFLO0lBR3JDLFlBQVksS0FBZ0IsRUFBRSxFQUFVLEVBQUUsTUFBOEIsRUFBRSxLQUFrQjtRQUMxRixLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUV4QixJQUFJLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQztRQUNyQixJQUFJLENBQUMsYUFBYSxFQUFFLENBQUM7SUFDdkIsQ0FBQztJQUVELGFBQWE7UUFDWCxJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxNQUFNLEVBQUUsRUFBRTtZQUNqQyxJQUFJLENBQUMsTUFBTSxDQUFDLFVBQVUsR0FBRyxXQUFXLENBQUMsRUFBRTtnQkFDckMsTUFBTSxlQUFlLEdBQUcsSUFBSSxjQUFjLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxNQUFNLENBQUMsSUFBSSxFQUFFO29CQUNuRSxVQUFVLEVBQUUsTUFBTSxDQUFDLElBQUk7b0JBQ3ZCLFdBQVcsRUFBRSxNQUFNLENBQUMsV0FBVztvQkFDL0Isb0JBQW9CLEVBQUU7d0JBQ3BCLG9CQUFvQixFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLG9CQUFvQixDQUFDO3dCQUNqRSxpQkFBaUIsRUFBRSxNQUFNLENBQUMsaUJBQWlCO3FCQUM1QztpQkFDRixDQUFDLENBQUM7YUFDSjtRQUNILENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztDQUNGO0FBeEJELG9DQXdCQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBzZWNyZXRzbWFuYWdlciA9IHJlcXVpcmUoJ2F3cy1jZGstbGliL2F3cy1zZWNyZXRzbWFuYWdlcicpO1xuaW1wb3J0IHsgU3RhY2ssIFN0YWNrUHJvcHMgfSBmcm9tICdhd3MtY2RrLWxpYic7XG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tICdjb25zdHJ1Y3RzJztcbmltcG9ydCB7IFNlY3JldHNNYW5hZ2VyU3RhY2tDZmcgfSBmcm9tICcuLi8uLi9pbnRlcmZhY2VzL2xpYi9zZWNyZXRzbWFuYWdlci9pbnRlcmZhY2VzJztcblxuZXhwb3J0IGNsYXNzIFNlY3JldHNTdGFjayBleHRlbmRzIFN0YWNrIHtcbiAgY29uZmlnOiBTZWNyZXRzTWFuYWdlclN0YWNrQ2ZnO1xuXG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcsIGNvbmZpZzogU2VjcmV0c01hbmFnZXJTdGFja0NmZywgcHJvcHM/OiBTdGFja1Byb3BzKSB7XG4gICAgc3VwZXIoc2NvcGUsIGlkLCBwcm9wcyk7XG5cbiAgICB0aGlzLmNvbmZpZyA9IGNvbmZpZztcbiAgICB0aGlzLmNyZWF0ZVNlY3JldHMoKTtcbiAgfVxuXG4gIGNyZWF0ZVNlY3JldHMoKTogdm9pZCB7XG4gICAgdGhpcy5jb25maWcuc2VjcmV0cy5tYXAoKHNlY3JldCkgPT4ge1xuICAgICAgaWYgKChzZWNyZXQuc2VjcmV0VHlwZSA9ICdnZW5lcmF0ZWQnKSkge1xuICAgICAgICBjb25zdCB0ZW1wbGF0ZWRTZWNyZXQgPSBuZXcgc2VjcmV0c21hbmFnZXIuU2VjcmV0KHRoaXMsIHNlY3JldC5uYW1lLCB7XG4gICAgICAgICAgc2VjcmV0TmFtZTogc2VjcmV0Lm5hbWUsXG4gICAgICAgICAgZGVzY3JpcHRpb246IHNlY3JldC5kZXNjcmlwdGlvbixcbiAgICAgICAgICBnZW5lcmF0ZVNlY3JldFN0cmluZzoge1xuICAgICAgICAgICAgc2VjcmV0U3RyaW5nVGVtcGxhdGU6IEpTT04uc3RyaW5naWZ5KHNlY3JldC5zZWNyZXRTdHJpbmdUZW1wbGF0ZSksXG4gICAgICAgICAgICBnZW5lcmF0ZVN0cmluZ0tleTogc2VjcmV0LmdlbmVyYXRlU3RyaW5nS2V5LFxuICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG59XG4iXX0=
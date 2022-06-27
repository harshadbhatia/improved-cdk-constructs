"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrivateS3BucketsStack = void 0;
const cdk = require("aws-cdk-lib");
const aws_cdk_lib_1 = require("aws-cdk-lib");
const aws_s3_1 = require("aws-cdk-lib/aws-s3");
class PrivateS3BucketsStack extends cdk.Stack {
    constructor(scope, id, props) {
        super(scope, id, props);
        this.config = props;
        this.createS3Buckets();
    }
    createS3Buckets() {
        var _a;
        (_a = this.config.s3Buckets) === null || _a === void 0 ? void 0 : _a.forEach(bucket => {
            if (bucket.isPrivateWithCors) {
                const b = new aws_s3_1.Bucket(this, bucket.name, {
                    bucketName: bucket.name,
                    encryption: aws_s3_1.BucketEncryption.S3_MANAGED,
                    enforceSSL: true,
                    publicReadAccess: false,
                    eventBridgeEnabled: bucket.enableEventbridge,
                    blockPublicAccess: aws_s3_1.BlockPublicAccess.BLOCK_ALL,
                    cors: bucket.cors,
                    versioned: true,
                    removalPolicy: aws_cdk_lib_1.RemovalPolicy.DESTROY,
                });
            }
            else {
                const b = new aws_s3_1.Bucket(this, bucket.name, {
                    bucketName: bucket.name,
                    encryption: aws_s3_1.BucketEncryption.S3_MANAGED,
                    enforceSSL: true,
                    publicReadAccess: false,
                    eventBridgeEnabled: bucket.enableEventbridge,
                    blockPublicAccess: aws_s3_1.BlockPublicAccess.BLOCK_ALL,
                    versioned: true,
                    removalPolicy: aws_cdk_lib_1.RemovalPolicy.DESTROY,
                });
            }
        });
    }
}
exports.PrivateS3BucketsStack = PrivateS3BucketsStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiczMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJzMy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxtQ0FBb0M7QUFDcEMsNkNBQTRDO0FBQzVDLCtDQUFpRjtBQUtqRixNQUFhLHFCQUFzQixTQUFRLEdBQUcsQ0FBQyxLQUFLO0lBR2xELFlBQVksS0FBZ0IsRUFBRSxFQUFVLEVBQUUsS0FBa0M7UUFDMUUsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDeEIsSUFBSSxDQUFDLE1BQU0sR0FBRyxLQUFNLENBQUE7UUFFcEIsSUFBSSxDQUFDLGVBQWUsRUFBRSxDQUFBO0lBQ3hCLENBQUM7SUFFRCxlQUFlOztRQUNiLE1BQUEsSUFBSSxDQUFDLE1BQU0sQ0FBQyxTQUFTLDBDQUFFLE9BQU8sQ0FBQyxNQUFNLENBQUMsRUFBRTtZQUN0QyxJQUFJLE1BQU0sQ0FBQyxpQkFBaUIsRUFBRTtnQkFDNUIsTUFBTSxDQUFDLEdBQUcsSUFBSSxlQUFNLENBQUMsSUFBSSxFQUFFLE1BQU0sQ0FBQyxJQUFJLEVBQUU7b0JBQ3RDLFVBQVUsRUFBRSxNQUFNLENBQUMsSUFBSTtvQkFDdkIsVUFBVSxFQUFFLHlCQUFnQixDQUFDLFVBQVU7b0JBQ3ZDLFVBQVUsRUFBRSxJQUFJO29CQUNoQixnQkFBZ0IsRUFBRSxLQUFLO29CQUN2QixrQkFBa0IsRUFBRSxNQUFNLENBQUMsaUJBQWlCO29CQUM1QyxpQkFBaUIsRUFBRSwwQkFBaUIsQ0FBQyxTQUFTO29CQUM5QyxJQUFJLEVBQUUsTUFBTSxDQUFDLElBQUk7b0JBQ2pCLFNBQVMsRUFBRSxJQUFJO29CQUNmLGFBQWEsRUFBRSwyQkFBYSxDQUFDLE9BQU87aUJBQ3JDLENBQUMsQ0FBQzthQUNKO2lCQUFNO2dCQUNMLE1BQU0sQ0FBQyxHQUFHLElBQUksZUFBTSxDQUFDLElBQUksRUFBRSxNQUFNLENBQUMsSUFBSSxFQUFFO29CQUN0QyxVQUFVLEVBQUUsTUFBTSxDQUFDLElBQUk7b0JBQ3ZCLFVBQVUsRUFBRSx5QkFBZ0IsQ0FBQyxVQUFVO29CQUN2QyxVQUFVLEVBQUUsSUFBSTtvQkFDaEIsZ0JBQWdCLEVBQUUsS0FBSztvQkFDdkIsa0JBQWtCLEVBQUUsTUFBTSxDQUFDLGlCQUFpQjtvQkFDNUMsaUJBQWlCLEVBQUUsMEJBQWlCLENBQUMsU0FBUztvQkFDOUMsU0FBUyxFQUFFLElBQUk7b0JBQ2YsYUFBYSxFQUFFLDJCQUFhLENBQUMsT0FBTztpQkFDckMsQ0FBQyxDQUFDO2FBQ0o7UUFDSCxDQUFDLENBQUMsQ0FBQztJQUNMLENBQUM7Q0FDRjtBQXRDRCxzREFzQ0MiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgY2RrID0gcmVxdWlyZSgnYXdzLWNkay1saWInKTtcbmltcG9ydCB7IFJlbW92YWxQb2xpY3kgfSBmcm9tICdhd3MtY2RrLWxpYic7XG5pbXBvcnQgeyBCbG9ja1B1YmxpY0FjY2VzcywgQnVja2V0LCBCdWNrZXRFbmNyeXB0aW9uIH0gZnJvbSAnYXdzLWNkay1saWIvYXdzLXMzJztcbmltcG9ydCB7IENvbnN0cnVjdCB9IGZyb20gJ2NvbnN0cnVjdHMnO1xuaW1wb3J0IHsgUHJpdmF0ZVMzQnVja2V0c1N0YWNrUHJvcHMgfSBmcm9tICcuLi8uLi9pbnRlcmZhY2VzL2xpYi9zMy9pbnRlcmZhY2VzJztcblxuXG5leHBvcnQgY2xhc3MgUHJpdmF0ZVMzQnVja2V0c1N0YWNrIGV4dGVuZHMgY2RrLlN0YWNrIHtcbiAgY29uZmlnOiBQcml2YXRlUzNCdWNrZXRzU3RhY2tQcm9wcztcblxuICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nLCBwcm9wcz86IFByaXZhdGVTM0J1Y2tldHNTdGFja1Byb3BzKSB7XG4gICAgc3VwZXIoc2NvcGUsIGlkLCBwcm9wcyk7XG4gICAgdGhpcy5jb25maWcgPSBwcm9wcyFcblxuICAgIHRoaXMuY3JlYXRlUzNCdWNrZXRzKClcbiAgfVxuXG4gIGNyZWF0ZVMzQnVja2V0cygpOiB2b2lkIHtcbiAgICB0aGlzLmNvbmZpZy5zM0J1Y2tldHM/LmZvckVhY2goYnVja2V0ID0+IHtcbiAgICAgIGlmIChidWNrZXQuaXNQcml2YXRlV2l0aENvcnMpIHtcbiAgICAgICAgY29uc3QgYiA9IG5ldyBCdWNrZXQodGhpcywgYnVja2V0Lm5hbWUsIHtcbiAgICAgICAgICBidWNrZXROYW1lOiBidWNrZXQubmFtZSxcbiAgICAgICAgICBlbmNyeXB0aW9uOiBCdWNrZXRFbmNyeXB0aW9uLlMzX01BTkFHRUQsXG4gICAgICAgICAgZW5mb3JjZVNTTDogdHJ1ZSxcbiAgICAgICAgICBwdWJsaWNSZWFkQWNjZXNzOiBmYWxzZSxcbiAgICAgICAgICBldmVudEJyaWRnZUVuYWJsZWQ6IGJ1Y2tldC5lbmFibGVFdmVudGJyaWRnZSxcbiAgICAgICAgICBibG9ja1B1YmxpY0FjY2VzczogQmxvY2tQdWJsaWNBY2Nlc3MuQkxPQ0tfQUxMLFxuICAgICAgICAgIGNvcnM6IGJ1Y2tldC5jb3JzLFxuICAgICAgICAgIHZlcnNpb25lZDogdHJ1ZSxcbiAgICAgICAgICByZW1vdmFsUG9saWN5OiBSZW1vdmFsUG9saWN5LkRFU1RST1ksXG4gICAgICAgIH0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29uc3QgYiA9IG5ldyBCdWNrZXQodGhpcywgYnVja2V0Lm5hbWUsIHtcbiAgICAgICAgICBidWNrZXROYW1lOiBidWNrZXQubmFtZSxcbiAgICAgICAgICBlbmNyeXB0aW9uOiBCdWNrZXRFbmNyeXB0aW9uLlMzX01BTkFHRUQsXG4gICAgICAgICAgZW5mb3JjZVNTTDogdHJ1ZSxcbiAgICAgICAgICBwdWJsaWNSZWFkQWNjZXNzOiBmYWxzZSxcbiAgICAgICAgICBldmVudEJyaWRnZUVuYWJsZWQ6IGJ1Y2tldC5lbmFibGVFdmVudGJyaWRnZSxcbiAgICAgICAgICBibG9ja1B1YmxpY0FjY2VzczogQmxvY2tQdWJsaWNBY2Nlc3MuQkxPQ0tfQUxMLFxuICAgICAgICAgIHZlcnNpb25lZDogdHJ1ZSxcbiAgICAgICAgICByZW1vdmFsUG9saWN5OiBSZW1vdmFsUG9saWN5LkRFU1RST1ksXG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG59XG4iXX0=
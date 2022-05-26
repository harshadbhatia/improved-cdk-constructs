import { v1 } from "@datadog/datadog-api-client";
export declare function setupIntegration(apiKey: string, appKey: string): Promise<any>;
export declare function configureLogCollection(lambdaArn: string, services?: string[], secretKey?: string): Promise<void>;
export declare function createAWSLambdaARN(apiInstance: v1.AWSLogsIntegrationApi, lambdaArn: string): Promise<void>;
export declare function enableAWSLogServices(apiInstance: v1.AWSLogsIntegrationApi, services?: string[]): Promise<void>;

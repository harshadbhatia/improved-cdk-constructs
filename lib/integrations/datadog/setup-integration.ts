import { CreateSecretCommand, GetSecretValueCommand, SecretsManagerClient, UpdateSecretCommand } from "@aws-sdk/client-secrets-manager";
import { client, v1 } from "@datadog/datadog-api-client";
import { exit } from "process";

const API_KEY_SECRET = '/account/datadog/api-key'
const APP_KEY_SECRET = '/account/datadog/app-key'
const EXTERNAL_ID_SECRET = '/account/datadog/external-id'


export async function setupDatadogIntegration(apiKey: string, appKey: string) {
    return await createAWSIntegration(apiKey, appKey)
        .then((externalId) => {
            if (externalId) {
                createExternalIDSecret(externalId)
                return externalId
            } else {
                // Could be an update // we get external id
                const s = getSecretValue(EXTERNAL_ID_SECRET, `[Datadog] Unable to get secret at ${EXTERNAL_ID_SECRET}`)
                return s
            }

        }).catch((err) => console.error("[Datadog] Unable to create AWS Integration", err))


}


async function createExternalIDSecret(externalId: string) {
    const client = getSecretManagerClient()
    const cmd = new CreateSecretCommand({
        Name: EXTERNAL_ID_SECRET,
        Description: 'External ID associated with Datadog AWS Integration',
        SecretString: `{"id": "${externalId}"}`,
    });

    await client.send(cmd).then((data) => {
        console.log("[Datadog] External ID secret created")
        return 'OK'
    }).catch((err) => {
        // If the secret already exists, we update it
        const cm = new UpdateSecretCommand({
            SecretId: EXTERNAL_ID_SECRET,
            Description: 'External ID associated with Datadog AWS Integration',
            SecretString: `{"id": "${externalId}"}`,
        });
        const c = getSecretManagerClient()
        c.send(cm).then((data) => {
            console.log("[Datadog] External ID secret updated")
            return 'OK'
        }).catch((err) => {
            console.error(`[Datadog] Unable to update secret at location /account/datadog/external-id`, err)
            exit(1)
        });
        console.error(`[Datadog] Unable to create secret at location /account/datadog/external-id`, err)
        exit(1)
    });

}

function getSecretManagerClient(): SecretsManagerClient {
    const client = new SecretsManagerClient({ region: process.env.CDK_DEFAULT_REGION })
    return client
}

async function getAPIKey(apiKey: string, appKey: string) {
    const apiKeyVal = await getSecretValue(
        apiKey,
        `[Datadog] Unable to find secret ${apiKey}. Ensure only value is stored in secret`
    )
    const appKeyVal = await getSecretValue(
        appKey,
        `[Datadog] Unable to find secret ${appKey}. Ensure only value is stored in secret`
    )

    return [apiKeyVal, appKeyVal]
}

async function getSecretValue(secretId: string, errorString: string) {
    const client = getSecretManagerClient()
    const cmd = new GetSecretValueCommand({ SecretId: secretId })

    return await client.send(cmd).then((data: any) => {
        return data.SecretString!
    })
}

function createAPIInstance(apiKey: string, appKey: string): v1.AWSIntegrationApi {
    const configuration = client.createConfiguration({
        authMethods: {
            apiKeyAuth: apiKey,
            appKeyAuth: appKey
        }
    });
    const apiInstance = new v1.AWSIntegrationApi(configuration);

    return apiInstance
}

async function createAWSIntegration(apiKey: string, appKey: string): Promise<any> {
    /**
     * Get all AWS tag filters returns "OK" response
     */

    return await getAPIKey(apiKey, appKey)
        .then(([apiKeyValue, appKeyValue]) => {
            console.log('[Datadog] Read secrets')
            const apiInstance = createAPIInstance(apiKeyValue, appKeyValue)
            return updateAWSAPIIntegration(apiInstance)
                .then((data: any) => {
                    console.log("[Datadog] Updated account successfully")
                    return
                }).catch((error: any) => {
                    console.log("[Datadog] Failed to update configuration, trying to create it instead")
                    return createAWSAPIIntegration(apiInstance)
                        .then((data: v1.AWSAccountCreateResponse) => { return data.externalId })
                        .catch((error: any) => { console.error(error); exit(1) });
                });

        }).catch((err) => {
            console.error("[Datadog] Failed to get APP Key", err)
            exit(1)
        })

}

function createAWSAPIIntegration(apiInstance: v1.AWSIntegrationApi): Promise<any> {
    const params: v1.AWSIntegrationApiCreateAWSAccountRequest = {
        body: {
            accountId: process.env.CDK_DEFAULT_ACCOUNT!,
            filterTags: [`account_name:${process.env.ACCOUNT_NAME}`],
            hostTags: [`account_name:${process.env.ACCOUNT_NAME}`],
            metricsCollectionEnabled: true,
            resourceCollectionEnabled: true,
            cspmResourceCollectionEnabled: true,
            // excludedRegions: ["us-east-1", "us-west-2"],
            roleName: "DatadogAWSIntegrationRole",
            accountSpecificNamespaceRules: {
                lambda: true
            }
        },
    };

    return apiInstance
        .createAWSAccount(params)

}

async function updateAWSAPIIntegration(apiInstance: v1.AWSIntegrationApi): Promise<any> {
    const params: v1.AWSIntegrationApiUpdateAWSAccountRequest = {
        body: {
            accountId: process.env.CDK_DEFAULT_ACCOUNT!,
            filterTags: [`account_name:${process.env.ACCOUNT_NAME}`],
            hostTags: [`account_name:${process.env.ACCOUNT_NAME}`],
            metricsCollectionEnabled: true,
            resourceCollectionEnabled: true,
        },
        accountId: process.env.CDK_DEFAULT_ACCOUNT!,
        roleName: "DatadogAWSIntegrationRole",
    };

    return await apiInstance
        .updateAWSAccount(params)
}

// Deprecated ?
export async function configureLogCollection(lambdaArn: string, services?: string[], secretKey?: string) {
    // const secret = await getAPIKey(API_KEY_SECRET, APP_KEY_SECRET)
    const configuration = client.createConfiguration({
        authMethods: {
            apiKeyAuth: API_KEY_SECRET,
            appKeyAuth: APP_KEY_SECRET
        }
    });
    // This is created after integration is created, along with forwarder stack.

    await createAWSLambdaARN(new v1.AWSLogsIntegrationApi(configuration), lambdaArn)
    await enableAWSLogServices(new v1.AWSLogsIntegrationApi(configuration), services)


}

export async function createAWSLambdaARN(apiInstance: v1.AWSLogsIntegrationApi, lambdaArn: string) {

    const params: v1.AWSLogsIntegrationApiCreateAWSLambdaARNRequest = {
        body: {
            accountId: process.env.CDK_DEFAULT_ACCOUNT!,
            lambdaArn: lambdaArn,
        },
    };

    await apiInstance
        .createAWSLambdaARN(params)
        .then((data: any) => console.log("[Datadog] Lambda Integration for logs created"))
        .catch((error: any) => {
            console.error(error)
            exit(1)
        });
}

export async function enableAWSLogServices(apiInstance: v1.AWSLogsIntegrationApi, services = ["lambda"]) {

    const params: v1.AWSLogsIntegrationApiEnableAWSLogServicesRequest = {
        body: {
            accountId: process.env.CDK_DEFAULT_ACCOUNT!,
            services: services
        },
    };

    await apiInstance
        .enableAWSLogServices(params)
        .then((data: any) => console.log(`[Datadog] Enabled services for ${services}`))
        .catch((error: any) => { console.error(error); exit(1) });
}

import { DefaultStackSynthesizer, StackProps } from "aws-cdk-lib";
import { Bucket } from "aws-cdk-lib/aws-s3";

type DatadogPermissionsLevel = "Full" | "Core";

export interface DatadogAWSIntegrationStackProps extends StackProps {

  readonly apiKeySecret: string;
  readonly externalId: string;

  /**
   * Define your Datadog Site to send data to.
   * For the Datadog EU site, set to datadoghq.eu
   *
   * @default datadoghq.com
   */
  readonly site?: string;

  /**
   * Customize the name of IAM role for Datadog AWS integration
   *
   * @default DatadogIntegrationRole
   */
  readonly iamRoleName?: string;

  /**
   * Customize the permission level for the Datadog IAM role.
   * Select "Core" to only grant Datadog read-only permissions (not recommended).
   *
   * @default Full
   */
  readonly permissions?: DatadogPermissionsLevel;

  /**
   * The Datadog Forwarder Lambda function name. DO NOT change when updating an existing
   * CloudFormation stack, otherwise the current forwarder function will be replaced and
   * all the triggers will be lost.
   *
   * @default DatadogForwarder
   */
  readonly forwarderName?: string;

  /**
   * Specify a version of the forwarder to use. See
   * https://github.com/DataDog/datadog-serverless-functions/releases. Pass this
   * parameter as a version string, e.g., '3.9.0'
   *
   * @default latest
   */
  readonly forwarderVersion?: string;

  /**
   * If you already deployed a stack using this template, set this parameter to false
   * to skip the installation of the DatadogPolicy Macro again
   *
   * @default true
   */
  readonly installDatadogPolicyMacro?: boolean;

  /**
   * S3 paths to store log archives for log rehydration.
   * Permissions will be automatically added to the Datadog integration IAM role.
   * https://docs.datadoghq.com/logs/archives/rehydrating/?tab=awss
   */
  readonly logArchives?: Bucket[] | undefined;

  /**
   * S3 buckets for Datadog CloudTrail integration. Permissions will be automatically
   * added to the Datadog integration IAM role.
   * https://docs.datadoghq.com/integrations/amazon_cloudtrail
   */
  readonly cloudTrails?: Bucket[] | undefined;

  /**
   * Additional parameters to pass through to the underlying Forwarder CloudFormation
   * template. Use this construct if you need to specify a template variable not
   * yet exposed through this library.
   *
   * See https://datadog-cloudformation-template.s3.amazonaws.com/aws/forwarder/latest.yaml
   * for the latest parameters.
   */
  readonly additionalForwarderParams?: {
    [key: string]: string;
  };

  /**
   * Additional parameters to pass through to the underlying Integration Role CloudFormation
   * template. Use this construct if you need to specify a template variable not
   * yet exposed through this library.
   *
   * See https://datadog-cloudformation-template.s3.amazonaws.com/aws/datadog_integration_role.yaml
   * for the latest parameters.
   */
  readonly additionalIntegrationRoleParams?: {
    [key: string]: string;
  };

  // If we want datadog operator installed


}

// Stack config --> A + Defaults

export interface DatadogIntegrationRoleProps extends StackProps {
  externalId: string
  permissionsBoundary?: string
}

// Used for Datadog + CDK stack bundled together
export interface DatadogStackProps extends StackProps {
  apiKeySecret: string
  nodeLayerVersion?: number
  pythonLayerVersion?: number
  enableDatadogTracing?: boolean
  flushMetricsToLogs?: boolean
  site?: string
  datadogEnv?: string
  service?: string
  datadogTags?: string
  apiKeySecretArn?: string
}


export interface DatadogOperatorStackProps extends StackProps {
  clusterName: string
  kubectlRoleArn: string
  openIdConnectProviderArn: string

  operatorSynthesizer?: DefaultStackSynthesizer
  useSecretFromCSI: boolean

  apiKeySecret: string;
  appKeySecret: string;

  datadogK8ExistingSecret?: string
  permissionBoundaryRole?: string // Nested helm stack


}

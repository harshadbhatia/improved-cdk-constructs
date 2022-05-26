import { DatadogAWSIntegrationStackProps } from "../../../interfaces/lib/integrations/datadog/intefaces"


// Create a type with required values for default
type DatadogIntegrationDefaults = Required<Pick<DatadogAWSIntegrationStackProps, | "site"
  | "iamRoleName"
  | "permissions"
  | "forwarderName"
  | "forwarderVersion"
  >
>

const CONFIG_DEFAULTS: DatadogIntegrationDefaults = {
  site: "datadoghq.com",
  iamRoleName: "DatadogAWSIntegrationRole",
  permissions: "Full",
  forwarderName: "DatadogForwarder",
  forwarderVersion: "latest",
}

// We create a type with defaults as required
export type DatadogIntegrationStackPropsWithDefaults = DatadogIntegrationDefaults & DatadogAWSIntegrationStackProps

export function applyDataDogDefaultsToConfig(config: DatadogAWSIntegrationStackProps): DatadogIntegrationStackPropsWithDefaults {
  return Object.assign({}, CONFIG_DEFAULTS, config)
}
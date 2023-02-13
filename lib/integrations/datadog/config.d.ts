import { DatadogAWSIntegrationStackProps } from "../../../interfaces/lib/integrations/datadog/intefaces";
type DatadogIntegrationDefaults = Required<Pick<DatadogAWSIntegrationStackProps, "site" | "iamRoleName" | "permissions" | "forwarderName" | "forwarderVersion">>;
export type DatadogIntegrationStackPropsWithDefaults = DatadogIntegrationDefaults & DatadogAWSIntegrationStackProps;
export declare function applyDataDogDefaultsToConfig(config: DatadogAWSIntegrationStackProps): DatadogIntegrationStackPropsWithDefaults;
export {};

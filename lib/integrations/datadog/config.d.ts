import { DatadogAWSIntegrationStackProps } from "../../../interfaces/lib/integrations/datadog/intefaces";
declare type DatadogIntegrationDefaults = Required<Pick<DatadogAWSIntegrationStackProps, "site" | "iamRoleName" | "permissions" | "forwarderName" | "forwarderVersion">>;
export declare type DatadogIntegrationStackPropsWithDefaults = DatadogIntegrationDefaults & DatadogAWSIntegrationStackProps;
export declare function applyDataDogDefaultsToConfig(config: DatadogAWSIntegrationStackProps): DatadogIntegrationStackPropsWithDefaults;
export {};

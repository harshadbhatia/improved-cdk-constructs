export interface Route53ParentConfig {
    stackName: string;
    stackDescription: string;
    domainNames: string[];
    crossAccountDelagationIds: string[];
    acms?: string[];
    cdnAcms?: cdnACM[];
    domainRecords?: DomainRecords[];
}
export interface DomainRecords {
    domain: string;
    mxRecords?: MXRecordInput[];
}
export interface MXRecordValue {
    priority: number;
    pointsTo: string;
}
export interface MXRecordInput {
    comment: string;
    recordName: string;
    values: MXRecordValue[];
    ttl: number;
}
export interface Route53SubZoneConfig {
    stackName: string;
    stackDescription: string;
    subZone: SubZoneConfig[];
    acms?: string[];
    cdnAcms?: cdnACM[];
}
export interface cdnACM {
    domain: string;
    zoneDomain?: string;
    parentHostedZoneName?: string;
    parentHostedZoneId?: string;
    alternativeDomains: string[];
}
export interface SubZoneConfig {
    name: string;
    config: SubZoneItem[];
    enabled: boolean;
}
export interface SubZoneItem {
    domainName: string;
    parentAccountId: string;
    parentRoleName: string;
    parentHostedZoneId: string;
}

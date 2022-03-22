export interface Route53ParentConfig {
    stackName: string;
    stackDescription: string;

    domainNames: string[];

    crossAccountDelagationIds: number[]

    acms?: string[];

    cdnAcms?: string[];

    domainRecords?: DomainRecords[]
    
}

export interface DomainRecords {
    domain: string
    mxRecords?: MXRecordInput[]
}

export interface MXRecordValue {
    priority: number
    pointsTo: string  
}

export interface MXRecordInput {
    comment: string
    recordName: string
    values: MXRecordValue[] 
    ttl: number
}
 
export interface Route53SubZoneConfig {
    stackName: string;
    stackDescription: string;

    subZone: SubZoneConfig[]
    acms?: string[];

    cdnAcms?: string[];

}

export interface SubZoneConfig {
    name: string
    config: SubZoneItem[];
    enabled: boolean
}

export interface SubZoneItem {
    domainName: string;
    parentAccountId: string;
    parentRoleName: string;
    parentHostedZoneId: string;
}
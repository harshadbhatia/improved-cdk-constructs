export interface SecretsManagerStackCfg {
    stackName: string
    stackDescription: string

    secrets: Secret[]
}


export interface Secret {
    name: string
    description: string
    secretType: string // Generated or simple
    secretStringTemplate?: any // Json value will be stringified
    generateStringKey?: string
}
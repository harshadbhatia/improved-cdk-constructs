import { cdk } from "../../../deps.ts";


export interface ECRStackProps extends cdk.StackProps {
    stackName: string;
    stackDescription: string;

    repos: ECRRepo[]

    existingRepos: ECRRepo[]
}

export interface ECRRepo {
    repositoryName: string;
    rules?: ECRRule[];
    lambdaContainer?: boolean;
    allowAccountAccess: string[];
}

export interface ECRRule {
    tagPrefix: string[];
    maxAge: number;
    maxImageCount: number;
}
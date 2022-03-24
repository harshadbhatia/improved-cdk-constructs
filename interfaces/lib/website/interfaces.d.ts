export interface WebsiteConfig {
    stackName: string;
    stackDescription: string;
    website: WebsiteStackProps;
}
export interface WebsiteStackProps {
    domain: string;
    bucket: {
        bucketName: string;
    };
    ignorePrefix?: string;
}

import { Bucket } from 'aws-cdk-lib/aws-s3';
import { AxiosResponse } from 'axios';
export declare function convertStringToArray(input: string): string[];
export declare function getAccountNameFromFilename(filename: string): string;
export declare function fetchAPI(url: string): Promise<AxiosResponse<any, any>>;
export declare function bucketsToString(buckets?: Bucket[]): string;

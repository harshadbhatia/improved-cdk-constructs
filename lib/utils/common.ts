import { Bucket } from 'aws-cdk-lib/aws-s3';
import axios, { AxiosResponse } from 'axios';

export function convertStringToArray(input: string): string[] {
  return input.split(",")
}

export function getAccountNameFromFilename(filename: string): string {

  return filename.split('/').slice(-1)[0].split('.')[0]
}

export function fetchAPI(url: string): Promise<AxiosResponse<any, any>> {
  return axios.get(url).then((response) => {
    return response.data
  }).catch((error) => {
    console.log(error)
  })
}


export function bucketsToString(buckets?: Bucket[]): string {
  if (!buckets) {
    return "";
  }

  return buckets.map((bucket) => bucket.bucketName).join(",");
}
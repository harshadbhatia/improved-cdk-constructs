import { Bucket } from "aws-cdk-lib/aws-s3";

export function bucketsToString(buckets?: Bucket[]): string {
    if (!buckets) {
        return "";
    }

    return buckets.map((bucket) => bucket.bucketName).join(",");
}
import "server-only";
import { S3Client } from "@aws-sdk/client-s3";
export const bucket = process.env.AWS_S3_BUCKET || "bucket";
export const storageConfigured = [
  "AWS_ENDPOINT_URL_S3",
  "AWS_ACCESS_KEY_ID",
  "AWS_SECRET_ACCESS_KEY",
  "AWS_REGION",
].every((k) => Boolean(process.env[k]));
let client: S3Client;
export function s3() {
  if (!storageConfigured)
    throw new Error("Penyimpanan foto belum dikonfigurasi.");
  return (client ??= new S3Client({
    endpoint: process.env.AWS_ENDPOINT_URL_S3,
    region: process.env.AWS_REGION,
    forcePathStyle: true,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  }));
}

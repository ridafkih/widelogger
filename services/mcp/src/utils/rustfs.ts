import {
  S3Client,
  CreateBucketCommand,
  PutBucketPolicyCommand,
  HeadBucketCommand,
} from "@aws-sdk/client-s3";
import { config } from "../config/environment";

function createS3Client(): S3Client {
  return new S3Client({
    endpoint: config.rustfs.endpoint,
    region: "us-east-1",
    credentials: {
      accessKeyId: config.rustfs.accessKey,
      secretAccessKey: config.rustfs.secretKey,
    },
    forcePathStyle: true,
  });
}

export async function initializeBucket(): Promise<void> {
  const s3 = createS3Client();
  const bucket = config.rustfs.bucket;

  try {
    await s3.send(new HeadBucketCommand({ Bucket: bucket }));
    console.log(`[RustFS] Bucket "${bucket}" already exists`);
  } catch (error: unknown) {
    if (error && typeof error === "object" && "name" in error && error.name === "NotFound") {
      console.log(`[RustFS] Creating bucket "${bucket}"...`);
      await s3.send(new CreateBucketCommand({ Bucket: bucket }));
    } else {
      throw error;
    }
  }

  const policy = {
    Version: "2012-10-17",
    Statement: [
      {
        Effect: "Allow",
        Principal: "*",
        Action: ["s3:GetObject"],
        Resource: [`arn:aws:s3:::${bucket}/*`],
      },
    ],
  };

  await s3.send(
    new PutBucketPolicyCommand({
      Bucket: bucket,
      Policy: JSON.stringify(policy),
    }),
  );

  console.log(`[RustFS] Bucket "${bucket}" initialized with public read policy`);
}

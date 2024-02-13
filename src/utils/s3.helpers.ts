import { S3 } from 'aws-sdk';

export interface IS3UploadOptions {
  body: S3.Body;
  key: string;
}

export const s3 = new S3({
  region: process.env.AWS_REGION
});

const bucket = process.env.CHECKLY_STORAGE_BUCKET || '';

export const uploadToS3 = (options: IS3UploadOptions) =>
  s3
    .upload({
      Bucket: bucket,
      Body: options.body,
      Key: options.key,
      ACL: 'public-read'
    })
    .promise();

export const getObjectSize = (key: string) =>
  s3
    .headObject({ Bucket: bucket, Key: key })
    .promise()
    .then((res) => res.ContentLength);

export const getObject = async (key: string) => {
  const res = await s3
    .getObject({
      Bucket: bucket,
      Key: key
    })
    .promise();

  return res.Body as Buffer;
};

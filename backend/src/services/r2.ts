import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { env, isR2Ready } from '../config/env'
import { serviceUnavailable } from '../lib/errors'

export const UPLOAD_URL_TTL_SECONDS = 10 * 60

export async function presignPut(key: string, contentType: string, size: number) {
  const config = env()
  if (!isR2Ready(config)) throw serviceUnavailable('Media storage is not configured yet')
  const client = new S3Client({
    region: 'auto',
    endpoint: `https://${config.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: config.R2_ACCESS_KEY_ID as string,
      secretAccessKey: config.R2_SECRET_ACCESS_KEY as string,
    },
  })
  const command = new PutObjectCommand({
    Bucket: config.R2_BUCKET,
    Key: key,
    ContentType: contentType,
    ContentLength: size,
  })
  // Without these the URL accepts any type and size, e.g. an HTML page served from the bucket.
  const bound = new Set(['content-type', 'content-length'])
  const uploadUrl = await getSignedUrl(client, command, {
    expiresIn: UPLOAD_URL_TTL_SECONDS,
    signableHeaders: bound,
    unhoistableHeaders: bound,
  })
  return {
    upload_url: uploadUrl,
    public_url: `${(config.R2_PUBLIC_URL as string).replace(/\/$/, '')}/${key}`,
  }
}

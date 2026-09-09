import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { Upload } from '@aws-sdk/lib-storage'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { config } from '../config/index.js'
import crypto from 'crypto'

const s3Client = new S3Client({
  region: config.aws.region,
  credentials: {
    accessKeyId: config.aws.accessKeyId,
    secretAccessKey: config.aws.secretAccessKey,
  },
})

export interface UploadResult {
  success: boolean
  url?: string
  key?: string
  error?: string
}

export async function uploadFileToS3(
  file: Buffer,
  fileName: string,
  contentType: string,
  folder?: string
): Promise<UploadResult> {
  try {
    const extensions: Record<string, string> = { 'application/pdf': 'pdf', 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' }
    const extension = extensions[contentType]
    if (!extension) return { success: false, error: 'Unsupported file type' }
    // Never put a user-supplied filename into an object key.
    const key = `${folder || 'reports'}/${crypto.randomUUID()}.${extension}`

    const upload = new Upload({
      client: s3Client,
      params: {
        Bucket: config.aws.bucketName,
        Key: key,
        Body: file,
        ContentType: contentType,
        ContentDisposition: 'attachment',
      },
    })

    await upload.done()

    const url = `https://${config.aws.bucketName}.s3.${config.aws.region}.amazonaws.com/${key}`

    return { success: true, url, key }
  } catch (error) {
    console.error('S3 Upload Error:', error)
    return { success: false, error: 'Failed to upload file' }
  }
}

export async function getSignedDownloadUrl(key: string): Promise<string | null> {
  try {
    const command = new GetObjectCommand({
      Bucket: config.aws.bucketName,
      Key: key,
    })

    const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 })
    return url
  } catch (error) {
    console.error('S3 Signed URL Error:', error)
    return null
  }
}

export async function deleteFileFromS3(key: string): Promise<boolean> {
  try {
    const command = new DeleteObjectCommand({
      Bucket: config.aws.bucketName,
      Key: key,
    })

    await s3Client.send(command)
    return true
  } catch (error) {
    console.error('S3 Delete Error:', error)
    return false
  }
}

export function getPublicUrl(key: string): string {
  return `https://${config.aws.bucketName}.s3.${config.aws.region}.amazonaws.com/${key}`
}

export function getKeyFromUrl(url: string | null): string | null {
  if (!url) return null
  const bucketSubdomain = `${config.aws.bucketName}.s3.${config.aws.region}.amazonaws.com/`
  if (url.includes(bucketSubdomain)) {
    return url.split(bucketSubdomain)[1]
  }
  // Alternate format: s3.amazonaws.com/bucket/key
  const alternateDomain = `s3.${config.aws.region}.amazonaws.com/${config.aws.bucketName}/`
  if (url.includes(alternateDomain)) {
    return url.split(alternateDomain)[1]
  }
  return null
}

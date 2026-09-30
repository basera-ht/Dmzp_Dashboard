import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { Upload } from '@aws-sdk/lib-storage'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { config } from '../config/index.js'
import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const localUploadsDir = path.resolve(__dirname, '../../uploads')

const hasAwsCredentials = Boolean(
  config.aws.accessKeyId &&
  config.aws.secretAccessKey &&
  config.aws.accessKeyId.length > 5
)

export const s3Client = new S3Client({
  region: config.aws.region,
  credentials: {
    accessKeyId: config.aws.accessKeyId || 'placeholder',
    secretAccessKey: config.aws.secretAccessKey || 'placeholder',
  },
})

export interface UploadResult {
  success: boolean
  url?: string
  key?: string
  error?: string
}

async function saveLocally(file: Buffer, key: string): Promise<UploadResult> {
  try {
    const fullPath = path.join(localUploadsDir, key)
    await fs.promises.mkdir(path.dirname(fullPath), { recursive: true })
    await fs.promises.writeFile(fullPath, file)
    const normalizedKey = key.replace(/\\/g, '/')
    return { success: true, url: `/api/media/${normalizedKey}`, key: normalizedKey }
  } catch (err: any) {
    console.error('Local File Save Error:', err)
    return { success: false, error: 'Failed to save file locally' }
  }
}

export async function uploadFileToS3(
  file: Buffer,
  fileName: string,
  contentType: string,
  folder?: string
): Promise<UploadResult> {
  try {
    const extensions: Record<string, string> = {
      'application/pdf': 'pdf',
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
      'image/gif': 'gif',
    }
    const extension = extensions[contentType] || 'jpg'
    const key = `${folder || 'reports'}/${crypto.randomUUID()}.${extension}`

    // Always preserve local copy for instant streaming
    const localRes = await saveLocally(file, key)
    let s3Success = false

    if (hasAwsCredentials) {
      try {
        const upload = new Upload({
          client: s3Client,
          params: {
            Bucket: config.aws.bucketName,
            Key: key,
            Body: file,
            ContentType: contentType,
            ContentDisposition: 'inline',
          },
        })
        await upload.done()
        s3Success = true
      } catch (s3Err) {
        console.warn('S3 upload warning (local copy checked):', s3Err)
      }
    }

    if (!localRes.success && !s3Success) {
      return { success: false, error: 'Failed to upload file to local storage or S3' }
    }

    const normalizedKey = key.replace(/\\/g, '/')
    return { success: true, url: `/api/media/${normalizedKey}`, key: normalizedKey }
  } catch (error) {
    console.error('Upload Error:', error)
    return { success: false, error: 'Failed to upload file' }
  }
}

export async function getSignedDownloadUrl(key: string): Promise<string | null> {
  if (!hasAwsCredentials) {
    return `/api/media/${key.replace(/\\/g, '/')}`
  }
  try {
    const command = new GetObjectCommand({
      Bucket: config.aws.bucketName,
      Key: key,
    })
    return await getSignedUrl(s3Client, command, { expiresIn: 3600 })
  } catch (error) {
    console.error('S3 Signed URL Error:', error)
    return `/api/media/${key.replace(/\\/g, '/')}`
  }
}

export async function deleteFileFromS3(key: string): Promise<boolean> {
  try {
    if (hasAwsCredentials) {
      const command = new DeleteObjectCommand({
        Bucket: config.aws.bucketName,
        Key: key,
      })
      await s3Client.send(command)
    }
    // Also delete locally if present
    const localPath = path.join(localUploadsDir, key)
    if (fs.existsSync(localPath)) {
      await fs.promises.unlink(localPath)
    }
    return true
  } catch (error) {
    console.error('File Delete Error:', error)
    return false
  }
}

export function getPublicUrl(key: string): string {
  return `/api/media/${key.replace(/\\/g, '/')}`
}

export function getKeyFromUrl(url: string | null): string | null {
  if (!url) return null
  if (url.startsWith('/api/media/')) {
    return url.replace('/api/media/', '')
  }
  if (url.startsWith('/uploads/')) {
    return url.replace('/uploads/', '')
  }
  const bucketSubdomain = `${config.aws.bucketName}.s3.${config.aws.region}.amazonaws.com/`
  if (url.includes(bucketSubdomain)) {
    return url.split(bucketSubdomain)[1]
  }
  const alternateDomain = `s3.${config.aws.region}.amazonaws.com/${config.aws.bucketName}/`
  if (url.includes(alternateDomain)) {
    return url.split(alternateDomain)[1]
  }
  return null
}

import {
  DeleteObjectCommand,
  PutObjectCommand,
  type S3Client,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { env } from '@/env'
import { getStorageProvider } from './s3-client'
import {
  deleteCosFile,
  getCosFullKey,
  getCosPublicUrl,
  getCosSignedUrlForUpload,
} from './tencent-cos'

/**
 * Utility function to generate full object key with optional prefix
 * Supports multiple storage providers
 *
 * @param key - The base key/filename
 * @returns Full key with prefix if configured
 */
export function getFullKey(key: string): string {
  const provider = getStorageProvider()

  switch (provider) {
    case 'cloudflare-r2':
      return env.CLOUDFLARE_R2_PREFIX
        ? `${env.CLOUDFLARE_R2_PREFIX}/${key}`
        : key
    case 'tencent-cos':
      return getCosFullKey(key)
    case 'aws-s3':
      // AWS S3 prefix can be added here if needed
      return key
    default:
      return key
  }
}

/**
 * Get public url for the stored file
 * Supports multiple storage providers
 *
 * @param key the key of the file
 * @returns the public url
 */
export function getPublicUrl(key: string): string {
  const provider = getStorageProvider()

  switch (provider) {
    case 'cloudflare-r2':
      if (!env.CLOUDFLARE_R2_PUBLIC_URL) {
        throw new Error(
          'CLOUDFLARE_R2_PUBLIC_URL is not configured. Please set it in .env file.',
        )
      }
      return `${env.CLOUDFLARE_R2_PUBLIC_URL}/${env.CLOUDFLARE_R2_PREFIX ? `${env.CLOUDFLARE_R2_PREFIX}/${key}` : key}`

    case 'tencent-cos':
      return getCosPublicUrl(key)

    case 'aws-s3': {
      // AWS S3 public URL format
      const bucket = process.env.AWS_S3_BUCKET
      const region = process.env.AWS_REGION || 'us-east-1'
      if (!bucket) {
        throw new Error(
          'AWS_S3_BUCKET is not configured. Please set it in .env file.',
        )
      }
      return `https://${bucket}.s3.${region}.amazonaws.com/${key}`
    }

    default:
      throw new Error(
        `Unsupported storage provider: ${provider}. No public URL available.`,
      )
  }
}

/**
 * Get signed URL for upload
 * Supports multiple storage providers
 *
 * @param s3Client - The S3 compatible client
 * @param key - The key to upload the file to
 * @param contentType - The content type of the file
 * @returns The signed URL
 */
export async function getSignedUrlForUpload(
  s3Client: S3Client,
  key: string,
  contentType: string,
): Promise<string> {
  const provider = getStorageProvider()

  switch (provider) {
    case 'tencent-cos':
      return getCosSignedUrlForUpload(s3Client, key, contentType)

    default:
      return getR2SignedUrlForUpload(s3Client, key, contentType)
  }
}

/**
 * Get signed URL for Cloudflare R2 upload
 */
async function getR2SignedUrlForUpload(
  s3Client: S3Client,
  key: string,
  contentType: string,
): Promise<string> {
  const fullKey = env.CLOUDFLARE_R2_PREFIX
    ? `${env.CLOUDFLARE_R2_PREFIX}/${key}`
    : key

  const command = new PutObjectCommand({
    Bucket: env.CLOUDFLARE_R2_BUCKET,
    Key: fullKey,
    ContentType: contentType,
  })

  try {
    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 })
    return signedUrl
  } catch (error) {
    console.error('Error generating signed URL:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      errorType: error instanceof Error ? error.constructor.name : typeof error,
      bucket: env.CLOUDFLARE_R2_BUCKET,
      endpoint: env.CLOUDFLARE_R2_ENDPOINT,
    })

    // Provide more helpful error messages
    if (error instanceof Error) {
      if (
        error.message.includes('Unable to connect') ||
        error.message.includes('ENOTFOUND')
      ) {
        throw new Error(
          `Cannot connect to Cloudflare R2 endpoint: ${env.CLOUDFLARE_R2_ENDPOINT}\n` +
            'Please verify:\n' +
            '1. Endpoint URL is correct (format: https://<account-id>.r2.cloudflarestorage.com)\n' +
            '2. Server has internet access\n' +
            '3. Network/firewall allows connections to Cloudflare',
        )
      }
      if (error.message.includes('InvalidAccessKeyId')) {
        throw new Error(
          'Invalid Cloudflare R2 Access Key ID. Please check CLOUDFLARE_R2_ACCESS_KEY_ID in .env',
        )
      }
      if (error.message.includes('SignatureDoesNotMatch')) {
        throw new Error(
          'Invalid Cloudflare R2 Secret Access Key. Please check CLOUDFLARE_R2_SECRET_ACCESS_KEY in .env',
        )
      }
      if (error.message.includes('NoSuchBucket')) {
        throw new Error(
          `Bucket "${env.CLOUDFLARE_R2_BUCKET}" not found. Please check CLOUDFLARE_R2_BUCKET in .env`,
        )
      }
    }

    throw error
  }
}

/**
 * Delete file from storage
 * Supports multiple storage providers
 *
 * @param s3Client - The S3 compatible client
 * @param key - The key to delete the file
 * @returns The response from the delete
 */
export async function deleteFile(s3Client: S3Client, key: string) {
  const provider = getStorageProvider()

  switch (provider) {
    case 'tencent-cos':
      return deleteCosFile(s3Client, key)

    default:
      return deleteR2File(s3Client, key)
  }
}

/**
 * Delete file from Cloudflare R2
 */
async function deleteR2File(s3Client: S3Client, key: string) {
  const fullKey = env.CLOUDFLARE_R2_PREFIX
    ? `${env.CLOUDFLARE_R2_PREFIX}/${key}`
    : key

  const command = new DeleteObjectCommand({
    Bucket: env.CLOUDFLARE_R2_BUCKET,
    Key: fullKey,
  })

  try {
    const response = await s3Client.send(command)
    return response
  } catch (error) {
    console.error('Error deleting file:', error)
    throw error
  }
}

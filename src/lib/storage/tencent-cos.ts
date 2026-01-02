import {
  DeleteObjectCommand,
  PutObjectCommand,
  type S3Client,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { env } from '@/env'

/**
 * Utility function to generate full object key with optional prefix for Tencent COS
 *
 * @param key - The base key/filename
 * @returns Full key with prefix if configured, otherwise returns the original key
 */
export function getCosFullKey(key: string): string {
  return env.TENCENT_COS_PREFIX ? `${env.TENCENT_COS_PREFIX}/${key}` : key
}

/**
 * Get public url for Tencent COS
 * @param key the key of the file
 * @returns the public url
 */
export function getCosPublicUrl(key: string): string {
  if (!env.TENCENT_COS_PUBLIC_URL) {
    throw new Error(
      'TENCENT_COS_PUBLIC_URL is not configured. Please set it in .env file.',
    )
  }
  return `${env.TENCENT_COS_PUBLIC_URL}/${getCosFullKey(key)}`
}

/**
 * Get signed URL for upload to Tencent COS
 *
 * @param s3Client - The S3 compatible client
 * @param key - The key to upload the file to
 * @param contentType - The content type of the file
 * @returns The signed URL
 */
export async function getCosSignedUrlForUpload(
  s3Client: S3Client,
  key: string,
  contentType: string,
): Promise<string> {
  if (!env.TENCENT_COS_BUCKET) {
    throw new Error(
      'TENCENT_COS_BUCKET is not configured. Please set it in .env file.',
    )
  }

  const command = new PutObjectCommand({
    Bucket: env.TENCENT_COS_BUCKET,
    Key: getCosFullKey(key),
    ContentType: contentType,
  })

  try {
    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 })
    return signedUrl
  } catch (error) {
    console.error('Error generating signed URL for Tencent COS:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      errorType: error instanceof Error ? error.constructor.name : typeof error,
      bucket: env.TENCENT_COS_BUCKET,
      region: env.TENCENT_COS_REGION,
    })

    // Provide more helpful error messages
    if (error instanceof Error) {
      if (
        error.message.includes('Unable to connect') ||
        error.message.includes('ENOTFOUND')
      ) {
        throw new Error(
          `Cannot connect to Tencent COS endpoint.\n` +
            'Please verify:\n' +
            '1. Bucket name and region are correct\n' +
            '2. Server has internet access\n' +
            '3. Network/firewall allows connections to Tencent Cloud',
        )
      }
      if (
        error.message.includes('InvalidAccessKeyId') ||
        error.message.includes('SecretId')
      ) {
        throw new Error(
          'Invalid Tencent COS Secret ID. Please check TENCENT_COS_SECRET_ID in .env file',
        )
      }
      if (
        error.message.includes('SignatureDoesNotMatch') ||
        error.message.includes('SecretKey')
      ) {
        throw new Error(
          'Invalid Tencent COS Secret Key. Please check TENCENT_COS_SECRET_KEY in .env file',
        )
      }
      if (error.message.includes('NoSuchBucket')) {
        throw new Error(
          `Bucket "${env.TENCENT_COS_BUCKET}" not found. Please check TENCENT_COS_BUCKET in .env file`,
        )
      }
    }

    throw error
  }
}

/**
 * Delete file from Tencent COS
 *
 * @param s3Client - The S3 compatible client
 * @param key - The key to delete the file
 * @returns The response from the delete
 */
export async function deleteCosFile(s3Client: S3Client, key: string) {
  if (!env.TENCENT_COS_BUCKET) {
    throw new Error(
      'TENCENT_COS_BUCKET is not configured. Please set it in .env file.',
    )
  }

  const command = new DeleteObjectCommand({
    Bucket: env.TENCENT_COS_BUCKET,
    Key: getCosFullKey(key),
  })

  try {
    const response = await s3Client.send(command)
    return response
  } catch (error) {
    console.error('Error deleting file from Tencent COS:', error)
    throw error
  }
}

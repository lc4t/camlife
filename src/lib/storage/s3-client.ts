import 'server-only'

import { S3Client } from '@aws-sdk/client-s3'
import { env } from '@/env'

/**
 * S3-compatible client, only used in server side
 * Supports multiple storage providers: Cloudflare R2, Tencent COS, AWS S3
 * Lazy initialization to avoid errors when configuration is missing
 */
let _s3Client: S3Client | null = null

/**
 * Get the storage provider type
 */
export function getStorageProvider(): string {
  return env.STORAGE_PROVIDER || 'cloudflare-r2'
}

/**
 * Get S3-compatible client for the configured storage provider
 * Supports: cloudflare-r2, tencent-cos, aws-s3
 */
export function getS3Client(): S3Client {
  if (!_s3Client) {
    const provider = getStorageProvider()

    switch (provider) {
      case 'cloudflare-r2':
        _s3Client = createCloudflareR2Client()
        break
      case 'tencent-cos':
        _s3Client = createTencentCosClient()
        break
      case 'aws-s3':
        _s3Client = createAwsS3Client()
        break
      default:
        throw new Error(
          `Unsupported storage provider: ${provider}. ` +
            'Supported providers: cloudflare-r2, tencent-cos, aws-s3',
        )
    }
  }
  return _s3Client
}

/**
 * Create Cloudflare R2 client
 */
function createCloudflareR2Client(): S3Client {
  if (
    !env.CLOUDFLARE_R2_ENDPOINT ||
    !env.CLOUDFLARE_R2_BUCKET ||
    !env.CLOUDFLARE_R2_ACCESS_KEY_ID ||
    !env.CLOUDFLARE_R2_SECRET_ACCESS_KEY
  ) {
    throw new Error(
      'Cloudflare R2 configuration is incomplete. Please set:\n' +
        '- CLOUDFLARE_R2_ENDPOINT\n' +
        '- CLOUDFLARE_R2_BUCKET\n' +
        '- CLOUDFLARE_R2_ACCESS_KEY_ID\n' +
        '- CLOUDFLARE_R2_SECRET_ACCESS_KEY\n' +
        '\nCheck your .env file for these settings.',
    )
  }

  return new S3Client({
    region: env.CLOUDFLARE_R2_REGION || 'auto',
    endpoint: env.CLOUDFLARE_R2_ENDPOINT,
    credentials: {
      accessKeyId: env.CLOUDFLARE_R2_ACCESS_KEY_ID,
      secretAccessKey: env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
    },
    // Force path style for Cloudflare R2 compatibility
    forcePathStyle: true,
  })
}

/**
 * Create Tencent Cloud COS client
 * COS is S3-compatible: https://cloud.tencent.com/document/product/436/37421
 */
function createTencentCosClient(): S3Client {
  if (
    !env.TENCENT_COS_SECRET_ID ||
    !env.TENCENT_COS_SECRET_KEY ||
    !env.TENCENT_COS_BUCKET ||
    !env.TENCENT_COS_REGION
  ) {
    throw new Error(
      'Tencent COS configuration is incomplete. Please set:\n' +
        '- TENCENT_COS_SECRET_ID\n' +
        '- TENCENT_COS_SECRET_KEY\n' +
        '- TENCENT_COS_BUCKET\n' +
        '- TENCENT_COS_REGION\n' +
        '\nCheck your .env file for these settings.',
    )
  }

  // Tencent COS S3-compatible endpoint format:
  // https://cos.<region>.myqcloud.com
  const endpoint = `https://cos.${env.TENCENT_COS_REGION}.myqcloud.com`

  return new S3Client({
    region: env.TENCENT_COS_REGION,
    endpoint,
    credentials: {
      accessKeyId: env.TENCENT_COS_SECRET_ID,
      secretAccessKey: env.TENCENT_COS_SECRET_KEY,
    },
    // Tencent COS supports both path-style and virtual-hosted style
    // Using path style for consistency
    forcePathStyle: true,
  })
}

/**
 * Create AWS S3 client
 */
function createAwsS3Client(): S3Client {
  // AWS S3 uses default credentials chain
  // Can be configured via environment variables AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY
  // or IAM roles when running on AWS infrastructure
  return new S3Client({
    region: process.env.AWS_REGION || 'us-east-1',
  })
}

/**
 * Reset the client (useful for testing or when configuration changes)
 */
export function resetS3Client(): void {
  _s3Client = null
}

/**
 * @deprecated Use getS3Client() instead for better error handling
 */
export function getS3ClientDirect() {
  return getS3Client()
}

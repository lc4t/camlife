import 'server-only'

import { S3Client } from '@aws-sdk/client-s3'
import { env } from '@/env'

/**
 * AWS S3 client, only used in server side
 * Lazy initialization to avoid errors when configuration is missing
 */
let _s3Client: S3Client | null = null

export function getS3Client(): S3Client {
  if (!_s3Client) {
    // Validate required configuration
    if (
      !env.CLOUDFLARE_R2_ENDPOINT ||
      !env.CLOUDFLARE_R2_BUCKET ||
      !env.CLOUDFLARE_R2_ACCESS_KEY_ID ||
      !env.CLOUDFLARE_R2_SECRET_ACCESS_KEY
    ) {
      throw new Error(
        'Storage configuration is incomplete. Please set the following environment variables:\n' +
          '- CLOUDFLARE_R2_ENDPOINT\n' +
          '- CLOUDFLARE_R2_BUCKET\n' +
          '- CLOUDFLARE_R2_ACCESS_KEY_ID\n' +
          '- CLOUDFLARE_R2_SECRET_ACCESS_KEY\n' +
          '\nCheck your .env.local file for these settings.',
      )
    }

    _s3Client = new S3Client({
      region: env.CLOUDFLARE_R2_REGION || 'auto',
      endpoint: env.CLOUDFLARE_R2_ENDPOINT,
      credentials: {
        accessKeyId: env.CLOUDFLARE_R2_ACCESS_KEY_ID,
        secretAccessKey: env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
      },
      // Force path style for Cloudflare R2 compatibility
      // R2 requires path-style URLs: https://endpoint/bucket/key
      forcePathStyle: true,
    })
  }
  return _s3Client
}

/**
 * @deprecated Use getS3Client() instead for better error handling
 * This is a getter function that returns the client, not a direct export
 * to avoid initialization errors when configuration is missing
 */
export function getS3ClientDirect() {
  return getS3Client()
}

/**
 * Server-side storage utilities
 * These functions can only be used in server components or API routes
 */

import 'server-only'

// Re-export server-side functions
export {
  deleteFile,
  getFullKey,
  getPublicUrl,
  getSignedUrlForUpload,
} from './cloudflare-r2'
export { getS3Client, getStorageProvider, resetS3Client } from './s3-client'

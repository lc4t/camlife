/**
 * Storage utilities index
 *
 * For client components, import from './client'
 * For server components/API routes, import from './server'
 *
 * Note: This file only exports client-side functions for backward compatibility.
 * New code should import directly from './client' or './server' as appropriate.
 */

// Re-export client-side functions for backward compatibility
// But prefer importing from './client' directly
export { uploadFileViaProxy, uploadFileWithProgress } from './client'

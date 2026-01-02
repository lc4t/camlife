/**
 * Client-side storage utilities
 * These functions can be used in client components
 */

/**
 * Server-side upload function to bypass CORS
 * Use this when CORS configuration is problematic
 */
export async function uploadFileViaProxy(
  file: File,
  fileName: string,
  onProgress?: (progress: number) => void,
): Promise<{ url: string; size: number }> {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('fileName', fileName)

  const xhr = new XMLHttpRequest()

  return new Promise((resolve, reject) => {
    // Track upload progress
    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) {
        const progress = Math.round((event.loaded / event.total) * 100)
        onProgress?.(progress)
      }
    })

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = JSON.parse(xhr.responseText)
          if (response.success) {
            resolve({ url: response.url, size: response.size })
          } else {
            reject(new Error(response.error || 'Upload failed'))
          }
        } catch {
          reject(new Error('Failed to parse response'))
        }
      } else {
        reject(
          new Error(
            `Upload failed with status ${xhr.status}: ${xhr.responseText}`,
          ),
        )
      }
    }

    xhr.onerror = () => {
      reject(new Error('Network error during upload'))
    }

    xhr.ontimeout = () => {
      reject(new Error('Upload timed out'))
    }

    xhr.timeout = 60000 // 60 seconds for server-side upload

    xhr.open('POST', '/api/upload')
    xhr.send(formData)
  })
}

/**
 * XMLHttpRequest upload with progress
 * @param file the file to be uploaded
 * @param uploadUrl the upload url
 * @param onProgress the progress callback
 */
export async function uploadFileWithProgress(
  file: File,
  uploadUrl: string,
  onProgress?: (progress: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    // Validate upload URL
    if (!uploadUrl || !uploadUrl.startsWith('http')) {
      reject(
        new Error(
          `Invalid upload URL: ${uploadUrl ? 'URL format is invalid' : 'URL is empty'}. Please check your storage configuration.`,
        ),
      )
      return
    }

    const xhr = new XMLHttpRequest()

    // upload progress
    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) {
        const progress = Math.round((event.loaded / event.total) * 100)
        onProgress?.(progress)
      }
    })

    // complete
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve()
      } else {
        const errorMessage =
          xhr.responseText || xhr.statusText || 'Unknown error'
        reject(
          new Error(
            `Upload failed with status ${xhr.status}: ${errorMessage}. Please check your storage configuration and CORS settings.`,
          ),
        )
      }
    }

    // error
    xhr.onerror = (_event) => {
      // Try to get more error details
      const errorDetails: Record<string, unknown> = {
        status: xhr.status || 'N/A',
        statusText: xhr.statusText || 'N/A',
        readyState: xhr.readyState,
        uploadUrl: uploadUrl ? `${uploadUrl.substring(0, 80)}...` : 'N/A',
        fileSize: file.size,
        fileType: file.type,
      }

      // Try to get response text if available (may be empty due to CORS)
      try {
        if (xhr.responseText) {
          errorDetails.responseText = xhr.responseText.substring(0, 200)
        }
      } catch {
        // CORS may prevent reading response
        errorDetails.corsBlocked = true
      }

      // Try to get response headers if available
      try {
        const contentType = xhr.getResponseHeader('Content-Type')
        if (contentType) {
          errorDetails.responseContentType = contentType
        }
      } catch {
        // Headers may not be accessible due to CORS
      }

      // Try to extract domain from upload URL for better error message
      let uploadDomain = 'unknown'
      try {
        const url = new URL(uploadUrl)
        uploadDomain = url.hostname
      } catch {
        // Invalid URL format
      }

      errorDetails.uploadDomain = uploadDomain
      errorDetails.currentOrigin =
        typeof window !== 'undefined' ? window.location.origin : 'N/A'

      console.error('Upload error details:', errorDetails)
      console.error('CORS troubleshooting:', {
        'Current origin': errorDetails.currentOrigin,
        'Upload domain': uploadDomain,
        'Expected CORS origin':
          'http://localhost:3000 or http://127.0.0.1:3000',
        Tip: 'Ensure your R2 bucket CORS policy includes the current origin',
      })

      // Provide more specific error message based on status
      let errorMessage = 'Network error during upload.\n\n'

      if (xhr.status === 0) {
        const currentOrigin =
          typeof window !== 'undefined' ? window.location.origin : 'unknown'
        errorMessage +=
          'Status 0 usually indicates a CORS configuration issue.\n\n' +
          `Current origin: ${currentOrigin}\n` +
          `Upload domain: ${uploadDomain}\n\n` +
          'Please verify:\n' +
          '1. CORS policy in Cloudflare R2 bucket settings includes:\n' +
          `   - Origin: ${currentOrigin}\n` +
          '   - Methods: PUT, GET, HEAD, DELETE\n' +
          '   - Headers: *\n' +
          '2. Network connectivity - Check your internet connection\n' +
          '3. Endpoint URL - Verify CLOUDFLARE_R2_ENDPOINT in .env.local\n\n' +
          'To fix CORS:\n' +
          '1. Go to Cloudflare Dashboard → R2 → Your Bucket → Settings\n' +
          '2. Edit CORS Policy\n' +
          '3. Add the following JSON:\n' +
          JSON.stringify(
            [
              {
                AllowedOrigins: [
                  currentOrigin,
                  'http://localhost:3000',
                  'http://127.0.0.1:3000',
                ],
                AllowedMethods: ['PUT', 'GET', 'HEAD', 'DELETE'],
                AllowedHeaders: ['*'],
                ExposeHeaders: ['ETag', 'Content-Length'],
                MaxAgeSeconds: 3600,
              },
            ],
            null,
            2,
          ) +
          '\n'
      } else if (xhr.status === 403) {
        errorMessage +=
          'Status 403 (Forbidden) indicates:\n' +
          '1. Invalid or expired presigned URL\n' +
          '2. Incorrect storage credentials (CLOUDFLARE_R2_ACCESS_KEY_ID/SECRET_ACCESS_KEY)\n' +
          '3. Insufficient permissions on the bucket\n'
      } else if (xhr.status === 404) {
        errorMessage +=
          'Status 404 (Not Found) indicates:\n' +
          '1. Incorrect bucket name (CLOUDFLARE_R2_BUCKET)\n' +
          '2. Incorrect endpoint URL (CLOUDFLARE_R2_ENDPOINT)\n'
      } else {
        errorMessage +=
          `HTTP Status: ${xhr.status}\n` +
          'Please check:\n' +
          '1. Storage configuration in .env.local\n' +
          '2. CORS settings in Cloudflare R2 dashboard\n' +
          '3. Network connectivity\n'
      }

      errorMessage +=
        '\nFor CORS configuration, ensure your R2 bucket allows:\n' +
        '- Origin: http://localhost:3000 (for development)\n' +
        '- Methods: PUT, GET, HEAD, DELETE\n' +
        '- Headers: *\n'

      reject(new Error(errorMessage))
    }

    xhr.ontimeout = () => {
      reject(
        new Error(
          'Upload timed out after 30 seconds. Please check your network connection and storage service status.',
        ),
      )
    }

    // timeout
    xhr.timeout = 30000

    // send request
    try {
      // Parse URL to check domain
      let _uploadDomain = 'unknown'
      try {
        const url = new URL(uploadUrl)
        _uploadDomain = url.hostname
      } catch {
        // Invalid URL format
      }

      xhr.open('PUT', uploadUrl)

      // Set content type header - important for R2/S3
      // Note: Some CORS configurations require Content-Type to be in AllowedHeaders
      if (file.type) {
        xhr.setRequestHeader('Content-Type', file.type)
      }

      // Send request
      xhr.send(file)
    } catch (error) {
      console.error('Failed to initiate upload request:', error)
      reject(
        new Error(
          `Failed to initiate upload: ${error instanceof Error ? error.message : 'Unknown error'}. Please check the upload URL format.`,
        ),
      )
    }
  })
}

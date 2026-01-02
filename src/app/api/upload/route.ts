import { PutObjectCommand } from '@aws-sdk/client-s3'
import { type NextRequest, NextResponse } from 'next/server'
import { env } from '@/env'
import { getFullKey, getPublicUrl, getS3Client } from '@/lib/storage/server'

/**
 * Server-side upload API route
 * This endpoint handles file uploads to Cloudflare R2 via server-side proxy
 * to bypass CORS issues in production environments
 */
export async function POST(request: NextRequest) {
  try {
    // Parse form data
    const formData = await request.formData()
    const file = formData.get('file') as File
    const fileName = formData.get('fileName') as string

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 },
      )
    }

    if (!fileName) {
      return NextResponse.json(
        { success: false, error: 'No fileName provided' },
        { status: 400 },
      )
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { success: false, error: 'Only image files are allowed' },
        { status: 400 },
      )
    }

    // Validate storage configuration
    if (env.STORAGE_PROVIDER !== 'cloudflare-r2') {
      return NextResponse.json(
        {
          success: false,
          error: `Storage provider ${env.STORAGE_PROVIDER} is not supported for proxy upload. Only cloudflare-r2 is supported.`,
        },
        { status: 400 },
      )
    }

    if (
      !env.CLOUDFLARE_R2_ENDPOINT ||
      !env.CLOUDFLARE_R2_BUCKET ||
      !env.CLOUDFLARE_R2_ACCESS_KEY_ID ||
      !env.CLOUDFLARE_R2_SECRET_ACCESS_KEY
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Storage configuration is incomplete. Please check your CLOUDFLARE_R2_* environment variables.',
        },
        { status: 500 },
      )
    }

    // Get S3 client
    const s3Client = getS3Client()

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Upload to R2
    const fullKey = getFullKey(fileName)
    const command = new PutObjectCommand({
      Bucket: env.CLOUDFLARE_R2_BUCKET,
      Key: fullKey,
      Body: buffer,
      ContentType: file.type,
    })

    await s3Client.send(command)

    // Get public URL
    const publicUrl = getPublicUrl(fileName)

    return NextResponse.json({
      success: true,
      url: publicUrl,
      size: file.size,
    })
  } catch (error) {
    console.error('Upload error:', error)

    // Provide helpful error messages
    if (error instanceof Error) {
      if (error.message.includes('NoSuchBucket')) {
        return NextResponse.json(
          {
            success: false,
            error: `Bucket "${env.CLOUDFLARE_R2_BUCKET}" not found. Please check CLOUDFLARE_R2_BUCKET in your environment variables.`,
          },
          { status: 404 },
        )
      }
      if (error.message.includes('InvalidAccessKeyId')) {
        return NextResponse.json(
          {
            success: false,
            error:
              'Invalid Cloudflare R2 Access Key ID. Please check CLOUDFLARE_R2_ACCESS_KEY_ID.',
          },
          { status: 401 },
        )
      }
      if (error.message.includes('SignatureDoesNotMatch')) {
        return NextResponse.json(
          {
            success: false,
            error:
              'Invalid Cloudflare R2 Secret Access Key. Please check CLOUDFLARE_R2_SECRET_ACCESS_KEY.',
          },
          { status: 401 },
        )
      }
    }

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Unknown error occurred during upload',
      },
      { status: 500 },
    )
  }
}

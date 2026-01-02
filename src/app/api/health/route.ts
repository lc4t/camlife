import { NextResponse } from 'next/server'

/**
 * Health check endpoint for Docker health checks
 * Returns 200 OK if the service is healthy
 */
export async function GET() {
  try {
    // Basic health check - can be extended to check database, etc.
    return NextResponse.json(
      {
        status: 'ok',
        timestamp: new Date().toISOString(),
      },
      { status: 200 },
    )
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}

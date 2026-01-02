import { toNextJsHandler } from 'better-auth/next-js'
import { type NextRequest, NextResponse } from 'next/server'
import { env } from '@/env'
import { auth } from '@/lib/auth'

/**
 * Check if an email is allowed to register
 */
function isEmailAllowed(email: string): boolean {
  const allowedEmails = env.ALLOWED_EMAILS

  // If no restriction is set, allow all emails
  if (!allowedEmails || allowedEmails.trim() === '') {
    return true
  }

  // Parse the comma-separated list of allowed emails
  const emailList = allowedEmails
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e.length > 0)

  // If the list is empty after parsing, allow all
  if (emailList.length === 0) {
    return true
  }

  // Check if the email is in the allowed list
  return emailList.includes(email.toLowerCase())
}

const handler = toNextJsHandler(auth)

// Wrap POST handler to intercept sign-up requests
export async function POST(request: NextRequest) {
  const url = new URL(request.url)
  const pathname = url.pathname

  // Check if this is a sign-up request
  if (pathname.includes('/sign-up/email')) {
    try {
      // Clone the request to read the body
      const clonedRequest = request.clone()
      const body = await clonedRequest.json()
      const email = body?.email

      if (email && !isEmailAllowed(email)) {
        return NextResponse.json(
          {
            error: {
              message: '此邮箱未被授权注册。请联系管理员。',
              code: 'EMAIL_NOT_ALLOWED',
            },
          },
          { status: 403 },
        )
      }
    } catch {
      // If we can't parse the body, let better-auth handle it
    }
  }

  // Pass through to better-auth handler
  return handler.POST(request)
}

export const { GET } = handler

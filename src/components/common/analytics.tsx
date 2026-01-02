import Script from 'next/script'
import type { ReactElement } from 'react'
import { env } from '@/env'

// Conditionally import Vercel Analytics only when running on Vercel
// This prevents the script from trying to load /_vercel/insights/script.js in non-Vercel environments
let VercelAnalytics: (() => ReactElement | null) | null = null

// Only import if running on Vercel platform
if (process.env.VERCEL || process.env.NEXT_PUBLIC_VERCEL) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    VercelAnalytics = require('@vercel/analytics/next').Analytics
  } catch {
    // @vercel/analytics package not available, ignore
  }
}

export const Analytics = () => {
  if (env.NODE_ENV === 'development') {
    return null
  }

  return (
    <>
      {env.NEXT_PUBLIC_UMAMI_ANALYTICS_ID && (
        <Script
          src={env.NEXT_PUBLIC_UMAMI_ANALYTICS_JS}
          data-website-id={env.NEXT_PUBLIC_UMAMI_ANALYTICS_ID}
        />
      )}
      {/* Only render Vercel Analytics if running on Vercel platform */}
      {VercelAnalytics && <VercelAnalytics />}
    </>
  )
}

import { NextRequest, NextResponse } from 'next/server'
import { ENV_RATE_LIMIT, ENV_RATE_LIMIT_INTERVAL } from '@/lib'

interface RateLimitStore {
  [key: string]: {
    count: number
    resetTime: number
  }
}

const store: RateLimitStore = {}

const MAX_REQUESTS = ENV_RATE_LIMIT ?? 30
const WINDOW_MS = (ENV_RATE_LIMIT_INTERVAL ?? 60) * 1000

export async function rateLimit(req: NextRequest): Promise<NextResponse | false> {
  const now = Date.now()
  const xForwardedFor = req.headers.get('x-forwarded-for')
  const ip = xForwardedFor ? xForwardedFor.split(',')[0].trim() : 'UNKNOWN'

  if (store[ip] && now < store[ip].resetTime) {
    store[ip].count++
    if (store[ip].count > MAX_REQUESTS) {
      return NextResponse.json({ message: 'Too Many Requests' }, { status: 429 })
    }
  } else {
    store[ip] = {
      count: 1,
      resetTime: now + WINDOW_MS,
    }
  }
  // Clean up old entries
  for (const storedKey in store) {
    if (now > store[storedKey].resetTime) {
      delete store[storedKey]
    }
  }
  return false
}

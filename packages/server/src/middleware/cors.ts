import { NextRequest, NextResponse } from 'next/server'
import configJson from '../../../../config.json'

const allowAllOrigins = configJson.corsOrigin === '*'
const allowedOrigins = allowAllOrigins ? [] : [configJson.corsOrigin]

const corsOptions = {
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export async function cors(req: NextRequest): Promise<NextResponse | false> {
  const origin = req.headers.get('origin') || ''
  const host = req.headers.get('host') || ''

  const isAllowedOrigin =
    allowAllOrigins ||
    allowedOrigins.some((allowedOrigin) => {
      if (origin === allowedOrigin || host === allowedOrigin) {
        return true
      }
      if (allowedOrigin.startsWith('http')) {
        const allowedUrl = new URL(allowedOrigin)
        const requestHost = host.split(':')[0]
        const requestPort = host.split(':')[1] || (req.url.startsWith('https') ? '443' : '80')
        return allowedUrl.hostname === requestHost && allowedUrl.port === requestPort
      }
      return false
    })

  const res = NextResponse.next()

  if (isAllowedOrigin) {
    res.headers.set('Access-Control-Allow-Origin', allowAllOrigins ? '*' : origin || `http://${host}`)
    Object.entries(corsOptions).forEach(([key, value]) => {
      res.headers.set(key, value)
    })
  }

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return NextResponse.json({}, { status: 204, headers: res.headers })
  }

  if (!isAllowedOrigin) {
    return NextResponse.json({ error: 'Not allowed by CORS' }, { status: 403 })
  }

  return false
}

import { NextRequest, NextResponse } from 'next/server'
import config from '../../../../../config.json'
import { ENV_FEE_PAYER } from '@/lib/'
import { cors, rateLimit } from '@/middleware'

const configBody = {
  ...config,
  feePayer: ENV_FEE_PAYER.toBase58() || config.feePayer,
}

// Helper function to apply middleware
async function applyMiddleware(request: NextRequest) {
  const corsRes = await cors(request)
  if (corsRes) return corsRes
  const rateLimitRes = await rateLimit(request)
  if (rateLimitRes) return rateLimitRes
  return null
}

// GET handler to get Octane's configuration
export async function GET(request: NextRequest) {
  const middlewareRes = await applyMiddleware(request)
  if (middlewareRes) return middlewareRes

  return NextResponse.json(configBody)
}

export async function POST(request: NextRequest) {
  const middlewareRes = await applyMiddleware(request)
  if (middlewareRes) return middlewareRes

  return NextResponse.json(configBody)
}

import { NextRequest, NextResponse } from 'next/server'
import { connection } from '@/lib'
import { cors } from '@/middleware'
import { rateLimit } from '@/middleware'

// Endpoint to get the most recent blockhash seen by Octane's RPC node
export async function GET(request: NextRequest) {
  const corsRes = await cors(request)
  if (corsRes) return corsRes
  const rateLimitRes = await rateLimit(request)
  if (rateLimitRes) return rateLimitRes

  const blockhash = await connection.getRecentBlockhash()

  return NextResponse.json({ blockhash })
}

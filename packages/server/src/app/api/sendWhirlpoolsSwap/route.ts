import { sendAndConfirmRawTransaction, Transaction } from '@solana/web3.js'
import { NextRequest, NextResponse } from 'next/server'
import base58 from 'bs58'
import { signGeneratedTransaction, whirlpools } from '@solana/octane-core'
import { cache, connection, ENV_SECRET_KEYPAIR } from '@/lib'
import { cors, rateLimit } from '@/middleware'

// Endpoint to pay for transactions with an SPL token transfer
export async function POST(request: NextRequest) {
  const corsRes = await cors(request)
  if (corsRes) return corsRes
  const rateLimitRes = await rateLimit(request)
  if (rateLimitRes) return rateLimitRes

  // Deserialize a base58 wire-encoded transaction from the request
  const body = await request.json()
  const serialized = body.transaction
  if (typeof serialized !== 'string') {
    return NextResponse.json({ status: 'error', message: 'request should contain transaction' })
  }

  let transaction: Transaction
  try {
    transaction = Transaction.from(base58.decode(serialized))
  } catch (e) {
    return NextResponse.json({ status: 'error', message: "can't decode transaction" })
  }

  const messageToken = body.messageToken
  if (typeof messageToken !== 'string') {
    return NextResponse.json({ status: 'error', message: 'messageToken should be passed' })
  }

  try {
    const { signature } = await signGeneratedTransaction(
      connection,
      transaction,
      ENV_SECRET_KEYPAIR,
      whirlpools.MESSAGE_TOKEN_KEY,
      messageToken,
      cache
    )

    transaction.addSignature(ENV_SECRET_KEYPAIR.publicKey, Buffer.from(base58.decode(signature)))

    await sendAndConfirmRawTransaction(connection, transaction.serialize(), { commitment: 'confirmed' })

    // Respond with the confirmed transaction signature
    return NextResponse.json({ status: 'ok', signature })
  } catch (error) {
    let message = ''
    if (error instanceof Error) {
      message = error.message
    }
    return NextResponse.json({ status: 'error', message })
  }
}

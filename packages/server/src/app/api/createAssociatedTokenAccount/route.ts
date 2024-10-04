import { cache, connection, ENV_SECRET_KEYPAIR, isReturnedSignatureAllowed, ReturnSignatureConfigField } from '@/lib'
import { core, createAccountIfTokenFeePaid } from '@solana/octane-core'
import { sendAndConfirmRawTransaction, Transaction } from '@solana/web3.js'
import base58 from 'bs58'
import { NextRequest, NextResponse } from 'next/server'
import config from '../../../../../../config.json'
import { cors, rateLimit } from '@/middleware'

// Endpoint to create associated token account with transaction fees and account initialization fees paid by SPL tokens
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

  try {
    const { signature } = await createAccountIfTokenFeePaid(
      connection,
      transaction,
      ENV_SECRET_KEYPAIR,
      config.maxSignatures,
      config.lamportsPerSignature,
      config.endpoints.createAssociatedTokenAccount.tokens.map((token) => core.TokenFee.fromSerializable(token)),
      cache
    )

    if ((config as Record<string, unknown>).returnSignature !== undefined) {
      if (
        !(await isReturnedSignatureAllowed(
          request,
          (config as Record<string, unknown>).returnSignature as ReturnSignatureConfigField
        ))
      ) {
        return NextResponse.json({ status: 'error', message: 'anti-spam check failed' })
      }
      return NextResponse.json({ status: 'ok', signature })
    }

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

import BN from 'bn.js'
import base58 from 'bs58'
import Decimal from 'decimal.js'
import { NextRequest, NextResponse } from 'next/server'

import { Percentage } from '@orca-so/common-sdk'
import { getAssociatedTokenAddress } from '@solana/spl-token'
import { PublicKey } from '@solana/web3.js'

import { buildWhirlpoolsSwapToSOL, core } from '@solana/octane-core'

import { cache, connection, ENV_SECRET_KEYPAIR, isReturnedSignatureAllowed, ReturnSignatureConfigField } from '@/lib'
import config from '../../../../../../config.json'
import { cors, rateLimit } from '@/middleware'

// Endpoint to pay for transactions with an SPL token transfer
export async function POST(request: NextRequest) {
  const corsRes = await cors(request)
  if (corsRes) return corsRes
  const rateLimitRes = await rateLimit(request)
  if (rateLimitRes) return rateLimitRes

  const body = await request.json()
  let user: PublicKey
  try {
    user = new PublicKey(body.user)
  } catch {
    return NextResponse.json({ status: 'error', message: 'missing or invalid "user" parameter' })
  }
  let sourceMint: PublicKey
  try {
    sourceMint = new PublicKey(body.sourceMint)
  } catch {
    return NextResponse.json({ status: 'error', message: 'missing or invalid "sourceMint" parameter' })
  }
  let amount: BN
  try {
    amount = new BN(parseInt(body.amount))
  } catch {
    return NextResponse.json({ status: 'error', message: 'missing or invalid "amount" parameter' })
  }

  let slippingTolerance: Percentage
  try {
    slippingTolerance = Percentage.fromDecimal(new Decimal(body.slippingTolerance))
  } catch {
    return NextResponse.json({ status: 'error', message: 'missing or invalid "slippingTolerance" parameter' })
  }

  const tokenFees = config.endpoints.whirlpoolsSwap.tokens
    .map((token) => core.TokenFee.fromSerializable(token))
    .filter((tokenFee) => tokenFee.mint.equals(sourceMint))
  if (tokenFees.length === 0) {
    return NextResponse.json({ status: 'error', message: "this source mint isn't supported" })
  }
  const tokenFee = tokenFees[0]

  try {
    const { transaction, quote, messageToken } = await buildWhirlpoolsSwapToSOL(
      connection,
      ENV_SECRET_KEYPAIR,
      user,
      sourceMint,
      amount,
      slippingTolerance,
      cache,
      3000,
      {
        amount: Number(tokenFee.fee),
        sourceAccount: await getAssociatedTokenAddress(sourceMint, user),
        destinationAccount: tokenFee.account,
      }
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
      transaction.sign(ENV_SECRET_KEYPAIR)
      return NextResponse.json({
        status: 'ok',
        transaction: base58.encode(transaction.serialize({ verifySignatures: false })),
        quote,
        messageToken,
      })
    }

    // Respond with the confirmed transaction signature
    return NextResponse.json({
      status: 'ok',
      transaction: base58.encode(transaction.serialize({ verifySignatures: false })),
      quote,
      messageToken,
    })
  } catch (error) {
    let message = ''
    if (error instanceof Error) {
      message = error.message
    }
    return NextResponse.json({ status: 'error', message })
  }
}

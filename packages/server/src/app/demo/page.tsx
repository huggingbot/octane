'use client'

import React, { useEffect, useState } from 'react'
import {
  createAssociatedTokenAccountInstruction,
  createTransferInstruction,
  getAssociatedTokenAddress,
} from '@solana/spl-token'
import { Connection, Keypair, PublicKey, Transaction } from '@solana/web3.js'
import axios from 'axios'
import base58 from 'bs58'

// Eqv6WaPfBkhLUTeaEpd9wRJyHsn1ySU678U5eJ9RrXK2
const sourceOwner = Keypair.fromSecretKey(
  base58.decode('3J22L2ReL8tr5ynxgweScAoZ2jzbjqVNTB6SpsLFk3LYhzsd6QFi5tU2Zm7JqWqGJzRg4YP1UbFHzTEHuD49X95W')
)
const sourceTokenAccount = new PublicKey('4wxERq6HvwvAEj3zamnAS9nn8HDwCXb4Mwm3sdnYRxQ')
// Epc6D7s6Xsq9VxBNFfGjtS76ZyAoK68k7msm5ZZvi9Gg
const targetOwner = Keypair.fromSecretKey(
  base58.decode('5ythNTuRrRhyeELV1q84qoc5KDrDTcZ1k1SYerf5MKfuCB9AjfZiP2MCHHKY7AAZShwqjDvN2eXH6Usr13aEKCYL')
)

const connection = new Connection('https://api.devnet.solana.com', 'confirmed')

function App() {
  const [output, setOutput] = useState<string>('')
  const [octaneTokenMint, setOctaneTokenMint] = useState<PublicKey | null>(null)
  const [octaneTokenAccount, setOctaneTokenAccount] = useState<PublicKey | null>(null)
  const [octaneFeePayer, setOctaneFeePayer] = useState<PublicKey | null>(null)
  const [octaneFee, setOctaneFee] = useState<number | null>(null)
  const [targetTokenAccount, setTargetTokenAccount] = useState<PublicKey | null>(null)

  const fetchConfig = async () => {
    try {
      const response = await fetch('/api', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      })
      const data = await response.json()
      return data
    } catch (error) {
      console.error(error)
    }
  }

  useEffect(() => {
    const setup = async () => {
      const config = await fetchConfig()
      setOctaneTokenMint(new PublicKey(config.endpoints.transfer.tokens[0].mint))
      setOctaneTokenAccount(new PublicKey(config.endpoints.transfer.tokens[0].account))
      setOctaneFeePayer(new PublicKey(config.feePayer))
      setOctaneFee(config.endpoints.transfer.tokens[0].fee)
    }
    setup()
  }, [])

  const checkIfTokenAccountExists = async (tokenMint: PublicKey, owner: PublicKey) => {
    const tokenAccount = await getAssociatedTokenAddress(tokenMint, owner)
    return { tokenAccount, exists: !!(await connection.getAccountInfo(tokenAccount)) }
  }

  const getOrCreateTokenAccount = async () => {
    if (!octaneTokenMint || !octaneTokenAccount || !octaneFeePayer || !octaneFee) {
      console.error('config not loaded')
      return
    }
    const { tokenAccount, exists } = await checkIfTokenAccountExists(octaneTokenMint, targetOwner.publicKey)
    if (!exists) {
      const tx = new Transaction()
      tx.add(createTransferInstruction(sourceTokenAccount, octaneTokenAccount, sourceOwner.publicKey, octaneFee))
      tx.add(
        createAssociatedTokenAccountInstruction(octaneFeePayer, tokenAccount, targetOwner.publicKey, octaneTokenMint)
      )
      tx.feePayer = octaneFeePayer
      tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash
      tx.partialSign(sourceOwner)

      const res = await axios.post('/api/createAssociatedTokenAccount', {
        transaction: base58.encode(tx.serialize({ requireAllSignatures: false })),
      })
      setTargetTokenAccount(tokenAccount)
      setOutput(JSON.stringify({ tokenAccount, signature: res.data.signature }, null, 2))
      return
    }
    setTargetTokenAccount(tokenAccount)
    setOutput(JSON.stringify(tokenAccount, null, 2))
  }

  const handleTransfer = async () => {
    if (!octaneTokenMint || !octaneTokenAccount || !octaneFeePayer || !octaneFee) {
      console.log('config not loaded')
      return
    }
    if (!targetTokenAccount) {
      console.log('target token account not created')
      return
    }
    const transaction = new Transaction()
    transaction.add(createTransferInstruction(sourceTokenAccount, octaneTokenAccount, sourceOwner.publicKey, octaneFee))
    transaction.add(createTransferInstruction(sourceTokenAccount, targetTokenAccount, sourceOwner.publicKey, 100))
    transaction.feePayer = octaneFeePayer
    transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash
    transaction.partialSign(sourceOwner)

    const res = await axios.post('/api/transfer', {
      transaction: base58.encode(transaction.serialize({ requireAllSignatures: false })),
    })
    setOutput(JSON.stringify(res.data, null, 2))
  }

  return (
    <div className="App">
      <header>
        <h1>Octane Demo</h1>
      </header>
      <main>
        <section className="actions">
          <button onClick={getOrCreateTokenAccount}>Get or Create Target Token Account</button>
          <button onClick={handleTransfer}>Make Transfer</button>
        </section>
        <section className="output">
          <h2>Output</h2>
          <pre className="console">{output}</pre>
        </section>
      </main>
    </div>
  )
}

export default App

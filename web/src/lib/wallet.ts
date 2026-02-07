import { createPublicClient, createWalletClient, http, parseUnits, type Address } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { base } from 'viem/chains'

// Base USDC contract address
export const BASE_USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as const

export function getAgentWallet() {
  const privateKey = process.env.AGENT_BASE_WALLET_PRIVATE_KEY
  if (!privateKey || !privateKey.startsWith('0x')) {
    throw new Error('AGENT_BASE_WALLET_PRIVATE_KEY not configured in .env')
  }

  return privateKeyToAccount(privateKey as `0x${string}`)
}

export function getBasePublicClient() {
  return createPublicClient({
    chain: base,
    transport: http()
  })
}

export function getBaseWalletClient() {
  const account = getAgentWallet()

  return createWalletClient({
    account,
    chain: base,
    transport: http()
  })
}

// ERC20 USDC transfer ABI
const usdcAbi = [
  {
    constant: false,
    inputs: [
      { name: '_to', type: 'address' },
      { name: '_value', type: 'uint256' }
    ],
    name: 'transfer',
    outputs: [{ name: '', type: 'bool' }],
    type: 'function'
  },
  {
    constant: true,
    inputs: [{ name: '_owner', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: 'balance', type: 'uint256' }],
    type: 'function'
  }
] as const

export async function getUsdcBalance(address: Address): Promise<number> {
  const publicClient = getBasePublicClient()

  const balance = await publicClient.readContract({
    address: BASE_USDC_ADDRESS,
    abi: usdcAbi,
    functionName: 'balanceOf',
    args: [address]
  })

  // USDC has 6 decimals
  return Number(balance) / 1_000_000
}

export async function sendUsdc(to: Address, amountUsdc: number): Promise<`0x${string}`> {
  const walletClient = getBaseWalletClient()
  const account = getAgentWallet()

  // USDC has 6 decimals
  const amount = parseUnits(amountUsdc.toString(), 6)

  const hash = await walletClient.writeContract({
    address: BASE_USDC_ADDRESS,
    abi: usdcAbi,
    functionName: 'transfer',
    args: [to, amount]
  })

  return hash
}

import { NextResponse } from "next/server";
import { getAgentWallet, getUsdcBalance } from "@/lib/wallet";

export async function GET() {
  try {
    const wallet = getAgentWallet();
    const balance = await getUsdcBalance(wallet.address);

    return NextResponse.json({
      address: wallet.address,
      usdc_balance: balance,
      network: "Base",
      usdc_contract: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
      basescan_url: `https://basescan.org/address/${wallet.address}`,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to get wallet info" },
      { status: 500 }
    );
  }
}

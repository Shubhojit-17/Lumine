import "dotenv/config";
import {
  createWalletClient,
  createPublicClient,
  http,
  parseUnits,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";
import { encodeStacksAddress } from "./helper.js";

// ================= CONFIG =================
const config = {
  ETH_RPC_URL: "https://ethereum-sepolia.publicnode.com",
  PRIVATE_KEY: process.env.ETHEREUM_PRIVATE_KEY,

  X_RESERVE_CONTRACT: "0x008888878f94C0d87defdf0B07f46B93C1934442",
  ETH_USDC_CONTRACT: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",

  STACKS_DOMAIN: 10003,
  STACKS_RECIPIENT: "ST3Q6YCK0E2SDAA1KS7X546NY02F12D88RZHAH2P3",
  DEPOSIT_AMOUNT: "1.00",
  MAX_FEE: "0",
};

// ================= MAIN =================
async function main() {
  if (!config.PRIVATE_KEY) {
    throw new Error("ETHEREUM_PRIVATE_KEY missing");
  }

  const account = privateKeyToAccount(config.PRIVATE_KEY);

  const walletClient = createWalletClient({
    account,
    chain: sepolia,
    transport: http(config.ETH_RPC_URL),
  });

  const publicClient = createPublicClient({
    chain: sepolia,
    transport: http(config.ETH_RPC_URL),
  });

  console.log("Ethereum address:", account.address);

  const ethBalance = await publicClient.getBalance({
    address: account.address,
  });
  console.log("ETH balance:", Number(ethBalance) / 1e18);

  const value = parseUnits(config.DEPOSIT_AMOUNT, 6);
  const maxFee = parseUnits(config.MAX_FEE, 6);

  // Check USDC balance
  const usdcBalance = await publicClient.readContract({
    address: config.ETH_USDC_CONTRACT,
    abi: [{
      name: "balanceOf",
      type: "function",
      stateMutability: "view",
      inputs: [{ name: "account", type: "address" }],
      outputs: [{ name: "balance", type: "uint256" }],
    }],
    functionName: "balanceOf",
    args: [account.address],
  });
  console.log("USDC balance:", Number(usdcBalance) / 1e6, "USDC");
  
  if (usdcBalance < value) {
    throw new Error(`Insufficient USDC. Required: ${config.DEPOSIT_AMOUNT}`);
  }

  // Encode Stacks address to bytes32 using c32 decoding
  const remoteRecipient = encodeStacksAddress(config.STACKS_RECIPIENT);
  console.log("Remote recipient (bytes32):", remoteRecipient);

  // Approve USDC
  console.log("Approving USDC...");
  const approveTxHash = await walletClient.writeContract({
    address: config.ETH_USDC_CONTRACT,
    abi: [{
      name: "approve",
      type: "function",
      stateMutability: "nonpayable",
      inputs: [
        { name: "spender", type: "address" },
        { name: "amount", type: "uint256" },
      ],
      outputs: [],
    }],
    functionName: "approve",
    args: [config.X_RESERVE_CONTRACT, value],
  });

  console.log("Approval tx:", approveTxHash);
  console.log("Waiting for confirmation...");
  await publicClient.waitForTransactionReceipt({ hash: approveTxHash });
  console.log("Approval confirmed. Depositing...");

  // Deposit
  const depositTxHash = await walletClient.writeContract({
    address: config.X_RESERVE_CONTRACT,
    abi: [{
      name: "depositToRemote",
      type: "function",
      stateMutability: "nonpayable",
      inputs: [
        { name: "value", type: "uint256" },
        { name: "remoteDomain", type: "uint32" },
        { name: "remoteRecipient", type: "bytes32" },
        { name: "localToken", type: "address" },
        { name: "maxFee", type: "uint256" },
        { name: "hookData", type: "bytes" },
      ],
      outputs: [],
    }],
    functionName: "depositToRemote",
    args: [
      value,
      config.STACKS_DOMAIN,
      remoteRecipient,
      config.ETH_USDC_CONTRACT,
      maxFee,
      "0x",
    ],
  });

  console.log("✅ Deposit tx:", depositTxHash);
  console.log("Waiting for deposit confirmation...");
  await publicClient.waitForTransactionReceipt({ hash: depositTxHash });
  console.log("✅ Deposit confirmed! USDCx will be minted on Stacks in ~10-15 minutes.");
}

main().catch(console.error);

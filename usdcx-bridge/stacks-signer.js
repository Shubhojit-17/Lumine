/**
 * Stacks Transaction Signer
 * Uses @stacks/transactions for proper SIP-010 token transfers
 * Called from Python backend via subprocess
 */

const stx = await import('@stacks/transactions');
const net = await import('@stacks/network');

const {
  makeContractCall,
  broadcastTransaction,
  AnchorMode,
  PostConditionMode,
  Pc,
  uintCV,
  principalCV,
  noneCV,
  getAddressFromPrivateKey,
  AddressVersion,
} = stx;

const { STACKS_TESTNET } = net;

async function main() {
  // Read args from command line
  const args = process.argv.slice(2);
  
  if (args.length < 3) {
    console.log(JSON.stringify({
      success: false,
      error: 'Usage: node stacks-signer.js <privateKey> <recipient> <amount>'
    }));
    process.exit(1);
  }

  let [privateKey, recipient, amountStr] = args;
  const amount = BigInt(amountStr);
  
  // Ensure private key has compressed key suffix (01 for compressed)
  if (privateKey.length === 64) {
    privateKey = privateKey + '01';
  }

  // USDCx contract on testnet
  const USDCX_CONTRACT = 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.usdcx';
  const [contractAddress, contractName] = USDCX_CONTRACT.split('.');

  try {
    // Derive sender address from private key
    const senderAddress = getAddressFromPrivateKey(privateKey, 'testnet');
    
    // Build the contract call transaction
    // SIP-010 transfer: (amount uint) (sender principal) (recipient principal) (memo (optional (buff 34)))
    const txOptions = {
      network: STACKS_TESTNET,
      anchorMode: AnchorMode.Any,
      contractAddress,
      contractName,
      functionName: 'transfer',
      functionArgs: [
        uintCV(amount),              // amount
        principalCV(senderAddress),  // sender (must equal tx-sender)
        principalCV(recipient),      // recipient  
        noneCV(),                    // memo (optional)
      ],
      senderKey: privateKey,
      postConditionMode: PostConditionMode.Allow,
      postConditions: [],
      fee: 10000n, // 0.01 STX fee
    };

    // Build and sign the transaction
    const transaction = await makeContractCall(txOptions);
    
    // Broadcast to testnet
    const broadcastResponse = await broadcastTransaction({ transaction, network: STACKS_TESTNET });
    
    if (broadcastResponse.error) {
      console.log(JSON.stringify({
        success: false,
        error: broadcastResponse.error,
        reason: broadcastResponse.reason,
      }));
      process.exit(1);
    }
    
    console.log(JSON.stringify({
      success: true,
      txid: broadcastResponse.txid,
      sender: senderAddress,
      recipient: recipient,
      amount: amountStr,
    }));

  } catch (error) {
    console.log(JSON.stringify({
      success: false,
      error: error.message || String(error)
    }));
    process.exit(1);
  }
}

main();

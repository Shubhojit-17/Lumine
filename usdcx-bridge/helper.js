import { pad } from "viem";

// C32 alphabet used by Stacks addresses
const C32_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

// Stacks address version bytes
const STACKS_TESTNET_P2PKH = 26;  // 0x1a - ST addresses
const STACKS_MAINNET_P2PKH = 22;  // 0x16 - SP addresses

/**
 * Decode a c32 string to bytes.
 * @param {string} input - c32 encoded string (without prefix)
 * @returns {Uint8Array}
 */
function c32Decode(input) {
  // Convert to uppercase and build bit string
  let bits = "";
  for (const char of input.toUpperCase()) {
    const index = C32_ALPHABET.indexOf(char);
    if (index === -1) {
      throw new Error(`Invalid c32 character: ${char}`);
    }
    bits += index.toString(2).padStart(5, "0");
  }

  // Trim leading zeros to align to 8-bit boundary
  while (bits.length % 8 !== 0 && bits.startsWith("0")) {
    bits = bits.slice(1);
  }
  // Pad if still not aligned
  while (bits.length % 8 !== 0) {
    bits = "0" + bits;
  }

  // Convert to bytes
  const bytes = [];
  for (let i = 0; i < bits.length; i += 8) {
    bytes.push(parseInt(bits.slice(i, i + 8), 2));
  }

  return new Uint8Array(bytes);
}

/**
 * Encode a Stacks address for xReserve remoteRecipient.
 * 
 * Per Circle xReserve docs, the format is:
 *   [1 byte version] + [20 byte hash160] = 21 bytes, left-padded to 32 bytes
 * 
 * @param {string} stacksAddress - Full Stacks address (e.g., "ST1ABC...")
 * @returns {Uint8Array} - 21 byte encoded address
 */
function encodeRecipient(stacksAddress) {
  const prefix = stacksAddress.slice(0, 2).toUpperCase();
  
  let version;
  if (prefix === "ST") {
    version = STACKS_TESTNET_P2PKH;
  } else if (prefix === "SP") {
    version = STACKS_MAINNET_P2PKH;
  } else {
    throw new Error(`Invalid Stacks address prefix: ${prefix}`);
  }

  // Decode the c32 body (everything after the prefix)
  const c32Body = stacksAddress.slice(2);
  const decoded = c32Decode(c32Body);

  // Decoded should be 24 bytes: 20-byte hash160 + 4-byte checksum
  if (decoded.length !== 24) {
    throw new Error(
      `Invalid decoded length: expected 24, got ${decoded.length}`
    );
  }

  // Extract the 20-byte hash160 (drop the 4-byte checksum)
  const hash160 = decoded.slice(0, 20);

  // Return version byte + hash160 (21 bytes total)
  const result = new Uint8Array(21);
  result[0] = version;
  result.set(hash160, 1);
  
  return result;
}

/**
 * Convert bytes to bytes32 (left-padded with zeros).
 * This matches the bytes32FromBytes helper in the official docs.
 * 
 * @param {Uint8Array} bytes - Input bytes (up to 32)
 * @returns {`0x${string}`} - bytes32 hex string
 */
export function bytes32FromBytes(bytes) {
  if (bytes.length > 32) {
    throw new Error(`Input too long: ${bytes.length} bytes, max 32`);
  }
  return pad(`0x${Buffer.from(bytes).toString("hex")}`, {
    size: 32,
    dir: "left",  // Left-pad with zeros (standard bytes32)
  });
}

/**
 * Remote recipient coder - matches Circle docs API.
 */
export const remoteRecipientCoder = {
  encode: encodeRecipient,
};

/**
 * Encode a Stacks address string into bytes32 for xReserve depositToRemote.
 * Convenience function that combines remoteRecipientCoder.encode + bytes32FromBytes.
 *
 * @param {string} stacksAddress - Full Stacks address (e.g., "ST1ABC...")
 * @returns {`0x${string}`} - bytes32 hex string
 */
export function encodeStacksAddress(stacksAddress) {
  return bytes32FromBytes(remoteRecipientCoder.encode(stacksAddress));
}

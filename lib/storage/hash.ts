/**
 * Computes the SHA-256 hash of a File using the Web Crypto API.
 * Used to create an immutable document hash for onchain verification in AssetRegistry.
 */
export async function computeFileHash(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest("SHA-256", arrayBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hexHash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  return hexHash;
}

/**
 * Formats a 64-character SHA-256 hex string into a 0x-prefixed bytes32 hex string for Solidity contract calls.
 */
export function hashToBytes32(hexHash: string): `0x${string}` {
  const cleanHex = hexHash.replace(/^0x/i, "");
  if (cleanHex.length !== 64) {
    throw new Error(`Invalid SHA-256 hash length: expected 64 hex chars, got ${cleanHex.length}`);
  }
  return `0x${cleanHex}` as `0x${string}`;
}

/**
 * lib/storage/index.ts
 *
 * Central export hub for storage utilities (IPFS pinning & SHA-256 document hashing).
 * Raw invoice documents are stored in IPFS ONLY — never in the database or smart contracts.
 * Only the IPFS CID and document hash are written onchain and stored in DB (architecture.md).
 */

export { computeFileHash, hashToBytes32 } from "./hash";
export { uploadInvoiceToIpfs } from "./pinata";

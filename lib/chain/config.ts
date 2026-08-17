import { defineChain } from "viem";

/**
 * X Layer Testnet chain config (chain id 195).
 * Use for all development and pre-mainnet testing.
 * Invariant: no contract is deployed to Mainnet until it has been
 * deployed and exercised on Testnet first (architecture.md invariant 7).
 */
export const xlayerTestnet = defineChain({
  id: 1952,
  name: "X Layer Testnet",
  nativeCurrency: {
    name: "OKB",
    symbol: "OKB",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: [
        process.env.NEXT_PUBLIC_XLAYER_TESTNET_RPC_URL ??
          "https://testrpc.xlayer.tech",
        "https://xlayertestrpc.okx.com",
      ],
    },
    public: {
      http: [
        process.env.NEXT_PUBLIC_XLAYER_TESTNET_RPC_URL ??
          "https://testrpc.xlayer.tech",
        "https://xlayertestrpc.okx.com",
      ],
    },
  },
  blockExplorers: {
    default: {
      name: "OKLink",
      url: "https://www.oklink.com/xlayer-test",
    },
  },
  testnet: true,
});

/**
 * X Layer Mainnet chain config (chain id 196).
 * Only used after all contracts have been verified on Testnet.
 */
export const xlayerMainnet = defineChain({
  id: 196,
  name: "X Layer",
  nativeCurrency: {
    name: "OKB",
    symbol: "OKB",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: [
        process.env.NEXT_PUBLIC_XLAYER_MAINNET_RPC_URL ??
          "https://rpc.xlayer.tech",
      ],
    },
    public: {
      http: [
        process.env.NEXT_PUBLIC_XLAYER_MAINNET_RPC_URL ??
          "https://rpc.xlayer.tech",
      ],
    },
  },
  blockExplorers: {
    default: {
      name: "OKLink",
      url: "https://www.oklink.com/xlayer",
    },
  },
  testnet: false,
});

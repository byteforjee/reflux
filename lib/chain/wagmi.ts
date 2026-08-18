import { createConfig, http } from "wagmi";
import { getDefaultConfig } from "connectkit";
import { xlayerTestnet, xlayerMainnet } from "./config";

/**
 * Wagmi client configuration for Reflux on X Layer.
 * Uses ConnectKit helper to set up wallet connectors (OKX Wallet, Injected, MetaMask, WalletConnect).
 */
export const wagmiConfig = createConfig(
  getDefaultConfig({
    // Your dApp's info
    appName: "Reflux Protocol",
    appDescription: "AI-underwritten invoice credit protocol on X Layer",
    appUrl: "https://reflux.finance",
    appIcon: "/favicon.png",

    // Supported chains — X Layer Mainnet (default) & X Layer Testnet
    chains: [xlayerMainnet, xlayerTestnet],

    // Transports per chain
    transports: {
      [xlayerMainnet.id]: http(xlayerMainnet.rpcUrls.default.http[0]),
      [xlayerTestnet.id]: http(xlayerTestnet.rpcUrls.default.http[0]),
    },

    // WalletConnect Project ID (optional fallback placeholder for ConnectKit)
    walletConnectProjectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "c1b52a550d53c299292e85848e02d847",
  })
);

export interface NetworkAddresses {
  assetRegistry: `0x${string}`;
  riskOracle: `0x${string}`;
  trancheVault: `0x${string}`;
  mockUsdc?: `0x${string}`;
  usdc?: `0x${string}`;
}

export const CONTRACT_ADDRESSES = {
  xlayerTestnet: {
    assetRegistry: "0xaf248c5474f40945ed41664125350a890782cad0",
    riskOracle: "0x37e1Bf4Ac7e80507c22f6710B205b696068F1127",
    trancheVault: "0x452857e278fe68376e264662ff944cc88cf65fb7",
    mockUsdc: "0xD84509d311700d7946439E66DD6573138d79bBCb",
  },
  xlayerMainnet: {
    assetRegistry: "0xd84509d311700d7946439e66dd6573138d79bbcb",
    riskOracle: "0xdebf3e5a598e27d28c912a3cac88df81c253730a",
    trancheVault: "0x37e1bf4ac7e80507c22f6710b205b696068f1127",
    usdc: "0x74b7f16337b8972027f6196a17a631ac6de26d22",
  },
} as const;

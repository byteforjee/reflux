// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {AssetRegistry} from "../src/AssetRegistry.sol";
import {RiskOracle} from "../src/RiskOracle.sol";
import {TrancheVault} from "../src/TrancheVault.sol";
import {MockUSDC} from "../src/MockUSDC.sol";

contract DeployScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("ORACLE_PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        console.log("Deploying Reflux Core Contracts...");
        console.log("Deployer / Initial Owner:", deployer);

        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy MockUSDC (for testnet)
        MockUSDC mockUsdc = new MockUSDC(deployer);
        console.log("MockUSDC deployed to:", address(mockUsdc));

        // 2. Deploy AssetRegistry
        AssetRegistry registry = new AssetRegistry(deployer);
        console.log("AssetRegistry deployed to:", address(registry));

        // 3. Deploy RiskOracle
        RiskOracle oracle = new RiskOracle(deployer);
        console.log("RiskOracle deployed to:", address(oracle));

        // 4. Deploy TrancheVault
        TrancheVault vault = new TrancheVault(
            deployer,
            address(mockUsdc),
            address(registry),
            address(oracle)
        );
        console.log("TrancheVault deployed to:", address(vault));

        // 5. Wire roles: set oracle address in AssetRegistry and RiskOracle, authorize vault in AssetRegistry
        registry.setOracle(deployer);
        registry.setAuthorizedUpdater(address(vault), true);
        oracle.setOracle(deployer);
        vault.setAdmin(deployer);

        vm.stopBroadcast();

        console.log("\n=== Deployment Complete ===");
        console.log("MockUSDC:     ", address(mockUsdc));
        console.log("AssetRegistry:", address(registry));
        console.log("RiskOracle:   ", address(oracle));
        console.log("TrancheVault: ", address(vault));
        console.log("Oracle Signer:", deployer);
    }
}

// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MockUSDC
 * @notice Minimal 6-decimal ERC20 token for X Layer Testnet testing.
 *         Allows anyone to mint test funds for testing the funding and investment flows.
 */
contract MockUSDC is ERC20, Ownable {
    constructor(address initialOwner) ERC20("Mock USD Coin", "mUSDC") Ownable(initialOwner) {
        // Mint initial 1,000,000 mUSDC to deployer (1,000,000 * 10^6)
        _mint(initialOwner, 1_000_000 * 10**6);
    }

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    /**
     * @notice Mint test tokens to any address (unrestricted for testnet usability).
     */
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

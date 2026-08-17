// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {RiskOracle} from "../src/RiskOracle.sol";

contract RiskOracleTest is Test {
    RiskOracle public oracleContract;
    address public owner = address(1);
    address public oracleSigner = address(2);
    address public user = address(3);

    function setUp() public {
        oracleContract = new RiskOracle(owner);
        vm.prank(owner);
        oracleContract.setOracle(oracleSigner);
    }

    function test_setScore_byOracle_succeeds() public {
        vm.prank(oracleSigner);
        oracleContract.setScore(
            1,
            "A",
            85,
            1200,
            "Low risk debtor with strong repayment history.",
            "approved"
        );

        assertTrue(oracleContract.hasScore(1));

        RiskOracle.RiskScore memory score = oracleContract.getScore(1);
        assertEq(score.tier, "A");
        assertEq(score.score, 85);
        assertEq(score.apr, 1200);
        assertEq(score.rationale, "Low risk debtor with strong repayment history.");
        assertEq(score.decision, "approved");
    }

    function test_setScore_byNonOracle_reverts() public {
        vm.prank(user);
        vm.expectRevert(RiskOracle.NotOracle.selector);
        oracleContract.setScore(1, "A", 85, 1200, "Rationale", "approved");
    }

    function test_setScore_twice_reverts() public {
        vm.startPrank(oracleSigner);
        oracleContract.setScore(1, "A", 85, 1200, "Rationale", "approved");

        vm.expectRevert(abi.encodeWithSelector(RiskOracle.ScoreAlreadyExists.selector, 1));
        oracleContract.setScore(1, "B", 70, 1500, "Updated Rationale", "approved");
        vm.stopPrank();
    }

    function test_getScore_noScore_reverts() public {
        vm.expectRevert(abi.encodeWithSelector(RiskOracle.NoScoreExists.selector, 99));
        oracleContract.getScore(99);
    }

    function test_setScore_invalidTier_reverts() public {
        vm.prank(oracleSigner);
        vm.expectRevert(RiskOracle.InvalidTier.selector);
        oracleContract.setScore(1, "D", 85, 1200, "Rationale", "approved");
    }

    function test_setScore_invalidDecision_reverts() public {
        vm.prank(oracleSigner);
        vm.expectRevert(RiskOracle.InvalidDecision.selector);
        oracleContract.setScore(1, "A", 85, 1200, "Rationale", "invalid_decision");
    }
}

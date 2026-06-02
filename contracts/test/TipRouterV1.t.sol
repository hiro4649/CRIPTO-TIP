// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {Vm} from "forge-std/Vm.sol";
import {TipRouterV1} from "../src/TipRouterV1.sol";
import {MockERC20} from "../src/MockERC20.sol";

contract TipRouterV1Test is Test {
    MockERC20 token;
    TipRouterV1 router;
    address owner = address(0xA11CE);
    address viewer = address(0xB0B);
    address treasury = address(0xCAFE);
    bytes32 streamId = keccak256("stream");
    bytes32 characterId = keccak256("character");
    bytes32 messageHash = keccak256("message");
    bytes32 clientTipId = keccak256("client");

    event TipSent(
        address indexed from,
        bytes32 indexed streamId,
        bytes32 indexed characterId,
        uint256 amount,
        bytes32 messageHash,
        bytes32 clientTipId,
        address token,
        uint256 blockTimestamp
    );

    function setUp() public {
        token = new MockERC20();
        router = new TipRouterV1(token, treasury, 100, owner);
        token.mint(viewer, 1000);
        vm.prank(viewer);
        token.approve(address(router), type(uint256).max);
    }

    function testSuccessfulTipTransfersTokensAndEmitsEvent() public {
        vm.expectEmit(true, true, true, true);
        emit TipSent(viewer, streamId, characterId, 100, messageHash, clientTipId, address(token), block.timestamp);
        vm.prank(viewer);
        router.tip(streamId, characterId, 100, messageHash, clientTipId);
        assertEq(token.balanceOf(treasury), 100);
    }

    function testMinimumTipBelowThresholdReverts() public {
        vm.prank(viewer);
        vm.expectRevert(TipRouterV1.AmountBelowMinimum.selector);
        router.tip(streamId, characterId, 99, messageHash, clientTipId);
    }

    function testZeroStreamIdReverts() public {
        vm.prank(viewer);
        vm.expectRevert(TipRouterV1.EmptyIdentifier.selector);
        router.tip(bytes32(0), characterId, 100, messageHash, clientTipId);
    }

    function testZeroCharacterIdReverts() public {
        vm.prank(viewer);
        vm.expectRevert(TipRouterV1.EmptyIdentifier.selector);
        router.tip(streamId, bytes32(0), 100, messageHash, clientTipId);
    }

    function testPausedTipReverts() public {
        vm.prank(owner);
        router.pause();
        vm.prank(viewer);
        vm.expectRevert();
        router.tip(streamId, characterId, 100, messageHash, clientTipId);
    }

    function testTransferFromFailureReverts() public {
        token.setFailTransferFrom(true);
        vm.prank(viewer);
        vm.expectRevert();
        router.tip(streamId, characterId, 100, messageHash, clientTipId);
    }

    function testOnlyOwnerCanAdmin() public {
        vm.prank(viewer);
        vm.expectRevert();
        router.pause();
        vm.prank(owner);
        router.pause();
        vm.prank(owner);
        router.unpause();
        vm.prank(owner);
        router.setTreasury(address(0xD00D));
        vm.prank(owner);
        router.setMinimumTip(1);
        assertEq(router.treasury(), address(0xD00D));
        assertEq(router.minimumTip(), 1);
    }

    function testZeroTreasuryRejected() public {
        vm.prank(owner);
        vm.expectRevert(TipRouterV1.ZeroAddress.selector);
        router.setTreasury(address(0));
    }

    function testFuzzedAmountDoesNotOverflowAndRespectsMinimum(uint256 amount) public {
        vm.assume(amount >= 100 && amount <= 1000);
        vm.prank(viewer);
        router.tip(streamId, characterId, amount, messageHash, clientTipId);
        assertEq(token.balanceOf(treasury), amount);
    }

    function testNoUserPersonalDataFieldsExistInEmittedEvent() public {
        bytes32[] memory arbitraryPersonalText = new bytes32[](3);
        arbitraryPersonalText[0] = bytes32("Akira");
        arbitraryPersonalText[1] = bytes32("hello youtube");
        arbitraryPersonalText[2] = bytes32("UC123");
        vm.recordLogs();
        vm.prank(viewer);
        router.tip(streamId, characterId, 100, messageHash, clientTipId);
        Vm.Log[] memory logs = vm.getRecordedLogs();
        Vm.Log memory tipLog = logs[1];
        assertEq(tipLog.topics.length, 4);
        assertEq(tipLog.topics[0], keccak256("TipSent(address,bytes32,bytes32,uint256,bytes32,bytes32,address,uint256)"));
        assertEq(tipLog.topics[1], bytes32(uint256(uint160(viewer))));
        assertEq(tipLog.topics[2], streamId);
        assertEq(tipLog.topics[3], characterId);
        (uint256 amount, bytes32 emittedMessageHash, bytes32 emittedClientTipId, address emittedToken, uint256 blockTimestamp) =
            abi.decode(tipLog.data, (uint256, bytes32, bytes32, address, uint256));
        assertEq(amount, 100);
        assertEq(emittedMessageHash, messageHash);
        assertEq(emittedClientTipId, clientTipId);
        assertEq(emittedToken, address(token));
        assertEq(blockTimestamp, block.timestamp);
        for (uint256 i = 0; i < arbitraryPersonalText.length; i++) {
            assertTrue(tipLog.topics[1] != arbitraryPersonalText[i]);
            assertTrue(tipLog.topics[2] != arbitraryPersonalText[i]);
            assertTrue(tipLog.topics[3] != arbitraryPersonalText[i]);
            assertTrue(emittedMessageHash != arbitraryPersonalText[i]);
            assertTrue(emittedClientTipId != arbitraryPersonalText[i]);
        }
        assertEq(token.balanceOf(treasury), 100);
    }
}

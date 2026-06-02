// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract TipRouterV1 is Pausable, Ownable2Step {
    using SafeERC20 for IERC20;

    IERC20 public immutable token;
    address public treasury;
    uint256 public minimumTip;

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

    event TreasuryUpdated(address indexed treasury);
    event MinimumTipUpdated(uint256 minimumTip);

    error AmountBelowMinimum();
    error ZeroAddress();
    error EmptyIdentifier();

    constructor(IERC20 token_, address treasury_, uint256 minimumTip_, address owner_) Ownable(owner_) {
        if (address(token_) == address(0) || treasury_ == address(0) || owner_ == address(0)) revert ZeroAddress();
        token = token_;
        treasury = treasury_;
        minimumTip = minimumTip_;
    }

    function tip(bytes32 streamId, bytes32 characterId, uint256 amount, bytes32 messageHash, bytes32 clientTipId)
        external
        whenNotPaused
    {
        if (streamId == bytes32(0) || characterId == bytes32(0)) revert EmptyIdentifier();
        if (amount < minimumTip) revert AmountBelowMinimum();
        address currentTreasury = treasury;
        if (currentTreasury == address(0)) revert ZeroAddress();
        token.safeTransferFrom(msg.sender, currentTreasury, amount);
        emit TipSent(msg.sender, streamId, characterId, amount, messageHash, clientTipId, address(token), block.timestamp);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function setTreasury(address treasury_) external onlyOwner {
        if (treasury_ == address(0)) revert ZeroAddress();
        treasury = treasury_;
        emit TreasuryUpdated(treasury_);
    }

    function setMinimumTip(uint256 minimumTip_) external onlyOwner {
        minimumTip = minimumTip_;
        emit MinimumTipUpdated(minimumTip_);
    }
}

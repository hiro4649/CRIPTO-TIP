// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockERC20 is ERC20 {
    bool public failTransferFrom;

    constructor() ERC20("Mock IRIS", "MIRIS") {}

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function setFailTransferFrom(bool fail) external {
        failTransferFrom = fail;
    }

    function transferFrom(address from, address to, uint256 amount) public override returns (bool) {
        require(!failTransferFrom, "mock transferFrom failure");
        return super.transferFrom(from, to, amount);
    }
}

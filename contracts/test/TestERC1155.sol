// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.12;

import '@openzeppelin/contracts/token/ERC1155/ERC1155.sol';

contract TestERC1155 is ERC1155 {
    constructor() ERC1155('uri') {}

    function mint(address to, uint256 id, uint256 value) external {
        _mint(to, id, value, "0x");
    }
}
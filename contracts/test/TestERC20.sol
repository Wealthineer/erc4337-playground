// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.12;

import '@openzeppelin/contracts/token/ERC20/ERC20.sol';

contract TestERC20 is ERC20 {
    constructor() ERC20('TestERC20', 'TEST') {}

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
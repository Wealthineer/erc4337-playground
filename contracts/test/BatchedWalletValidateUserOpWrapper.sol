// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.12;

import "@account-abstraction/contracts/interfaces/UserOperation.sol";
import "../BatchedWallet.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

import "hardhat/console.sol";

contract BatchedWalletValidateUserOpWrapper is BatchedWallet {
    constructor(IEntryPoint anEntryPoint) BatchedWallet(anEntryPoint) {}

    function validateSignature(UserOperation calldata userOp, bytes32 userOpHash)
    public virtual {
        uint256 result =  super._validateSignature(userOp, userOpHash);
        if(result == 0) {
            revert("signature validation success");
        }
        if(result == 1) {
            revert("signature validation failed");
        }

    }

    function setOwner(address owner) public {
        super._initialize(owner);
    }
  
}
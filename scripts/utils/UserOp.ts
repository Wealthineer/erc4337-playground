import {
  BytesLike,
  Signer,
    getBytes,
    keccak256
  } from 'ethers'

  import {defaultAbiCoder} from '@ethersproject/abi'
  import { Wallet } from 'ethers'
  import { AddressZero } from './testUtils'
  import { ecsign, toRpcSig, keccak256 as keccak256_buffer } from 'ethereumjs-util'
  import { UserOperation } from './UserOperation'

  
  export function packUserOp (op: UserOperation, forSignature = true): string {
    if (forSignature) {
      return defaultAbiCoder.encode(
        ['address', 'uint256', 'bytes32', 'bytes32',
          'uint256', 'uint256', 'uint256', 'uint256', 'uint256',
          'bytes32'],
        [op.sender, op.nonce, keccak256(op.initCode), keccak256(op.callData),
          op.callGasLimit, op.verificationGasLimit, op.preVerificationGas, op.maxFeePerGas, op.maxPriorityFeePerGas,
          keccak256(op.paymasterAndData)])
    } else {
      // for the purpose of calculating gas cost encode also signature (and no keccak of bytes)
      return defaultAbiCoder.encode(
        ['address', 'uint256', 'bytes', 'bytes',
          'uint256', 'uint256', 'uint256', 'uint256', 'uint256',
          'bytes', 'bytes'],
        [op.sender, op.nonce, op.initCode, op.callData,
          op.callGasLimit, op.verificationGasLimit, op.preVerificationGas, op.maxFeePerGas, op.maxPriorityFeePerGas,
          op.paymasterAndData, op.signature])
    }
  }
  
  
  export function getUserOpHash (op: UserOperation, entryPoint: string, chainId: number): string {
    const userOpHash = keccak256(packUserOp(op, true))
    const enc = defaultAbiCoder.encode(
      ['bytes32', 'address', 'uint256'],
      [userOpHash, entryPoint, chainId])
    return keccak256(enc)
  }
  
  export const DefaultsForUserOp: UserOperation = {
    sender: AddressZero,
    nonce: 0,
    initCode: '0x',
    callData: '0x',
    callGasLimit: 0,
    verificationGasLimit: 150000, // default verification gas. will add create2 cost (3200+200*length) if initCode exists
    preVerificationGas: 21000, // should also cover calldata cost.
    maxFeePerGas: 0,
    maxPriorityFeePerGas: 1e9,
    paymasterAndData: '0x',
    signature: '0x'
  }
  
  export function signUserOp (op: UserOperation, signer: Wallet, entryPoint: string, chainId: number): UserOperation {
    const message = getUserOpHash(op, entryPoint, chainId)
    const msg1 = Buffer.concat([
      Buffer.from('\x19Ethereum Signed Message:\n32', 'ascii'),
      Buffer.from(getBytes(message))
    ])
  
    const sig = ecsign(keccak256_buffer(msg1), Buffer.from(getBytes(signer.privateKey)))
    // that's equivalent of:  await signer.signMessage(message);
    // (but without "async"
    const signedMessage1 = toRpcSig(sig.v, sig.r, sig.s)
    return {
      ...op,
      signature: signedMessage1
    }
  }

  export async function signUserOpWithSigner (op: UserOperation, signer: Signer, entryPoint: string, chainId: number): Promise<UserOperation> {
    const message = getUserOpHash(op, entryPoint, chainId)
    const msg1 = Buffer.concat([
      Buffer.from('\x19Ethereum Signed Message:\n32', 'ascii'),
      Buffer.from(getBytes(message))
    ])

    const signedMessage1 = await signer.signMessage(message);
    return {
      ...op,
      signature: signedMessage1
    }
  }
  
 
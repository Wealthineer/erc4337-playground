import { AddressLike, BigNumberish, BytesLike, JsonRpcProvider, Wallet, getBytes } from 'ethers';
import { BatchedWallet, BatchedWalletPaymaster, ERC20 } from '../../typechain-types';
import {getGasLimit, getGasPrice} from './userOperationUtils'
import { UserOperation } from './UserOperation';
import { getUserOpHash, signUserOp } from './UserOp';
import { hexConcat } from '@ethersproject/bytes';
import { defaultAbiCoder } from '@ethersproject/abi';


export async function createErc20Transfer(batchedWallet: BatchedWallet, to: string, amount: BigNumberish, erc20: ERC20, provider: JsonRpcProvider, chainId: number): Promise<UserOperation> {
    //Specific part for erc20 transfer
    const transferCallData = erc20.interface.encodeFunctionData("transfer", [to, amount]);
    const executeErc20TransferData = packageExecute(erc20.target, 0, transferCallData, batchedWallet)
  
    //general part for all user operations
    return await fillUserOperation(batchedWallet.target.toString(), executeErc20TransferData, provider, chainId, batchedWallet)
}

export async function createErc20TransferSponsored(batchedWallet: BatchedWallet, to: string, amount: BigNumberish, paymaster: BatchedWalletPaymaster, erc20: ERC20, provider: JsonRpcProvider, chainId: number): Promise<UserOperation> {
    //Specific part for erc20 transfer
    const transferCallData = erc20.interface.encodeFunctionData("transfer", [to, amount]);
    const executeErc20TransferData = packageExecute(erc20.target, 0, transferCallData, batchedWallet)
  
    //general part for all user operations
    return await fillUserOperationSponsored(batchedWallet.target.toString(), executeErc20TransferData, provider, chainId, batchedWallet, paymaster)
}

export async function createErc20BatchTransfer(batchedWallet: BatchedWallet, to: string[], amount: BigNumberish[], erc20: ERC20, provider: JsonRpcProvider, chainId: number): Promise<UserOperation> {
    //Specific part for erc20 batch transfer
    const batchCallData = []
    const batchTo = []
    const batchValue = []
    for (let i = 0; i < to.length; i++) {
      const transferCallData = erc20.interface.encodeFunctionData("transfer", [to[i], amount[i]]);
      batchCallData.push(transferCallData)
      batchTo.push(erc20.target)
      batchValue.push(0)
    }
    const executeErc20TransferData = packageExecuteBatch(batchTo, batchValue, batchCallData, batchedWallet)
  
    //general part for all user operations
    return await fillUserOperation(batchedWallet.target.toString(), executeErc20TransferData, provider, chainId, batchedWallet)
}




export  async function createEthTransfer(batchedWallet: BatchedWallet, to: string, amount: BigNumberish, provider: JsonRpcProvider, chainId: number): Promise<UserOperation> {
    //Specific part for ETH transfer
    const executeEthTransferData = packageExecute(to, amount, "0x", batchedWallet)
  
    //general part for all user operations
    return await fillUserOperation(batchedWallet.target.toString(), executeEthTransferData, provider, chainId, batchedWallet)
}

export async function createEthBatchTransfer(batchedWallet: BatchedWallet, to: string[], amount: BigNumberish[], provider: JsonRpcProvider, chainId: number): Promise<UserOperation> {
    //Specific part for erc20 batch transfer
    const batchCallData = Array(to.length).fill("0x")
    const executeErc20TransferData = packageExecuteBatch(to, amount, batchCallData, batchedWallet)
    //general part for all user operations
    return await fillUserOperation(batchedWallet.target.toString(), executeErc20TransferData, provider, chainId, batchedWallet)
}  
  
  
  
function packageExecute(to: AddressLike, value: BigNumberish, data: BytesLike, wallet: BatchedWallet) : BytesLike {
    return wallet.interface.encodeFunctionData("execute", [to, value, data])
}
  
function packageExecuteBatch(to: AddressLike[], value: BigNumberish[], data: BytesLike[], wallet: BatchedWallet) : BytesLike {
    return wallet.interface.encodeFunctionData("executeBatch", [to, value, data])
}

async function fillUserOperation(sender: string, callData: BytesLike, provider: JsonRpcProvider, chainId: number, batchedWallet: BatchedWallet): Promise<UserOperation> {
  
    const nonce = await batchedWallet.getNonce(); 
    const {maxPriorityFeePerGas, maxFeePerGas} = await getGasPrice(provider)
  
    let userOperation : UserOperation = {
      sender: sender,
      nonce: nonce,
      initCode: "0x",
      callData: callData,
      callGasLimit: 35000,
      verificationGasLimit: 70000,
      preVerificationGas: 60000,
      maxFeePerGas: maxFeePerGas,
      maxPriorityFeePerGas: maxPriorityFeePerGas,
      paymasterAndData: "0x",
      signature: "0xfffffffffffffffffffffffffffffff0000000000000000000000000000000007aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa1c"
    }

    const entryPointAddress = await batchedWallet.entryPoint()
  
    //You need to have the userOperation filled out (including a signature dummy) before you can get the gas limit
    const {preVerificationGas, verificationGasLimit, callGasLimit} = await getGasLimit(provider, entryPointAddress, userOperation)
    
  
    userOperation.callGasLimit = callGasLimit
    userOperation.verificationGasLimit = verificationGasLimit
    userOperation.preVerificationGas = (BigInt(preVerificationGas) > 60000) ? preVerificationGas : 60000
  
    const userOpHash = getUserOpHash(userOperation, entryPointAddress, chainId)
    console.log(`userOpHash is ${userOpHash}`)
  
    const wallet = new Wallet(process.env.PRIVATE_KEY || "not_set")
  
    userOperation = signUserOp(userOperation, wallet, entryPointAddress, chainId)
  
    return userOperation
}


async function fillUserOperationSponsored(sender: string, callData: BytesLike, provider: JsonRpcProvider, chainId: number, batchedWallet: BatchedWallet, paymaster: BatchedWalletPaymaster): Promise<UserOperation> {
  
    const valid_until = BigInt(Math.floor(Date.now()/1000 + 10*60)) // 10 minutes from now
    const valid_after = BigInt(0) ;
    const wallet = new Wallet(process.env.PRIVATE_KEY || "not_set")

    const nonce = await batchedWallet.getNonce(); 
    const {maxPriorityFeePerGas, maxFeePerGas} = await getGasPrice(provider)
  
    let userOperation : UserOperation = {
      sender: sender,
      nonce: nonce,
      initCode: "0x",
      callData: callData,
      callGasLimit: 35000,
      verificationGasLimit: 70000,
      preVerificationGas: 60000,
      maxFeePerGas: maxFeePerGas,
      maxPriorityFeePerGas: maxPriorityFeePerGas,
      paymasterAndData: "0xc2142c97690930d99f7bd21f7eb77469a4eaebda00000000000000000000000000000000000000000000000000000000656662e90000000000000000000000000000000000000000000000000000000000000000e20af386a56c2807685acbb4d3f1e992d90404f01c94a73aed9280532ce953092f51fe66d831300b4cc1684da890365c5a14640fbf39200706ac818bbe6f2a021c",
      signature: "0xfffffffffffffffffffffffffffffff0000000000000000000000000000000007aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa1c"
    }

    const entryPointAddress = await batchedWallet.entryPoint()
  
    //You need to have the userOperation filled out (including a signature dummy) before you can get the gas limit
    const {preVerificationGas, verificationGasLimit, callGasLimit} = await getGasLimit(provider, entryPointAddress, userOperation)
    
  
    userOperation.callGasLimit = BigInt(callGasLimit)*BigInt(2)
    userOperation.verificationGasLimit = BigInt(verificationGasLimit)*BigInt(2)
    userOperation.preVerificationGas = (BigInt(preVerificationGas) > 60000) ? preVerificationGas : 60000

    userOperation.paymasterAndData = hexConcat([paymaster.target.toString(), defaultAbiCoder.encode(['uint48', 'uint48'], [valid_until, valid_after]), '0x' + '00'.repeat(65)])
    const hash = await paymaster.getHash(userOperation, valid_until, valid_after)
    const signedHash = await wallet.signMessage(getBytes(hash))
    const paymasterAndData = hexConcat([paymaster.target.toString(), defaultAbiCoder.encode(['uint48', 'uint48'], [valid_until, valid_after]), signedHash])
    userOperation.paymasterAndData = paymasterAndData
  
    const userOpHash = getUserOpHash(userOperation, entryPointAddress, chainId)
    console.log(`userOpHash is ${userOpHash}`)
  
    userOperation = signUserOp(userOperation, wallet, entryPointAddress, chainId)
  
    return userOperation
}
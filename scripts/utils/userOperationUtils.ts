import { AddressLike, BigNumberish, BytesLike, JsonRpcProvider, ethers } from 'ethers';
import { UserOperation } from './UserOperation';






//ported from https://github.com/stackup-wallet/userop.js/blob/main/src/preset/middleware/gasPrice.ts
export async function getGasPrice(provider: JsonRpcProvider) {
    const [fee, block] = await Promise.all([
      provider.send("eth_maxPriorityFeePerGas", []),
      provider.getBlock("latest"),
    ]);
  
    const tip = BigInt(fee);
    const buffer = tip/BigInt(100)*BigInt(13);
    const maxPriorityFeePerGas = tip + buffer;
    const maxFeePerGas = block?.baseFeePerGas
      ? block.baseFeePerGas * BigInt(2) + maxPriorityFeePerGas
      : maxPriorityFeePerGas;
    
      return {maxPriorityFeePerGas, maxFeePerGas}
  }
  
  interface GasEstimate {
    preVerificationGas: BigNumberish;
    verificationGasLimit: BigNumberish;
    callGasLimit: BigNumberish;
  
    // TODO: remove this with EntryPoint v0.7
    verificationGas: BigNumberish;
  }
  
  //ported from https://github.com/stackup-wallet/userop.js/blob/main/src/preset/middleware/gasLimit.ts
  export async function getGasLimit(provider: JsonRpcProvider, entryPoint: AddressLike, op: UserOperation) {
    const est = (await provider.send("eth_estimateUserOperationGas", [
      operationToJson(op),
      entryPoint,
    ])) as GasEstimate;
  
    return {
      preVerificationGas: est.preVerificationGas,
      verificationGasLimit: est.verificationGasLimit,
      callGasLimit: est.callGasLimit,
    };
  }
  
  

  
  //according to https://docs.alchemy.com/reference/eth-senduseroperation
  export async function sendUserOperation(provider: JsonRpcProvider, entryPoint: AddressLike, op: UserOperation) {
    const userOperationHash = (await provider.send("eth_sendUserOperation", [
      operationToJson(op),
      entryPoint,
    ])) as string;
  
    return userOperationHash
  }

  interface AlchemyRequestGasAndPaymasterAndDataResult {
    
        paymasterAndData: string,
        callGasLimit: BigNumberish,
        verificationGasLimit: BigNumberish,
        preVerificationGas: BigNumberish,
        maxFeePerGas: BigNumberish,
        maxPriorityFeePerGas: BigNumberish,
        error: {
            code: number
        
    }
  }

  export async function getAlchemyRequestGasAndPaymasterAndData(provider: JsonRpcProvider, entryPoint: AddressLike, op: UserOperation) {
    const resp = (await provider.send("alchemy_requestGasAndPaymasterAndData", [
        {
            policyId: "c42ec59a-3874-4cdd-a611-4d0857098d7b",
            entryPoint: entryPoint,
            dummySignature: op.signature,
            userOperation: operationToJson(op),

        }
    ])) as AlchemyRequestGasAndPaymasterAndDataResult ;

    console.log(resp)
    return {
        maxFeePerGas: resp.maxFeePerGas,
        maxPriorityFeePerGas: resp.maxPriorityFeePerGas,
        preVerificationGas: resp.preVerificationGas,
        verificationGasLimit: resp.verificationGasLimit,
        callGasLimit: resp.callGasLimit,
        paymasterAndData: resp.paymasterAndData,
      };
  }
  
  //ported from https://github.com/stackup-wallet/userop.js/blob/main/src/utils/json.ts
  export function operationToJson(op: UserOperation) {
    return Object.keys(op)
      .map((key) => {
        let val = (op as any)[key];
        if (typeof val !== "string" || !val.startsWith("0x")) {
          val = ethers.toQuantity(val);
        }
        return [key, val];
      })
      .reduce(
        (set, [k, v]) => ({
          ...set,
          [k]: v,
        }),
        {}
      ) as UserOperation;
  }
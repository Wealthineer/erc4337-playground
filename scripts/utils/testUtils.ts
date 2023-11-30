import { defaultAbiCoder } from '@ethersproject/abi'
import { getBytes } from 'ethers'
import { ethers } from 'hardhat'




export const AddressZero = ethers.ZeroAddress

const panicCodes: { [key: number]: string } = {
    // from https://docs.soliditylang.org/en/v0.8.0/control-structures.html
    0x01: 'assert(false)',
    0x11: 'arithmetic overflow/underflow',
    0x12: 'divide by zero',
    0x21: 'invalid enum value',
    0x22: 'storage byte array that is incorrectly encoded',
    0x31: '.pop() on an empty array.',
    0x32: 'array sout-of-bounds or negative index',
    0x41: 'memory overflow',
    0x51: 'zero-initialized variable of internal function type'
  }

export function callDataCost (data: string): number {
    return getBytes(data)
      .map(x => x === 0 ? 4 : 16)
      .reduce((sum, x) => sum + x)
  }

// rethrow "cleaned up" exception.
// - stack trace goes back to method (or catch) line, not inner provider
// - attempt to parse revert data (needed for geth)
// use with ".catch(rethrow())", so that current source file/line is meaningful.
export function rethrow (): (e: Error) => void {
    const callerStack = new Error().stack!.replace(/Error.*\n.*at.*\n/, '').replace(/.*at.* \(internal[\s\S]*/, '')
  
    if (arguments[0] != null) {
      throw new Error('must use .catch(rethrow()), and NOT .catch(rethrow)')
    }
    return function (e: Error) {
      const solstack = e.stack!.match(/((?:.* at .*\.sol.*\n)+)/)
      const stack = (solstack != null ? solstack[1] : '') + callerStack
      // const regex = new RegExp('error=.*"data":"(.*?)"').compile()
      const found = /error=.*?"data":"(.*?)"/.exec(e.message)
      let message: string
      if (found != null) {
        const data = found[1]
        message = decodeRevertReason(data) ?? e.message + ' - ' + data.slice(0, 100)
      } else {
        message = e.message
      }
      const err = new Error(message)
      err.stack = 'Error: ' + message + '\n' + stack
      throw err
    }
  }

  export function decodeRevertReason (data: string, nullIfNoMatch = true): string | null {
    const methodSig = data.slice(0, 10)
    const dataParams = '0x' + data.slice(10)
  
    if (methodSig === '0x08c379a0') {
      const [err] = defaultAbiCoder.decode(['string'], dataParams)
      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
      return `Error(${err})`
    } else if (methodSig === '0x00fa072b') {
      const [opindex, paymaster, msg] = defaultAbiCoder.decode(['uint256', 'address', 'string'], dataParams)
      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
      return `FailedOp(${opindex}, ${paymaster !== AddressZero ? paymaster : 'none'}, ${msg})`
    } else if (methodSig === '0x4e487b71') {
      const [code] = defaultAbiCoder.decode(['uint256'], dataParams)
      return `Panic(${panicCodes[code] ?? code} + ')`
    } else if (methodSig === '0x8d6ea8be') {
      const [reason] = defaultAbiCoder.decode(['string'], dataParams)
      return `CustomError("${reason as string}")`
    } else if (methodSig === '0xad7954bc') {
      const [reasonBytes] = defaultAbiCoder.decode(['bytes'], dataParams)
      const reason = decodeRevertReason(reasonBytes)
      return `PostOpReverted(${reason as string})`
    }
    if (!nullIfNoMatch) {
      return data
    }
    return null
  }

import { network, ethers } from "hardhat";
import dotenv from "dotenv";
import { BatchedWallet } from '../../typechain-types';
import { JsonRpcProvider } from 'ethers';
import { createErc20TransferSponsored } from '../utils/batchedWalletUtils';
import { sendUserOperation } from '../utils/userOperationUtils';
import { getDeploymentAddress } from '../utils/trackDeployments';


dotenv.config();


 

async function main() {

  const alchemyRpcUrl = process.env.RPC_URL_SEPOLIA || "not_set";
  const entryPointAddress = process.env.SEPOLIA_ENTRY_POINT || "not_set"

  const walletAddress = getDeploymentAddress("BatchedWallet");
  const paymasterAddress = getDeploymentAddress("BatchedWalletPaymaster");
  const testERC20Address = getDeploymentAddress("TestERC20");

  const [signer] = await ethers.getSigners();

  console.log(`owner is ${signer.address}`)

  const chainId = network.config.chainId;
  const networkName = network.name;

  const provider = new JsonRpcProvider(alchemyRpcUrl)

  console.log(`Interacting with network ${networkName} with chainId ${chainId}...`);
  const testERC20 = await ethers.getContractAt("TestERC20", testERC20Address);
  const batchedWallet = await ethers.getContractAt("BatchedWallet", walletAddress) as BatchedWallet;
  const paymaster = await ethers.getContractAt("BatchedWalletPaymaster", paymasterAddress);
  
  const userOperation = await createErc20TransferSponsored(batchedWallet, signer.address, ethers.parseEther("99"), paymaster, testERC20, provider, chainId || 11155111)

  const userOperationHash = await sendUserOperation(provider, entryPointAddress, userOperation)

  console.log(`userOperationHash is ${userOperationHash}`)
 
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
});
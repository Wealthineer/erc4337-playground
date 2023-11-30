import { network, ethers } from "hardhat";
import dotenv from "dotenv";
import { JsonRpcProvider } from 'ethers';
import { createErc20BatchTransfer, createErc20Transfer, createEthTransfer } from '../utils/batchedWalletUtils';
import { sendUserOperation } from '../utils/userOperationUtils';
import { getDeploymentAddress } from '../utils/trackDeployments';


dotenv.config();

const alchemyRpcUrl = process.env.RPC_URL_SEPOLIA || "not_set";
 

async function main() {

  const [signer] = await ethers.getSigners();

  console.log(`owner is ${signer.address}`)

  const chainId = network.config.chainId;
  const networkName = network.name;

  const provider = new JsonRpcProvider(alchemyRpcUrl)

  console.log(`Interacting with network ${networkName} with chainId ${chainId}...`);
  
  const walletAddress = await getDeploymentAddress("BatchedWallet");
  const batchedWallet = await ethers.getContractAt("BatchedWallet", walletAddress);
  const testERC20Address = await getDeploymentAddress("TestERC20");
  const erc20 = await ethers.getContractAt("ERC20", testERC20Address);
  

  const batchAmount = [ethers.parseEther("1"), ethers.parseEther("2"), ethers.parseEther("3"), ethers.parseEther("4"), ethers.parseEther("5")]
  const batchTo = [signer.address, signer.address, signer.address, signer.address, signer.address]

  // const userOperation = await createEthTransfer(batchedWallet, signer.address, ethers.parseEther("0.01"), provider, chainId || 11155111)
  // const userOperation = await createErc20Transfer(batchedWallet, signer.address, ethers.parseEther("7"), erc20, provider, chainId || 11155111)
  const userOperation = await createErc20BatchTransfer(batchedWallet, batchTo, batchAmount, erc20, provider, chainId || 11155111)

  const userOperationHash = await sendUserOperation(provider, await batchedWallet.entryPoint(), userOperation)

  console.log(`userOperationHash is ${userOperationHash}`)
 
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
});
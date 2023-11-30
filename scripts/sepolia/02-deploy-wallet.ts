import { network, ethers } from "hardhat";
import dotenv from "dotenv";
import { getDeploymentAddress, updateDeployments } from '../utils/trackDeployments';

dotenv.config();
 

async function main() {

  const [deployer] = await ethers.getSigners();

  const chainId = network.config.chainId;
  const networkName = network.name;

  console.log(`Interacting with network ${networkName} with chainId ${chainId}...`);
  console.log("Executing transaction with the account:", deployer.address);

  // const walletFactoryAddress = process.env.SEPOLIA_BATCHED_WALLET_FACTORY || "not_set"
  const walletFactoryAddress = await getDeploymentAddress("BatchedWalletFactory");

  const batchedWalletFactory = await ethers.getContractAt("BatchedWalletFactory", walletFactoryAddress);

  await batchedWalletFactory.createAccount(deployer, 0);

  const batchedWalletAddress = await batchedWalletFactory.returnAddress(deployer, 0);

  console.log(`BatchedWallet deployed to ${batchedWalletAddress}`);
  updateDeployments("BatchedWallet", batchedWalletAddress.toString());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
});
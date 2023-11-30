import { network, ethers } from "hardhat";
import dotenv from "dotenv";
import { updateDeployments } from '../utils/trackDeployments';

dotenv.config();
 

async function main() {

  const [deployer] = await ethers.getSigners();
  
  const chainId = network.config.chainId;
  const networkName = network.name;

  console.log(`Interacting with network ${networkName} with chainId ${chainId}...`);
  console.log("Executing transaction with the account:", deployer.address);


  const entryPointAddress = process.env.SEPOLIA_ENTRY_POINT || "not_set"
    
  const batchedWalletPaymaster = await ethers.deployContract("BatchedWalletPaymaster", [entryPointAddress, deployer.address]);

  console.log(`BatchedWalletPaymaster deployed to ${batchedWalletPaymaster.target}`);
  updateDeployments("BatchedWalletPaymaster", batchedWalletPaymaster.target.toString());

}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
});
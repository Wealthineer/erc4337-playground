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
    
  const batchedWalletFactory = await ethers.deployContract("BatchedWalletFactory", [entryPointAddress], {from: deployer});

  console.log(`BatchedWalletFactory deployed to ${batchedWalletFactory.target}`);


updateDeployments("BatchedWalletFactory", batchedWalletFactory.target.toString());

}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
});
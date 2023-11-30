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
    

  const testERC20 = await ethers.deployContract("TestERC20", [], {from: deployer});


  console.log(`TestERC20 deployed to ${testERC20.target}`);
  updateDeployments("TestERC20", testERC20.target.toString());

}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
});
import { network, ethers } from "hardhat";
import dotenv from "dotenv";
import { getDeploymentAddress } from '../utils/trackDeployments';

dotenv.config();
 

async function main() {

  const [deployer] = await ethers.getSigners();

  const chainId = network.config.chainId;
  const networkName = network.name;

  console.log(`Interacting with network ${networkName} with chainId ${chainId}...`);
  console.log("Executing transaction with the account:", deployer.address);

  const paymasterAddress = await getDeploymentAddress("BatchedWalletPaymaster");
  const paymaster = await ethers.getContractAt("BatchedWalletPaymaster", paymasterAddress);



  const resp = await paymaster.deposit({value: ethers.parseEther("0.05")});
  await resp.wait();
  

  const etherBalance = await paymaster.getDeposit();
 

  console.log(`Paymaster at ${paymasterAddress} funded.`);
  console.log(`Paymaster holds ${ethers.formatEther(etherBalance)} ETH at Entrypoint ${await paymaster.entryPoint()}`);

}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
});
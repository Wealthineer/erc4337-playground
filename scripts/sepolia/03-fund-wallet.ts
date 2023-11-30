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

  const walletAddress = await getDeploymentAddress("BatchedWallet");
  const batchedWallet = await ethers.getContractAt("BatchedWallet", walletAddress);
  const testERC20Address = await getDeploymentAddress("TestERC20");
  const testERC20 = await ethers.getContractAt("TestERC20", testERC20Address);

  await deployer.sendTransaction({to: batchedWallet.target, value: ethers.parseEther("0.1")});
  await (await testERC20.mint(batchedWallet.target, ethers.parseEther("5000"))).wait(1);

  const etherBalance = await ethers.provider.getBalance(batchedWallet.target);
  const erc20Balance = await testERC20.balanceOf(batchedWallet.target);

  console.log(`BatchedWallet at ${batchedWallet.target} funded.`);
  console.log(`BatchedWallet holds ${ethers.formatEther(etherBalance)} ETH`);
  console.log(`BatchedWallet holds ${ethers.formatEther(erc20Balance)} TEST`);

}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
});
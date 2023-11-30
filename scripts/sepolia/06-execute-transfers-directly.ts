import { network, ethers } from "hardhat";
import dotenv from "dotenv";
import { getDeploymentAddress } from '../utils/trackDeployments';

dotenv.config();
 

async function main() {

  const [signer] = await ethers.getSigners();

  console.log(`owner is ${signer.address}`)

  const chainId = network.config.chainId;
  const networkName = network.name;

  console.log(`Interacting with network ${networkName} with chainId ${chainId}...`);


  const walletAddress = await getDeploymentAddress("BatchedWallet");
  const batchedWallet = await ethers.getContractAt("BatchedWallet", walletAddress);
  const testERC20Address = await getDeploymentAddress("TestERC20");
  const erc20 = await ethers.getContractAt("ERC20", testERC20Address);


  const transferCallData = erc20.interface.encodeFunctionData("transfer", [signer.address, ethers.parseEther("5")]);
  const transferCallData2 = erc20.interface.encodeFunctionData("transfer", [signer.address, ethers.parseEther("4")]);
  const transferCallData3 = erc20.interface.encodeFunctionData("transfer", [signer.address, ethers.parseEther("3")]);
  const transferCallData4 = erc20.interface.encodeFunctionData("transfer", [signer.address, ethers.parseEther("2")]);
  const transferValue = ethers.parseEther("0.01");
  const callDataBatch = [transferCallData, transferCallData2, transferCallData3, transferCallData4, "0x"];
  const valueBatch = [BigInt(0), BigInt(0), BigInt(0), BigInt(0), transferValue];
  const toBatch = [erc20.target,erc20.target,erc20.target,erc20.target,signer.address]


  //ETH transfer
  // await (await batchedWallet.execute(signer.address, transferValue, "0x")).wait(1);
  //ERC20 transfer
  // await (await batchedWallet.execute(erc20.target, 0, transferCallData)).wait(1)
  //Batched transfer for ERC20 and ETH - see above how the input was composed in the arrays
  await (await batchedWallet.executeBatch(toBatch, valueBatch, callDataBatch)).wait(1)

  const signerBalance = await erc20.balanceOf(signer.address);
  const walletBalance = await erc20.balanceOf(walletAddress);

  const erc20Symbol = await erc20.symbol()

  console.log(`Wallet holds ${ethers.formatEther(walletBalance)} ${erc20Symbol}`);
  console.log(`Signer holds ${ethers.formatEther(signerBalance)} ${erc20Symbol}`);

 
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
});
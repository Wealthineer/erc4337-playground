import {
    loadFixture,
  } from "@nomicfoundation/hardhat-toolbox/network-helpers";
  import { expect } from "chai";
  import { ethers, network } from "hardhat";
import { createErc20Transfer } from '../scripts/utils/batchedWalletUtils';
import { getUserOpHash, signUserOp, signUserOpWithSigner } from '../scripts/utils/UserOp';
import { UserOperation } from '../scripts/utils/UserOperation';
import { Wallet } from 'ethers';
import exp from 'constants';
import { sign } from 'crypto';

  //
  
  describe("BatchedWallet", function () {
    // We define a fixture to reuse the same setup in every test.
    // We use loadFixture to run this setup once, snapshot that state,
    // and reset Hardhat Network to that snapshot in every test.
    async function deploySetupFixture() {
      
        // Contracts are deployed using the first signer/account by default
        const [owner, otherAccount] = await ethers.getSigners();

        const EntryPoint = await ethers.getContractFactory("EntryPoint");
        const entryPoint = await EntryPoint.deploy();

        const TestERC20 = await ethers.getContractFactory("TestERC20");
        const testERC20 = await TestERC20.deploy();

        const TestERC1155 = await ethers.getContractFactory("TestERC1155");
        const testERC1155 = await TestERC1155.deploy();
  
        const BatchedWalletFactory = await ethers.getContractFactory("BatchedWalletFactory");
        const batchedWalletFactory = await BatchedWalletFactory.deploy(entryPoint.target);

        await batchedWalletFactory.createAccount(owner, 0);

        const batchedWalletAddress = await batchedWalletFactory.returnAddress(owner, 0);
        const batchedWallet = await ethers.getContractAt("BatchedWallet", batchedWalletAddress);

        const BatchedWalletPaymaster = await ethers.getContractFactory("BatchedWalletPaymaster");
        const batchedWalletPaymaster = await BatchedWalletPaymaster.deploy(entryPoint.target, owner.address);

        // impersonate entryPoint address
        await network.provider.request({
          method: "hardhat_impersonateAccount",
          params: [entryPoint.target],
        });
     
        // get entryPoint signer as an impersonated account
        const entryPointSigner = await ethers.getSigner(entryPoint.target.toString());
        // send some ETH to entryPoint to pay for initiated transactions
        await owner.sendTransaction({to: entryPointSigner.address, value: ethers.parseEther("1")});
    
        return {batchedWallet, batchedWalletFactory, entryPoint, entryPointSigner, testERC20, testERC1155, batchedWalletPaymaster, owner, otherAccount };
    }
  
    describe("Deployment of Wallet", function () {
      it("Should set the right owner", async function () {
        const { batchedWalletFactory, owner } = await loadFixture(deploySetupFixture);

        await batchedWalletFactory.createAccount(owner, 1);
        const batchedWalletAddress = await batchedWalletFactory.returnAddress(owner, 1);
        const batchedWallet = await ethers.getContractAt("BatchedWallet", batchedWalletAddress);

        expect(await batchedWallet.owner()).to.equal(owner.address);
      });
  
      it("Should set the right entry point", async function () {
        const { batchedWalletFactory, entryPoint, owner } = await loadFixture(deploySetupFixture);

        await batchedWalletFactory.createAccount(owner, 1);
        const batchedWalletAddress = await batchedWalletFactory.returnAddress(owner, 1);
        const batchedWallet = await ethers.getContractAt("BatchedWallet", batchedWalletAddress);

        expect(await batchedWallet.entryPoint()).to.equal(entryPoint.target);
      });

    });

    describe("Deposit assets to contract", function () {
        it("Should accept ETH", async function () {
            const { batchedWallet, owner } = await loadFixture(deploySetupFixture);
            expect(await ethers.provider.getBalance(batchedWallet.target)).to.equal(0);
            await owner.sendTransaction({to: batchedWallet.target, value: 1000});
            expect(await ethers.provider.getBalance(batchedWallet.target)).to.equal(1000);

        });

        it("Should accept ERC20 tokens", async function () {
            const { batchedWallet, testERC20 } = await loadFixture(deploySetupFixture);
            expect(await testERC20.balanceOf(batchedWallet.target)).to.equal(0);
            await testERC20.mint(batchedWallet.target, 1000);
            expect(await testERC20.balanceOf(batchedWallet.target)).to.equal(1000);

        });

        it("Should reject ERC1155 tokens", async function () {
          const { batchedWallet, testERC1155, owner } = await loadFixture(deploySetupFixture);

          await testERC1155.mint(owner.address, 1, 1);

          await expect(testERC1155.mint(batchedWallet.target, 1, 1)).to.be.reverted;

      });

    });

    describe("execute()", function () {
        it("Shouldn't be callable from anyone else than owner or entrypoint", async function () {
            const { batchedWallet, owner, otherAccount } = await loadFixture(deploySetupFixture);
            await owner.sendTransaction({to: batchedWallet.target, value: ethers.parseEther("1")});
            expect(await ethers.provider.getBalance(batchedWallet.target)).to.equal(ethers.parseEther("1"));
            await expect( batchedWallet.connect(otherAccount).execute(owner.address, ethers.parseEther("0.1"), "0x")).to.be.revertedWith("account: not Owner or EntryPoint");
        });

        it("Should allow the owner to move ETH", async function () {
          const { batchedWallet, owner, otherAccount} = await loadFixture(deploySetupFixture);

          await owner.sendTransaction({to: batchedWallet.target, value: ethers.parseEther("1")});

          const startingBalanceWallet = await ethers.provider.getBalance(batchedWallet.target)
          const startingBalanceReceiver = await ethers.provider.getBalance(otherAccount.address)
          const amountToMove = ethers.parseEther("0.5");

          await batchedWallet.connect(owner).execute(otherAccount.address, amountToMove, "0x")

          expect(await ethers.provider.getBalance(batchedWallet.target)).to.equal(startingBalanceWallet - amountToMove);
          expect(await ethers.provider.getBalance(otherAccount.address)).to.equal(startingBalanceReceiver + amountToMove);

        });

        it("Should allow the owner to move ERC20", async function () {
          const { batchedWallet, owner, testERC20 } = await loadFixture(deploySetupFixture);

          await testERC20.mint(batchedWallet.target, ethers.parseEther("1000"));
          
          const startingBalanceWallet = await testERC20.balanceOf(batchedWallet.target)
          const startingBalanceOwner = await testERC20.balanceOf(owner.address)
          const amountToMove = ethers.parseEther("50");

          const callData = testERC20.interface.encodeFunctionData("transfer", [owner.address, amountToMove]);

          await batchedWallet.connect(owner).execute(testERC20.target, 0, callData);

          expect(await testERC20.balanceOf(batchedWallet.target)).to.equal(startingBalanceWallet - amountToMove);
          expect(await testERC20.balanceOf(owner.address)).to.equal(startingBalanceOwner + amountToMove);
        });

        it("Should allow the entrypoint to move ETH", async function () {
          const { batchedWallet, owner, entryPointSigner, otherAccount} = await loadFixture(deploySetupFixture);

          await owner.sendTransaction({to: batchedWallet.target, value: ethers.parseEther("1")});

          const startingBalanceWallet = await ethers.provider.getBalance(batchedWallet.target)
          const startingBalanceReceiver = await ethers.provider.getBalance(otherAccount.address)
          const amountToMove = ethers.parseEther("0.5");

          await batchedWallet.connect(entryPointSigner).execute(otherAccount.address, amountToMove, "0x")

          expect(await ethers.provider.getBalance(batchedWallet.target)).to.equal(startingBalanceWallet - amountToMove);
          expect(await ethers.provider.getBalance(otherAccount.address)).to.equal(startingBalanceReceiver + amountToMove);
        });

        it("Should allow the entrypoint to move ERC20", async function () {
          const { batchedWallet, owner, entryPointSigner, testERC20 } = await loadFixture(deploySetupFixture);

          await testERC20.mint(batchedWallet.target, ethers.parseEther("1000"));
          
          const startingBalanceWallet = await testERC20.balanceOf(batchedWallet.target)
          const startingBalanceOwner = await testERC20.balanceOf(owner.address)
          const amountToMove = ethers.parseEther("50");

          const callData = testERC20.interface.encodeFunctionData("transfer", [owner.address, amountToMove]);

          await batchedWallet.connect(entryPointSigner).execute(testERC20.target, 0, callData);

          expect(await testERC20.balanceOf(batchedWallet.target)).to.equal(startingBalanceWallet - amountToMove);
          expect(await testERC20.balanceOf(owner.address)).to.equal(startingBalanceOwner + amountToMove);
        });

        it("Should fail if there is not enough ETH", async function () {
          const { batchedWallet, entryPointSigner, otherAccount} = await loadFixture(deploySetupFixture);
          expect(await ethers.provider.getBalance(batchedWallet.target)).to.equal(0); 

          const amountToMove = ethers.parseEther("0.5");

          await expect(batchedWallet.connect(entryPointSigner).execute(otherAccount.address, amountToMove, "0x")).to.be.reverted;
        });

        it("Should fail if there is not enough ERC20", async function () {
          const { batchedWallet, owner, entryPointSigner, testERC20 } = await loadFixture(deploySetupFixture);
          expect(await testERC20.balanceOf(batchedWallet.target)).to.equal(0);
          
          const amountToMove = ethers.parseEther("50");

          const callData = testERC20.interface.encodeFunctionData("transfer", [owner.address, amountToMove]);

          await expect(batchedWallet.connect(entryPointSigner).execute(testERC20.target, 0, callData)).to.be.reverted;
        });
    });

    describe("executeBatch()", function () {
        it("Shouldn't be callable from anyone else than owner or entrypoint", async function () {
            const { batchedWallet, owner, otherAccount, testERC20 } = await loadFixture(deploySetupFixture);
            await owner.sendTransaction({to: batchedWallet.target, value: ethers.parseEther("1")});
            await testERC20.mint(batchedWallet.target, ethers.parseEther("1000"));
            expect(await ethers.provider.getBalance(batchedWallet.target)).to.equal(ethers.parseEther("1"));
            await expect( batchedWallet.connect(otherAccount).executeBatch([owner.address, owner.address], [ethers.parseEther("0.1"),ethers.parseEther("0.1")], ["0x", "0x"])).to.be.revertedWith("account: not Owner or EntryPoint");
        });

        it("Should allow the owner to move ETH and ERC20", async function () {
          const { batchedWallet, owner, otherAccount, testERC20 } = await loadFixture(deploySetupFixture);

          await testERC20.mint(batchedWallet.target, ethers.parseEther("1000"));
          await owner.sendTransaction({to: batchedWallet.target, value: ethers.parseEther("1")});
          
          const startingBalanceErc20Wallet = await testERC20.balanceOf(batchedWallet.target)
          const startingBalanceErc20Receiver = await testERC20.balanceOf(otherAccount.address)
          const startingBalanceEthWallet = await ethers.provider.getBalance(batchedWallet.target)
          const startingBalanceEthReceiver = await ethers.provider.getBalance(otherAccount.address)
          const amountErc20ToMove = ethers.parseEther("50");
          const amountEthToMove = ethers.parseEther("0.5");

          const callDataErc20Transfer = testERC20.interface.encodeFunctionData("transfer", [otherAccount.address, amountErc20ToMove]);

          const to = [testERC20.target, otherAccount.address];
          const value = [0, amountEthToMove];
          const data = [callDataErc20Transfer, "0x"];

          await batchedWallet.connect(owner).executeBatch(to, value, data);

          expect(await testERC20.balanceOf(batchedWallet.target)).to.equal(startingBalanceErc20Wallet - amountErc20ToMove);
          expect(await testERC20.balanceOf(otherAccount.address)).to.equal(startingBalanceErc20Receiver + amountErc20ToMove);
          expect(await ethers.provider.getBalance(batchedWallet.target)).to.equal(startingBalanceEthWallet - amountEthToMove);
          expect(await ethers.provider.getBalance(otherAccount.address)).to.equal(startingBalanceEthReceiver + amountEthToMove);
        });

        it("Should allow the entrypoint to move ETH and ERC20", async function () {
          const { batchedWallet, owner, otherAccount, testERC20, entryPointSigner } = await loadFixture(deploySetupFixture);

          await testERC20.mint(batchedWallet.target, ethers.parseEther("1000"));
          await owner.sendTransaction({to: batchedWallet.target, value: ethers.parseEther("1")});
          
          const startingBalanceErc20Wallet = await testERC20.balanceOf(batchedWallet.target)
          const startingBalanceErc20Receiver = await testERC20.balanceOf(otherAccount.address)
          const startingBalanceEthWallet = await ethers.provider.getBalance(batchedWallet.target)
          const startingBalanceEthReceiver = await ethers.provider.getBalance(otherAccount.address)
          const amountErc20ToMove = ethers.parseEther("50");
          const amountEthToMove = ethers.parseEther("0.5");

          const callDataErc20Transfer = testERC20.interface.encodeFunctionData("transfer", [otherAccount.address, amountErc20ToMove]);

          const to = [testERC20.target, otherAccount.address];
          const value = [0, amountEthToMove];
          const data = [callDataErc20Transfer, "0x"];

          await batchedWallet.connect(entryPointSigner).executeBatch(to, value, data);

          expect(await testERC20.balanceOf(batchedWallet.target)).to.equal(startingBalanceErc20Wallet - amountErc20ToMove);
          expect(await testERC20.balanceOf(otherAccount.address)).to.equal(startingBalanceErc20Receiver + amountErc20ToMove);
          expect(await ethers.provider.getBalance(batchedWallet.target)).to.equal(startingBalanceEthWallet - amountEthToMove);
          expect(await ethers.provider.getBalance(otherAccount.address)).to.equal(startingBalanceEthReceiver + amountEthToMove);
          
        });

        it("Should fail if there is not enough ETH", async function () {
          const { batchedWallet, owner, otherAccount, testERC20, entryPointSigner } = await loadFixture(deploySetupFixture);

          await testERC20.mint(batchedWallet.target, ethers.parseEther("1000"));

          const amountErc20ToMove = ethers.parseEther("50");
          const amountEthToMove = ethers.parseEther("0.5");

          const callDataErc20Transfer = testERC20.interface.encodeFunctionData("transfer", [otherAccount.address, amountErc20ToMove]);

          const to = [testERC20.target, otherAccount.address];
          const value = [0, amountEthToMove];
          const data = [callDataErc20Transfer, "0x"];

          await expect(batchedWallet.connect(entryPointSigner).executeBatch(to, value, data)).to.be.reverted;


        });

        it("Should fail if there is not enough ERC20", async function () {
          const { batchedWallet, owner, otherAccount, testERC20, entryPointSigner } = await loadFixture(deploySetupFixture);

          await owner.sendTransaction({to: batchedWallet.target, value: ethers.parseEther("1")});

          const amountErc20ToMove = ethers.parseEther("50");
          const amountEthToMove = ethers.parseEther("0.5");

          const callDataErc20Transfer = testERC20.interface.encodeFunctionData("transfer", [otherAccount.address, amountErc20ToMove]);

          const to = [testERC20.target, otherAccount.address];
          const value = [0, amountEthToMove];
          const data = [callDataErc20Transfer, "0x"];

          await expect(batchedWallet.connect(entryPointSigner).executeBatch(to, value, data)).to.be.reverted;
        });

        it("Should fail if the array lengths are not balanced", async function () {
          const { batchedWallet, owner, otherAccount, testERC20 } = await loadFixture(deploySetupFixture);
          await owner.sendTransaction({to: batchedWallet.target, value: ethers.parseEther("1")});
          await testERC20.mint(batchedWallet.target, ethers.parseEther("1000"));
          expect(await ethers.provider.getBalance(batchedWallet.target)).to.equal(ethers.parseEther("1"));
          await expect( batchedWallet.connect(owner).executeBatch([owner.address], [ethers.parseEther("0.1"),ethers.parseEther("0.1")], ["0x", "0x"])).to.be.revertedWithCustomError(batchedWallet, "BatchedWallet_ArrayLengthMissmatch");
          await expect( batchedWallet.connect(owner).executeBatch([owner.address, owner.address], [ethers.parseEther("0.1")], ["0x", "0x"])).to.be.revertedWithCustomError(batchedWallet, "BatchedWallet_ArrayLengthMissmatch");
          await expect( batchedWallet.connect(owner).executeBatch([owner.address, owner.address], [ethers.parseEther("0.1"),ethers.parseEther("0.1")], ["0x"])).to.be.revertedWithCustomError(batchedWallet, "BatchedWallet_ArrayLengthMissmatch");
      
        });
    }); 

    describe("addDeposit()", function () {
      it("Should add the balance to the entry point", async function () {
        const { batchedWallet, entryPoint, otherAccount } = await loadFixture(deploySetupFixture);
        await batchedWallet.connect(otherAccount).addDeposit({value: ethers.parseEther("1")});
        expect(await entryPoint.balanceOf(batchedWallet.target)).to.equal(ethers.parseEther("1"))
      })

    })

    describe("getDeposit()", function () {
      it("Should return the existing deposit at the entryPoint", async function () {
        const { batchedWallet, entryPoint, otherAccount } = await loadFixture(deploySetupFixture);
        await batchedWallet.connect(otherAccount).addDeposit({value: ethers.parseEther("1")});
        expect(await entryPoint.balanceOf(batchedWallet.target)).to.equal(ethers.parseEther("1"))
        expect(await batchedWallet.connect(otherAccount).getDeposit()).to.equal(ethers.parseEther("1"))
      })
    })

    describe("withdrawDeposit()", function () {
      it("Should revert if not called by owner", async function () {
        const { batchedWallet, owner, otherAccount } = await loadFixture(deploySetupFixture);
        await batchedWallet.connect(owner).addDeposit({value: ethers.parseEther("1")});

        const amountToWithdraw = ethers.parseEther("0.5");

        await expect(batchedWallet.connect(otherAccount).withdrawDepositTo(otherAccount.address, amountToWithdraw)).to.be.revertedWith("only owner");

      })

      it("Should revert if less ETH was deposited than is requested", async function () {
        const { batchedWallet, entryPoint, owner, otherAccount } = await loadFixture(deploySetupFixture);
        await batchedWallet.connect(owner).addDeposit({value: ethers.parseEther("1")});

        const startingBalanceOtherAccount = await ethers.provider.getBalance(otherAccount.address)
        const startingDeposit = await batchedWallet.connect(otherAccount).getDeposit();
        const amountToWithdraw = ethers.parseEther("2");

        await expect(batchedWallet.connect(owner).withdrawDepositTo(otherAccount.address, amountToWithdraw)).to.be.reverted;

      })

      it("Should return the requested amount", async function () {
        const { batchedWallet, entryPoint, owner, otherAccount } = await loadFixture(deploySetupFixture);
        await batchedWallet.connect(owner).addDeposit({value: ethers.parseEther("1")});

        const startingBalanceOtherAccount = await ethers.provider.getBalance(otherAccount.address)
        const startingDeposit = await batchedWallet.connect(otherAccount).getDeposit();
        const amountToWithdraw = ethers.parseEther("0.5");

        await batchedWallet.connect(owner).withdrawDepositTo(otherAccount.address, amountToWithdraw);

        expect(await entryPoint.balanceOf(batchedWallet.target)).to.equal(startingDeposit - amountToWithdraw);
        expect(await ethers.provider.getBalance(otherAccount.address)).to.equal(startingBalanceOtherAccount + amountToWithdraw);

      })
    });

    describe("_validateSignature()", function () {
      it("Should revert when not called by entryPoint", async function () {
        const { batchedWallet, entryPoint, owner, otherAccount, testERC20 } = await loadFixture(deploySetupFixture);
        let userOp: UserOperation  = {
          sender: owner.address,
          nonce: 0,
          initCode: "0x",
          callData: "0x",
          callGasLimit: 0,
          verificationGasLimit: 0,
          preVerificationGas: 0,
          maxFeePerGas: 0,
          maxPriorityFeePerGas: 0,
          paymasterAndData: "0x",
          signature: "0x123"
        }

        userOp = await signUserOpWithSigner(userOp, owner, entryPoint.target.toString(), network.config.chainId  || 31337);

        const userOpHash = getUserOpHash(userOp, entryPoint.target.toString(), network.config.chainId  || 31337);

        await expect(batchedWallet.connect(owner).validateUserOp(userOp, userOpHash, ethers.parseEther("0.1"))).to.be.revertedWith("account: not from EntryPoint");

      })

      it("Should return 1 when the userOperation's signature is not valid", async function () {//BatchedWalletValidateUserOpWrapper is used to expose the internal function for unit testing
        const { batchedWallet, entryPoint, owner, otherAccount } = await loadFixture(deploySetupFixture);
        await owner.sendTransaction({to: batchedWallet.target, value: ethers.parseEther("10")});
        
        let userOp: UserOperation  = {
          sender: owner.address,
          nonce: 0,
          initCode: "0x",
          callData: "0x",
          callGasLimit: 0,
          verificationGasLimit: 0,
          preVerificationGas: 0,
          maxFeePerGas: 0,
          maxPriorityFeePerGas: 0,
          paymasterAndData: "0x",
          signature: "0x"
        }

        const BatchedWalletValidateUserOpWrapper = await ethers.getContractFactory("BatchedWalletValidateUserOpWrapper");
        const batchedWalletValidateUserOpWrapper = await BatchedWalletValidateUserOpWrapper.deploy(entryPoint.target);

        batchedWalletValidateUserOpWrapper.initialize(owner.address);

        const signerWallet = new Wallet("0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80")

        expect(owner.address).to.equal(signerWallet.address);

        userOp = signUserOp(userOp, signerWallet, entryPoint.target.toString(), network.config.chainId  || 31337);
        const userOpHash = getUserOpHash(userOp, entryPoint.target.toString(), network.config.chainId  || 31337);

        await batchedWalletValidateUserOpWrapper.setOwner(otherAccount.address);
        await expect(batchedWalletValidateUserOpWrapper.connect(owner).validateSignature(userOp, userOpHash)).to.be.revertedWith("signature validation failed");})

      it("Should return 0 when validation succeeds", async function () { //BatchedWalletValidateUserOpWrapper is used to expose the internal function for unit testing
        const { batchedWallet, entryPoint, owner } = await loadFixture(deploySetupFixture);
        await owner.sendTransaction({to: batchedWallet.target, value: ethers.parseEther("10")});
        
        let userOp: UserOperation  = {
          sender: owner.address,
          nonce: 0,
          initCode: "0x",
          callData: "0x",
          callGasLimit: 0,
          verificationGasLimit: 0,
          preVerificationGas: 0,
          maxFeePerGas: 0,
          maxPriorityFeePerGas: 0,
          paymasterAndData: "0x",
          signature: "0x"
        }

        const BatchedWalletValidateUserOpWrapper = await ethers.getContractFactory("BatchedWalletValidateUserOpWrapper");
        const batchedWalletValidateUserOpWrapper = await BatchedWalletValidateUserOpWrapper.deploy(entryPoint.target);

        batchedWalletValidateUserOpWrapper.initialize(owner.address);

        const signerWallet = new Wallet("0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80")

        expect(owner.address).to.equal(signerWallet.address);

        userOp = signUserOp(userOp, signerWallet, entryPoint.target.toString(), network.config.chainId  || 31337);
        const userOpHash = getUserOpHash(userOp, entryPoint.target.toString(), network.config.chainId  || 31337);

        await batchedWalletValidateUserOpWrapper.setOwner(owner.address);
        await expect(batchedWalletValidateUserOpWrapper.connect(owner).validateSignature(userOp, userOpHash)).to.be.revertedWith("signature validation success");
      })
    });

  });
  
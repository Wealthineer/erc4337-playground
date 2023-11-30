# ERC4337 Playground

This project served as a ways to learn about ERC4337 - Account Abstraction and how to use it.

## Useful resources for learning about ERC4437

- [Official EIP4337](https://eips.ethereum.org/EIPS/eip-4337)
- [Reference Implementation](https://github.com/eth-infinitism/account-abstraction/tree/develop/contracts/core)


- [Stackup Docs](https://docs.stackup.sh/)
- [Stackup'userop.js Repo](https://github.com/stackup-wallet/userop.js/)
- [Alchemy Docs for Bundler API endpoints](https://docs.alchemy.com/reference/bundler-api-endpoints)
- [Account Kit by Alchemy](https://accountkit.alchemy.com/overview/getting-started.html)
- [Trampoline - boilerplate to get started with building your own AA Browser Extension](https://github.com/eth-infinitism/trampoline)

## Structure of this Repo

- `contracts/` - contains a Walletimplementation `BatchedWallet.sol`, that is a modification of the `SimpleAccount.sol` from the reference implementation, the required factory contract to deploy instances of the wallet and a simple Paymaster implementation
- `scripts/sepolia/` - contains the hardhat scripts to deploy the wallet on Sepolia testnet, interact with it directly, through a bundler and also using transactions sponsored by a Paymaster
- `scripts/utils/` - contains a collection of helper functions of functions and types I collected, converted to ethers v6 or wrote myself that are useful to composing user operations
- `test/` - contains the tests for `BatchedWallet.sol`

## BatchedWallet.sol
This wallet implementation supports the ERC4337 standard and is a modification of the `SimpleAccount.sol` from the reference implementation. It is a simple wallet that can be deployed by the  factory contract `BatchedWalletFactory.sol`. It is a very simple implementation that only supports ETH and ERC20 tokens. No ERC721 or ERC1155 tokens can be deposited into this contract.

It supports the execution of arbitrary contract calls through `execute()` and `executeBatch()`. This is realized through forwarding the input directly to a call function. Therefore any contract call can be executed.

Executing multiple transactions in a single call safes gas. By exposing the value of the call for `executedBatch()` this contract can also include ETH transfers in a batch, opposed to the implementation that was chosen in the reference implementation.

The implementation of `_validateSignature()` uses the single EOA signer approach that the reference implementation chose. For simplicity sake there was no more advanced signature validation implemented. However it would be easily possible to e.g. implement a solution that required multiple signers to sign a transaction. The big advantage of account abstraction is the flexibility to implement any kind of signature that can be verified on-chain.

The functions to manage deposits at the EntryPoint were left in the contract but are not strictly necessary, since the required funds for executing a transaction will be transferred to the EntryPoint during the validation of a user operation before it gets executed.

Furthermore this wallet can make use of sponsored transactions through the concept of Paymaster of the ERC4337 standard. This project contains `BatchedWalletPaymaster.sol` as a copy of the `VerifyingPaymaster.sol` from the reference implementation. But any active Paymaster can be used, as long as it approves of the user operation that is requesting the sponsored transaction.

## Seeting up the .env file

You will need to create a `.env` file in the root of the project with the following variables.

To run all scripts you need the private Key for a Wallet with sepoliaETH to fund deployments and transactions on Seoplia.

You will also need an Etherscan API Key if you want to verify your deployed contracts on Etherscan.

As RPC I used Alchemy since they are supporting the Bundler API on Sepolia. You will need to create an account and get an API Key. Can be most likely replaced by any other RPC provider that supports the Bundler API on Sepolia.
0
```shell
PRIVATE_KEY=YourPkWithout0x

ETHERSCAN_API_KEY=EtherscanApiKey
POLYGONSCAN_API_KEY=PolygonScanApiKey

RPC_URL_SEPOLIA=https://eth-sepolia.g.alchemy.com/v2/YourApiKey

SEPOLIA_ENTRY_POINT=0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789
```

## Running the scripts

The scripts follow through the full life cycle of the wallet and explore the different ways to interact with the wallet.

Before running the scripts the project needs to be installed and hardhat needs to compile the contracts:
```shell
npm install
npx hardhat compile

```

The scripts can be executed with the following command and addresses of deployed contracts get written to the `deployments/deployments.json` file, so they can be picked up in later scripts. In the current implementation the addresses will be overwritten every time a script is executed.

```shell

npx hardhat run --network sepolia scripts/sepolia/00-deploy-wallet-factory.ts

```

Depending on what should be achieved, the combination of scripts to execute can be mixed and matched. It is also worth taking a look at the helper functions in `scripts/utils/` that are used in the scripts, depending on the task at hand or when a more detailed understanding of the implementation is the goal.

### [00-deploy-wallet-factory.ts](./scripts/sepolia/00-deploy-wallet-factory.ts)
The initial script deploys the wallet factory with a reference to the EntryPoint on Sepolia.

### [01-deploy-test-erc20.ts](./scripts/sepolia/01-deploy-test-erc20.ts)
To test the wallets ability to interact with ERC20 tokens, this script deploys a test ERC20 token on Sepolia.

### [02-deploy-wallet.ts](./scripts/sepolia/02-deploy-wallet.ts)
By using the wallet factory, this script deploys a new wallet instance on Sepolia. This step is not strictly necessary, since it is possible to include an initCode to deploy the wallet in the first userOperation that gets send to a bundler. However since we first will interact with the wallet directly, not through a bundler, this step is necessary here.

### [03-fund-wallet.ts](./scripts/sepolia/03-fund-wallet.ts)
To be able to execute transactions with the wallet, it needs to have some ETH and ERC20 tokens. This script sends some ETH and ERC20 tokens to the wallet.

### [04-check-wallet-balances.ts](./scripts/sepolia/04-check-wallet-balances.ts)
This script can be used to get the current balance of ETH and the test ERC20 token in the wallet.

### [05-check-signer-balances.ts](./scripts/sepolia/05-check-signer-balances.ts)
This script can be used to get the current balance of ETH and the test ERC20 token in the signer wallet.

### [06-execute-transfers-directly.ts](./scripts/sepolia/06-execute-transfers-directly.ts)
Since the wallet contract allows for the owner to use `execute()` and `executeBatch()` directly, this script shows how to execute erc20 transfers, ETH transfers and a combination of both in a batched call.

### [07-transfer-with-bundler.ts](./scripts/sepolia/07-transfer-with-bundler.ts)
In this script ERC4337 really comes into play. The same transactions from script 06 are now converted into userOperations and sent to a bundler for execution. The bundler will then send the userOperation to the specified EntryPoint that validates the transaction with the wallet, collects the transaction fee and executes the transaction. 

This script makes heavy use of the files from the `scripts/utils/` folder. For a good understanding of what is happening here, it is recommended to take a closer look at the used functions there.

### [08-deploy-paymaster.ts](./scripts/sepolia/08-deploy-paymaster.ts)
To be able to sponsor transactions, and include the final missing feature of ERC4337, this script deploys a Paymaster.

### [09-fund-paymaster.ts](./scripts/sepolia/09-fund-paymaster.ts)
To be able to sponsor transactions, this script sends some ETH to the Paymaster.

### [10-transfer-with-paymaster.ts](./scripts/sepolia/10-transfer-with-paymaster.ts)
In the final script all things come together and a sponsored transaction to transfer some ERC20 tokens is composed as a userOperation and then executed through the ERC4337 stack.


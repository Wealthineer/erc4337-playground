import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import dotenv from "dotenv";
import "solidity-coverage";

dotenv.config();

const RPC_URL_SEPOLIA = process.env.RPC_URL_SEPOLIA || "fallback"
const PRIVATE_KEY = process.env.PRIVATE_KEY || "fallback"
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || "fallback"

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.19",
    settings: {
      optimizer: {
        enabled: true,
        runs: 1000,
      },
    }

  },
  defaultNetwork: "hardhat",
  networks: {
    hardhat: {
        chainId: 31337,
    },
    sepolia: {
        url: RPC_URL_SEPOLIA,
        accounts: [PRIVATE_KEY],
        chainId: 11155111,
    },
    localhost: {
        url: "http://127.0.0.1:8545/",
        chainId: 31337,
    }, 
},
etherscan: {
  apiKey: {
      sepolia: ETHERSCAN_API_KEY,
  },
},
gasReporter: {
  enabled: true,
  outputFile: "gas-report.txt",
  noColors: true,
  currency: "USD",
  // coinmarketcap: CMC_API_KEY,
  // token: 'MATIC'
},
mocha: {
  timeout: 300000, //300 seconds max
},
};

export default config;

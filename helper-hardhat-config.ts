import { ethers } from "hardhat";

export const networkConfig = {
    1: {
        name: "ethereum",
        
    },
    11155111: {
        name: "sepolia",
        entryPointAddress:"0x0576a174D229E3cFA37253523E645A78A0C91B57",
        bundler: "https://sepolia.voltaire.candidewallet.com/rpc"

    },
    137: {
        name: "polygon",
        
    },
    80001: {
        name: "mumbai",
        
    },
    31337: {
        name: "hardhat",
        
    },
}

export const developmentChains = ["hardhat", "localhost"]
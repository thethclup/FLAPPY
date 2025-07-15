require("@nomicfoundation/hardhat-toolbox");
require('dotenv').config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.19",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hardhat: {
      // Local development network
    },
    monad: {
      url: "https://testnet1.monad.xyz",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 55518,
      gasPrice: 1000000000, // 1 gwei
      gas: 3000000,
    },
  },
  etherscan: {
    // Add explorer API key if available
    apiKey: {
      monad: process.env.MONAD_API_KEY || "dummy"
    },
    customChains: [
      {
        network: "monad",
        chainId: 55518,
        urls: {
          apiURL: "https://testnet1.monad.xyz/api",
          browserURL: "https://testnet1.monad.xyz"
        }
      }
    ]
  },
  gasReporter: {
    enabled: true,
    currency: "USD",
  },
  mocha: {
    timeout: 40000,
  },
};
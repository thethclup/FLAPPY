import { ethers } from 'ethers';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from './contract.js';

export class WalletManager {
    constructor() {
        this.provider = null;
        this.signer = null;
        this.contract = null;
        this.account = null;
        
        // Monad testnet configuration
        this.monadConfig = {
            chainId: '0xD8DE', // 55518 in hex
            chainName: 'Monad Testnet',
            nativeCurrency: {
                name: 'MON',
                symbol: 'MON',
                decimals: 18
            },
            rpcUrls: ['https://testnet1.monad.xyz'],
            blockExplorerUrls: ['https://testnet1.monad.xyz']
        };
    }

    async connect() {
        if (!window.ethereum) {
            throw new Error('MetaMask is not installed');
        }

        try {
            // Request account access
            const accounts = await window.ethereum.request({
                method: 'eth_requestAccounts'
            });

            if (accounts.length === 0) {
                throw new Error('No accounts found');
            }

            this.account = accounts[0];
            this.provider = new ethers.BrowserProvider(window.ethereum);
            this.signer = await this.provider.getSigner();

            // Check if we're on Monad testnet
            const network = await this.provider.getNetwork();
            if (network.chainId !== BigInt(55518)) {
                await this.switchToMonadTestnet();
            }

            // Initialize contract
            this.contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, this.signer);

            // Listen for account changes
            window.ethereum.on('accountsChanged', (accounts) => {
                if (accounts.length === 0) {
                    this.disconnect();
                } else {
                    this.account = accounts[0];
                }
            });

            return this.account;
        } catch (error) {
            console.error('Connection failed:', error);
            throw error;
        }
    }

    async switchToMonadTestnet() {
        try {
            await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: this.monadConfig.chainId }]
            });
        } catch (switchError) {
            // This error code indicates that the chain has not been added to MetaMask
            if (switchError.code === 4902) {
                try {
                    await window.ethereum.request({
                        method: 'wallet_addEthereumChain',
                        params: [this.monadConfig]
                    });
                } catch (addError) {
                    throw new Error('Failed to add Monad testnet to MetaMask');
                }
            } else {
                throw new Error('Failed to switch to Monad testnet');
            }
        }
    }

    async isConnected() {
        if (!window.ethereum) return false;
        
        try {
            const accounts = await window.ethereum.request({
                method: 'eth_accounts'
            });
            
            if (accounts.length > 0) {
                this.account = accounts[0];
                this.provider = new ethers.BrowserProvider(window.ethereum);
                this.signer = await this.provider.getSigner();
                this.contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, this.signer);
                return true;
            }
        } catch (error) {
            console.error('Connection check failed:', error);
        }
        
        return false;
    }

    disconnect() {
        this.provider = null;
        this.signer = null;
        this.contract = null;
        this.account = null;
    }

    getAddress() {
        return this.account;
    }

    async getBalance() {
        if (!this.provider || !this.account) {
            throw new Error('Wallet not connected');
        }

        try {
            const balance = await this.provider.getBalance(this.account);
            return ethers.formatEther(balance);
        } catch (error) {
            console.error('Failed to get balance:', error);
            throw error;
        }
    }

    async getHighScore() {
        if (!this.contract || !this.account) {
            return 0;
        }

        try {
            const score = await this.contract.getScore(this.account);
            return Number(score);
        } catch (error) {
            console.error('Failed to get high score:', error);
            return 0;
        }
    }

    async saveScore(score) {
        if (!this.contract) {
            throw new Error('Contract not initialized');
        }

        try {
            const tx = await this.contract.setScore(score);
            await tx.wait();
            return tx.hash;
        } catch (error) {
            console.error('Failed to save score:', error);
            throw error;
        }
    }

    async claimReward() {
        if (!this.contract) {
            throw new Error('Contract not initialized');
        }

        try {
            const tx = await this.contract.claimReward();
            await tx.wait();
            return tx.hash;
        } catch (error) {
            console.error('Failed to claim reward:', error);
            throw error;
        }
    }

    async getTransactionReceipt(txHash) {
        if (!this.provider) {
            throw new Error('Provider not available');
        }

        try {
            return await this.provider.getTransactionReceipt(txHash);
        } catch (error) {
            console.error('Failed to get transaction receipt:', error);
            throw error;
        }
    }
}
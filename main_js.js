import { ethers } from 'ethers';
import { Game } from './game.js';
import { WalletManager } from './wallet.js';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from './contract.js';

class FlappyBirdApp {
    constructor() {
        this.game = null;
        this.walletManager = new WalletManager();
        this.currentScore = 0;
        this.highScore = 0;
        this.isGameRunning = false;
        
        this.initializeElements();
        this.setupEventListeners();
        this.checkWalletConnection();
    }

    initializeElements() {
        this.elements = {
            canvas: document.getElementById('gameCanvas'),
            connectWallet: document.getElementById('connectWallet'),
            startGame: document.getElementById('startGame'),
            claimReward: document.getElementById('claimReward'),
            walletStatus: document.getElementById('walletStatus'),
            walletAddress: document.getElementById('walletAddress'),
            highScore: document.getElementById('highScore'),
            status: document.getElementById('status'),
            gameOver: document.getElementById('gameOver'),
            finalScore: document.getElementById('finalScore'),
            restartGame: document.getElementById('restartGame'),
            saveScore: document.getElementById('saveScore')
        };
    }

    setupEventListeners() {
        this.elements.connectWallet.addEventListener('click', () => this.connectWallet());
        this.elements.startGame.addEventListener('click', () => this.startGame());
        this.elements.claimReward.addEventListener('click', () => this.claimReward());
        this.elements.restartGame.addEventListener('click', () => this.restartGame());
        this.elements.saveScore.addEventListener('click', () => this.saveScore());
        
        // Game controls
        this.elements.canvas.addEventListener('click', () => this.handleGameClick());
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space' && this.isGameRunning) {
                e.preventDefault();
                this.game.flap();
            }
        });
    }

    async checkWalletConnection() {
        if (await this.walletManager.isConnected()) {
            this.updateWalletUI();
            await this.loadHighScore();
        }
    }

    async connectWallet() {
        try {
            this.showStatus('Connecting to wallet...', 'info');
            await this.walletManager.connect();
            this.updateWalletUI();
            await this.loadHighScore();
            this.showStatus('Wallet connected successfully!', 'success');
        } catch (error) {
            console.error('Wallet connection failed:', error);
            this.showStatus('Failed to connect wallet: ' + error.message, 'error');
        }
    }

    updateWalletUI() {
        const isConnected = this.walletManager.isConnected();
        const address = this.walletManager.getAddress();
        
        if (isConnected && address) {
            this.elements.walletStatus.textContent = 'Wallet Connected';
            this.elements.walletAddress.textContent = this.formatAddress(address);
            this.elements.connectWallet.style.display = 'none';
            this.elements.startGame.disabled = false;
            this.elements.claimReward.disabled = false;
        } else {
            this.elements.walletStatus.textContent = 'Wallet not connected';
            this.elements.walletAddress.textContent = '';
            this.elements.connectWallet.style.display = 'inline-block';
            this.elements.startGame.disabled = true;
            this.elements.claimReward.disabled = true;
        }
    }

    formatAddress(address) {
        if (!address) return '';
        return `${address.slice(0, 6)}...${address.slice(-4)}`;
    }

    async loadHighScore() {
        try {
            const score = await this.walletManager.getHighScore();
            this.highScore = score;
            this.elements.highScore.textContent = `High Score: ${score}`;
        } catch (error) {
            console.error('Failed to load high score:', error);
        }
    }

    startGame() {
        if (!this.walletManager.isConnected()) {
            this.showStatus('Please connect your wallet first', 'error');
            return;
        }

        this.isGameRunning = true;
        this.elements.gameOver.style.display = 'none';
        this.elements.startGame.disabled = true;
        
        this.game = new Game(this.elements.canvas, (score) => {
            this.onGameOver(score);
        });
        
        this.game.start();
        this.showStatus('Game started! Click or press space to flap', 'info');
    }

    handleGameClick() {
        if (this.isGameRunning && this.game) {
            this.game.flap();
        }
    }

    onGameOver(score) {
        this.isGameRunning = false;
        this.currentScore = score;
        this.elements.finalScore.textContent = `Score: ${score}`;
        this.elements.gameOver.style.display = 'block';
        this.elements.startGame.disabled = false;
        
        if (score > this.highScore) {
            this.showStatus(`New high score! ${score}`, 'success');
        }
    }

    restartGame() {
        this.elements.gameOver.style.display = 'none';
        this.startGame();
    }

    async saveScore() {
        if (!this.walletManager.isConnected()) {
            this.showStatus('Please connect your wallet first', 'error');
            return;
        }

        try {
            this.elements.saveScore.disabled = true;
            this.showStatus('Saving score to blockchain...', 'info');
            
            await this.walletManager.saveScore(this.currentScore);
            
            if (this.currentScore > this.highScore) {
                this.highScore = this.currentScore;
                this.elements.highScore.textContent = `High Score: ${this.highScore}`;
            }
            
            this.showStatus('Score saved successfully!', 'success');
        } catch (error) {
            console.error('Failed to save score:', error);
            this.showStatus('Failed to save score: ' + error.message, 'error');
        } finally {
            this.elements.saveScore.disabled = false;
        }
    }

    async claimReward() {
        if (!this.walletManager.isConnected()) {
            this.showStatus('Please connect your wallet first', 'error');
            return;
        }

        if (this.highScore < 10) {
            this.showStatus('You need a score of at least 10 to claim rewards', 'error');
            return;
        }

        try {
            this.elements.claimReward.disabled = true;
            this.showStatus('Claiming reward...', 'info');
            
            await this.walletManager.claimReward();
            this.showStatus('Reward claimed successfully!', 'success');
        } catch (error) {
            console.error('Failed to claim reward:', error);
            this.showStatus('Failed to claim reward: ' + error.message, 'error');
        } finally {
            this.elements.claimReward.disabled = false;
        }
    }

    showStatus(message, type) {
        this.elements.status.textContent = message;
        this.elements.status.className = `status ${type}`;
        this.elements.status.style.display = 'block';
        
        setTimeout(() => {
            this.elements.status.style.display = 'none';
        }, 5000);
    }
}

// Initialize the app
new FlappyBirdApp();
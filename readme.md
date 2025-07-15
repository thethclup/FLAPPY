# 🐦 Flappy Bird - Monad Testnet Integration

A modern web-based Flappy Bird game integrated with the Monad testnet blockchain. Players can connect their wallets, save high scores on-chain, and earn testnet MON token rewards for achieving high scores.

## 🎮 Features

- **Classic Flappy Bird Gameplay**: Tap to flap through pipes
- **Blockchain Integration**: Connect MetaMask wallet to Monad testnet
- **On-Chain High Scores**: Save your best scores to the blockchain
- **Rewards System**: Earn testnet MON tokens for achieving milestones
- **Leaderboard**: Compete with other players globally
- **Mobile Responsive**: Play on desktop or mobile devices

## 🚀 Live Demo

[Play the game here](https://your-vercel-app.vercel.app) (Replace with your actual Vercel URL)

## 🛠️ Tech Stack

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Blockchain**: Ethereum/Monad testnet, Solidity
- **Web3**: ethers.js
- **Build Tool**: Vite
- **Deployment**: Vercel
- **Smart Contract**: Hardhat

## 🏗️ Project Structure

```
flappy-bird-monad/
├── src/
│   ├── main.js          # Main application logic
│   ├── game.js          # Game engine and mechanics
│   ├── wallet.js        # Wallet connection and blockchain interactions
│   └── contract.js      # Smart contract ABI and address
├── contracts/
│   └── FlappyBirdScore.sol  # Solidity smart contract
├── scripts/
│   └── deploy.js        # Deployment script
├── index.html           # Main HTML file
├── package.json         # Node.js dependencies
├── vite.config.js       # Vite configuration
├── hardhat.config.js    # Hardhat configuration
└── README.md           # This file
```

## 🚀 Quick Start

### Prerequisites

- Node.js (v16 or later)
- MetaMask wallet extension
- Monad testnet MON tokens (from faucet)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/flappy-bird-monad.git
   cd flappy-bird-monad
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your private key for contract deployment
   ```

4. **Deploy the smart contract**
   ```bash
   npx hardhat run scripts/deploy.js --network monad
   ```

5. **Update contract address**
   - Copy the deployed contract address from the console output
   - Update `CONTRACT_ADDRESS` in `src/contract.js`

6. **Start the development server**
   ```bash
   npm run dev
   ```

7. **Open in browser**
   - Navigate to `http://localhost:3000`

## 🌐 Deployment to Vercel

1. **Build the project**
   ```bash
   npm run build
   ```

2. **Deploy to Vercel**
   ```bash
   # Install Vercel CLI
   npm i -g vercel

   # Deploy
   vercel --prod
   ```

3. **Set up custom domain** (optional)
   - Go to Vercel dashboard
   - Add your custom domain in project settings

## 🎯 How to Play

1. **Connect Your Wallet**
   - Click "Connect Wallet" button
   - Approve MetaMask connection
   - Switch to Monad testnet if prompted

2. **Get Testnet Tokens**
   - Visit [Monad Faucet](https://faucet.monad.xyz) (replace with actual faucet URL)
   - Request testnet MON tokens

3. **Play the Game**
   - Click "Start Game"
   - Tap screen or press spacebar to flap
   - Navigate through pipes without collision
   - Try to beat your high score!

4. **Save Your Score**
   - After game over, click "Save Score"
   - Confirm the transaction in MetaMask
   - Your score is now saved on the blockchain

5. **Claim Rewards**
   - Achieve score milestones to unlock rewards
   - Click "Claim Reward" to receive testnet MON tokens

## 🏆 Reward System

- **Score 10+**: 0.001 MON
- **Score 25+**: 0.002 MON
- **Score 50+**: 0.005 MON
- **Score 100+**: 0.01 MON

## 📱 Monad Testnet Setup

### Adding Monad Testnet to MetaMask

**Network Details:**
- Network Name: Monad Testnet
- RPC URL: https://testnet1.monad.xyz
- Chain ID: 55518
- Currency Symbol: MON
- Block Explorer: https://testnet1.monad.xyz

### Getting Testnet Tokens

1. Visit the official Monad faucet
2. Connect your wallet
3. Request testnet MON tokens
4. Wait for tokens to appear in your wallet

## 🔧 Smart Contract

The game uses a Solidity smart contract deployed on Monad testnet with the following features:

- **Score Storage**: Securely store high scores for each player
- **Reward Distribution**: Automatically distribute MON tokens based on achievements
- **Leaderboard**: Track top players globally
- **Owner Functions**: Contract management and fund withdrawal

### Contract Functions

- `setScore(uint256 score)`: Save a new high score
- `getScore(address player)`: Get a player's high score
- `claimReward()`: Claim MON token rewards
- `getLeaderboard()`: Get top 10 players

## 🔐 Security

- Uses burner wallet for testnet interactions
- Smart contract input validation
- No private key storage in frontend
- Secure reward distribution mechanism

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Original Flappy Bird game concept
- Monad blockchain team
- ethers.js library
- Hardhat development framework

## 📞 Support

If you encounter any issues:

1. Check that you're connected to Monad testnet
2. Ensure you have sufficient testnet MON tokens
3. Try refreshing the page and reconnecting wallet
4. Open an issue on GitHub for persistent problems

## 🔗 Links

- [Monad Official Website](https://monad.xyz)
- [Monad Documentation](https://docs.monad.xyz)
- [MetaMask](https://metamask.io)
- [Hardhat](https://hardhat.org)

---

Made with ❤️ for the Monad community
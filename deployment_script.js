const { ethers } = require('hardhat');

async function main() {
    console.log('Deploying FlappyBirdScore contract to Monad testnet...');
    
    // Get the contract factory
    const FlappyBirdScore = await ethers.getContractFactory('FlappyBirdScore');
    
    // Deploy the contract
    const flappyBirdScore = await FlappyBirdScore.deploy();
    
    // Wait for deployment to complete
    await flappyBirdScore.waitForDeployment();
    
    const contractAddress = await flappyBirdScore.getAddress();
    console.log('FlappyBirdScore contract deployed to:', contractAddress);
    
    // Fund the contract with some test tokens for rewards
    const fundAmount = ethers.parseEther('1.0'); // 1 MON
    console.log('Funding contract with', ethers.formatEther(fundAmount), 'MON...');
    
    const [deployer] = await ethers.getSigners();
    const tx = await deployer.sendTransaction({
        to: contractAddress,
        value: fundAmount
    });
    
    await tx.wait();
    console.log('Contract funded successfully!');
    
    // Verify the contract balance
    const balance = await ethers.provider.getBalance(contractAddress);
    console.log('Contract balance:', ethers.formatEther(balance), 'MON');
    
    console.log('\n=== Deployment Summary ===');
    console.log('Contract Address:', contractAddress);
    console.log('Deployer:', deployer.address);
    console.log('Contract Balance:', ethers.formatEther(balance), 'MON');
    console.log('Network:', (await ethers.provider.getNetwork()).name);
    
    console.log('\n=== Next Steps ===');
    console.log('1. Update CONTRACT_ADDRESS in src/contract.js with:', contractAddress);
    console.log('2. Verify contract on block explorer (optional)');
    console.log('3. Test the contract interactions');
    
    return contractAddress;
}

main()
    .then((contractAddress) => {
        console.log('Deployment completed successfully!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('Deployment failed:', error);
        process.exit(1);
    });
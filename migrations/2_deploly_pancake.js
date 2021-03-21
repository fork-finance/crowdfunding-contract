const UniswapV2Factory = artifacts.require('UniswapV2Factory');
const UniswapV2Router02 = artifacts.require('UniswapV2Router02');
const MockWBNB = artifacts.require('MockWBNB');
const IWBNB = artifacts.require('IWETH');

module.exports = async (deployer, network, accounts) => {
    if (!knownContracts.WBNB[network] ) {
        await deployer.deploy(MockWBNB);
        const wbnb = await MockWBNB.deployed();
    } else {
        const wbnb = await IWBNB.at(knownContracts.WBNB[network]);
    }
    if (!knownContracts.UniswapV2Router02[network]) {
        console.log('Deploying pancakeswap on '+network+' network.');
        await deployer.deploy(UniswapV2Factory, accounts[0]);
        const uniswapFactory = await UniswapV2Factory.deployed();
        await deployer.deploy(UniswapV2Router02, uniswapFactory.address, wbnb.address);
    }
    
};
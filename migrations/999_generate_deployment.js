const fs = require('fs');
const path = require('path');
const util = require('util');
const writeFile = util.promisify(fs.writeFile);

const knownContracts = require('./known-contracts');

const MockWBNB = artifacts.require('MockWBNB');
const ERC20 = artifacts.require('ERC20');
const IERC20 = artifacts.require('IERC20');
const IWBNB = artifacts.require('IWETH');

const sForkToken = artifacts.require('sForkToken');

const MoonFund = artifacts.require("MoonFund");

const UniswapV2Factory = artifacts.require('UniswapV2Factory');
const UniswapV2Router02 = artifacts.require('UniswapV2Router02');

// const {ALPACA_REWARD_PER_BLOCK, START_BLOCK} = require('./pool');

module.exports = async (deployer, network, accounts) => {
  if (network == 'develop') return;
  let deployments;
  console.log(">> Creating the deployment file");
  const uniswapFactory = network === 'mainnet' ? await UniswapV2Factory.at(knownContracts.UniswapV2Factory[network]) : await UniswapV2Factory.deployed();
  const uniswapRouter = network === 'mainnet' ? await UniswapV2Router02.at(knownContracts.UniswapV2Router02[network]) : await UniswapV2Router02.deployed();
  const wbnb = network === 'mainnet' ? await IWBNB.at(knownContracts.WBNB[network]) : await MockWBNB.deployed();

  deployments = {
    MoonFund: {
      address: MoonFund.address
    },
    Exchanges: {
      Pancakeswap: {
        UniswapV2Factory: uniswapFactory.address,
        UniswapV2Router02: uniswapRouter.address
      }
    },
    Tokens: {
      WBNB: wbnb.address,
      sFORK: sForkToken.address,
    }
  };


  const deploymentPath = path.resolve(__dirname, `../build/deployments.${network}.json`);
  await writeFile(deploymentPath, JSON.stringify(deployments, null, 2));

  console.log(`Exported deployments into ${deploymentPath}`);

  let contracts = [sForkToken, MoonFund];

  const abiPath = path.resolve(__dirname, `../build/abis/${network}`);
  
  for (let c of contracts) {
    let abiFile = `${abiPath}/${c.contractName}.json`;
    await writeFile(abiFile, JSON.stringify(c.abi, null, 2));
    console.log(`Exported ${c.contractName}‘s abi into ${abiFile}`);
  }

}


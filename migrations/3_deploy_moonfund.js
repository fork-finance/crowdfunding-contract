const sForkToken = artifacts.require('sForkToken');
const MockWBNB = artifacts.require('MockWBNB');

const MoonFund = artifacts.require("MoonFund");
const IWBNB = artifacts.require('IWETH');
const UniswapV2Router02 = artifacts.require('UniswapV2Router02');

const knownContracts = require('./known-contracts');
const conf = require("./conf");

module.exports = async (deployer, network, accounts) => {
  const START_TIME = conf.START_TIME[network];
  const END_TIME = conf.END_TIME[network];

  const sforkToken = await sForkToken.deployed();

  const wbnb = knownContracts.WBNB[network] ? await IWBNB.at(knownContracts.WBNB[network]) : await MockWBNB.deployed();
  const swapRouter = knownContracts.UniswapV2Router02[network] ? await UniswapV2Router02.at(knownContracts.UniswapV2Router02[network]) : await UniswapV2Router02.deployed();

  await deployer.deploy(MoonFund, swapRouter.address, sforkToken.address, wbnb.address, accounts[0], START_TIME, END_TIME);

  const moonFund = await MoonFund.deployed();
  console.log(">> 1 Transferring ownership of checkToken from deployer to ForkFarmLaunch");
  await sForkToken.transferOwnership(moonFund.address);
  console.log("✅ Done");

};
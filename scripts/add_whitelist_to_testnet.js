const {web3,deployer, network, knownContracts} = require('./variable');
const {Contract} = require('./contract/index');
const MoonFund = require('../build/contracts/MoonFund.json');

const whitelist0 = require('./whitelist/0.json');

const exec = async(callback) => {
  let res;
  const moonFund = new Contract(web3, knownContracts.MoonFund[network], MoonFund.abi);
  const { toWei } = web3.utils;
  
   res = await moonFund.send('massUpdateWhitelist', deployer, 0, toWei('5', 'ether'), whitelist0);
  console.log(res)
   res = await moonFund.send('massUpdateWhitelist', deployer, 1, toWei('5', 'ether'), whitelist0);
  console.log(res)
};


exec();

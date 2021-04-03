const {web3, deployer, network, knownContracts} = require('./variable');
const {Contract} = require('./contract/index');
const MoonFund = require('../build/contracts/MoonFund.json');
const {latest} = require('./utils/index');

const exec = async(callback) => {
  const moonFund = new Contract(web3, knownContracts.MoonFund[network], MoonFund.abi);
  const { toWei } = web3.utils;
  const sellPools = [{
    title: 'Seed Sale',
    price: 752,
    cap: toWei('75200', 'ether'),
    startTime: parseInt((new Date("2021-04-04 06:00:00 UTC")).getTime()/1000),
    endTime: parseInt((new Date("2021-04-06 06:00:00 UTC")).getTime()/1000),
    allocationMin: toWei('0.1', 'ether'),
    allocationMax: toWei('5', 'ether'),
    marketPoint: 90,
    devPoint: 10,
    isPrivate: true
  }];

  // const sellPools = [{
  //   title: 'Private Sale',
  //   price: 376,
  //   cap: toWei('376000', 'ether'),
  //   startTime: parseInt((new Date("2021-04-04 06:00:00 UTC")).getTime()/1000),
  //   endTime: parseInt((new Date("2021-04-06 06:00:00 UTC")).getTime()/1000),
  //   allocationMin: toWei('0.1', 'ether'),
  //   allocationMax: toWei('5', 'ether'),
  //   marketPoint: 5,
  //   devPoint: 10
  // }];

  for (let i in sellPools) {
    let p = sellPools[i];
    let res = await moonFund.send('addSellPool', deployer, p.title, p.price, p.cap, p.startTime, p.endTime, p.allocationMin,p.allocationMax,p.marketPoint,p.devPoint,p.isPrivate);
    console.log(res);
  }
};


exec();

const DAY = 60*60*24;
const WEEK = DAY*7;


module.exports = {
  START_TIME: {
    ganache: Date.parse('2021-03-21 14:00:00') / 1000,
    testnet: Date.parse('2021-03-21 14:00:00') / 1000,
    mainnet: Date.parse('2021-03-21 14:00:00') / 1000
  },
  END_TIME: {
    ganache: Date.parse('2021-05-23 14:00:00') / 1000,
    testnet: Date.parse('2021-05-23 14:00:00') / 1000,
    mainnet: Date.parse('2021-05-23 14:00:00') / 1000
  }
}

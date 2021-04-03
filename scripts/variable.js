const Web3 = require('web3');
const fs = require('fs');
const args = require('minimist')(process.argv.slice(2));
const knownContracts = Object.assign(require('../migrations/known-contracts'), require('../deployments.json'));


const GAS = 667839;
const GAS_PRICE = '20';
// const GAS = 304280;
// const GAS_LIMIT = 8000000;
// const GAS_LIMIT = 8000000;
const GAS_LIMIT = 667839;

const DECIMALS = 10 ** 18;
// const testnet = new Web3.providers.HttpProvider('https://http-testnet.hecochain.com');
// const testnet = new Web3.providers.WebsocketProvider('wss://ws-testnet.hecochain.com');
// const testnet = new Web3.providers.HttpProvider(''); 

const NETWORK_RPC_URLS = {
    testnet: 'https://data-seed-prebsc-1-s1.binance.org:8545/',
    mainnet: 'https://bsc-dataseed1.binance.org/'
}
if ( typeof args['network'] == 'undefined' || typeof NETWORK_RPC_URLS[args['network']] == 'undefined' ) {
    console.log("Error:", "network undefined!!! usage: --network <network>")
    process.exit(1);
}
const network = args['network'];;

const web3 = new Web3(new Web3.providers.HttpProvider(NETWORK_RPC_URLS[network]));

const deployer_priv_key = fs.readFileSync(".secret").toString().trim();
const deployer = web3.eth.accounts.privateKeyToAccount(deployer_priv_key);

const moonFundAddress = '0xaE98feDd91E576F46F6C149D04e5FD720C4F12d4';
const forkAddress = '0x3C0695e4f66c16044aa542D71189A5CffC25008D';

const has = () => {
  if ( typeof knownContracts[''] == 'undefined' || typeof NETWORK_RPC_URLS[args['network']] == 'undefined' ) {
    console.log("Error:", "network undefined!!! usage: --network <network>")
    process.exit(1);
  }
  []
}

module.exports = {
    GAS,GAS_LIMIT, DECIMALS,GAS_PRICE,web3,deployer,network,args,
    knownContracts
}
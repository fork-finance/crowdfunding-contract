const Timelock = artifacts.require("Timelock");
const MoonFund = artifacts.require("MoonFund");
const knownContracts = require('./known-contracts.js');

module.exports = async (deployer, network, accounts) => {
    const timelock = knownContracts.Timelock[network] ? await Timelock.at(knownContracts.Timelock[network]) : await Timelock.deployed();
    const moonFund = await MoonFund.deployed();

    await moonFund.transferOwnership(timelock.address);
};
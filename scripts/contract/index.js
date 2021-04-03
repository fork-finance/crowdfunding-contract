"use strict";

const {send} = require('../utils/index');

function Contract (web3, address, abi) {
    let _this = this;
    this.address = address;
    this.abi = abi;
    this.contract = new web3.eth.Contract(abi, address);

    this.send = async (method, account, ...args) => {
       return await send(this.contract, method, account, ...args);
    }
    this.call = async (method, ...args) => {
        if (args.length==0) {
            return await this.contract.methods[method]().call();
        } else {
            return await this.contract.methods[method](...args).call();
        }
    }
    // @ owner account, spender address
    this.approveIfNot = async (owner, spender, amount) => {
        let res;
        const allowance = await _this.call('allowance', owner.address, spender);
        if (web3.utils.toBN(allowance).gte(web3.utils.toBN(amount))) {
            return true;
        }
        res = await _this.send('approve',owner, spender, amount);
        return res;
    }
}

module.exports = {
    Contract
}
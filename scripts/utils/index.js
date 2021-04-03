"use strict";

const {GAS, GAS_LIMIT, GAS_PRICE, web3} = require('../variable');

const send = async (contract, method, account, ...args) => {
    let d, signed_txn, res;
    if (args.length==0) {
        d = await contract.methods[method]().encodeABI();
    } else {
        d = await contract.methods[method](...args).encodeABI();
    }
    signed_txn = await account.signTransaction({
        to: contract._address,
        value: web3.utils.toWei('0', 'ether'),
        gas: GAS,
        gasPrice: web3.utils.toWei(GAS_PRICE, 'gwei'),
        gasLimit: GAS_LIMIT,
        data: d
    });
    res = await web3.eth.sendSignedTransaction(signed_txn.rawTransaction);
    return res;
}

const deadline = () => {
    // 30 minutes
    return Math.floor(new Date().getTime() / 1000) + 1800;
}

const approveIfNot = async (token, owner, spender, amount) => {
    const allowance = await token.methods.allowance(owner, spender).call();
    if (web3.utils.toBN(allowance).gte(web3.utils.toBN(amount))) {
        return;
    }
    res = await token.methods.approve(spender, amount).send({from: owner});
};
const increaseTime = (addSeconds) => {
  const id = Date.now();

  return new Promise((resolve, reject) => {
    web3.currentProvider.send({
      jsonrpc: '2.0',
      method: 'evm_increaseTime',
      params: [addSeconds],
      id,
    }, (err1) => {
      if (err1) return reject(err1);

      web3.currentProvider.send({
        jsonrpc: '2.0',
        method: 'evm_mine',
        id: id + 1,
      }, (err2, res) => (err2 ? reject(err2) : resolve(res)));
    });
  });
}

const decreaseTime = (addSeconds) => {
  const id = Date.now();

  return new Promise((resolve, reject) => {
    web3.currentProvider.send({
      jsonrpc: '2.0',
      method: 'evm_decreaseTime',
      params: [addSeconds],
      id,
    }, (err1) => {
      if (err1) return reject(err1);

      web3.currentProvider.send({
        jsonrpc: '2.0',
        method: 'evm_mine',
        id: id + 1,
      }, (err2, res) => (err2 ? reject(err2) : resolve(res)));
    });
  });
}

const latest = async() => {
  let b = await web3.eth.getBlock('latest');
  return b.timestamp;
}
const test = () => {
    console.log('I am test()')
};

module.exports = {
    approveIfNot,
    send, deadline,
    increaseTime, decreaseTime, latest,
    test
};
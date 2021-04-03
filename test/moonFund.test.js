const truffleAssert = require('truffle-assertions');

const sForkToken = artifacts.require('sForkToken');
const MockERC20 = artifacts.require('MockERC20');
const IERC20 = artifacts.require('IERC20');
const MockWBNB = artifacts.require('MockWBNB');
const MoonFund = artifacts.require("MoonFund");
const Timelock = artifacts.require("Timelock");

const UniswapV2Factory = artifacts.require('UniswapV2Factory');
const UniswapV2Router02 = artifacts.require('UniswapV2Router02');

const {increaseTime,decreaseTime,latest} = require('./utils/time');

contract('MoonFund', async (accounts) => {
  const CHECK_REWARD_PER_BLOCK = web3.utils.toWei('5000', 'ether');
  const START_TIME = Date.parse('2021-03-22 14:00:00') / 1000;
  const END_TIME = Date.parse('2021-05-26 14:00:00') / 1000;
  let deployer, alice, bob, dev;
  const { toWei } = web3.utils;
  const { fromWei } = web3.utils;
  let timelock;
  const DAY = 60*60*24;

  beforeEach(async () => {
    // pancake-swap
    swapRouter = await UniswapV2Router02.deployed();
    swapFactory = await UniswapV2Factory.deployed();
    // tokens
    // sfork = await sForkToken.new();
    wbnb = await MockWBNB.deployed();
    fork = await MockERC20.new('Mock Fork Token', 'FORK');
    sfork = fork;

    // users
    [deployer, alice, bob, dev] = accounts;
    // MoonFund
    moonFund = await MoonFund.new(swapRouter.address, fork.address, wbnb.address, deployer, deployer, 0);
    // await sfork.transferOwnership(moonFund.address);
    timelock = await Timelock.new(deployer, DAY);
    moonFund.transferOwnership(timelock.address);

    const sellPools = [{
      title: 'Strategic funding',
      price: 288,
      cap: toWei('10000000', 'ether'),
      startTime: await latest(),
      endTime: (await latest() + 5*24*3600),
      allocationMin: toWei('0.1', 'ether'),
      allocationMax: toWei('5000', 'ether'),
      marketPoint: 5,
      devPoint: 10,
      isPrivate: true
    },{
      title: 'Seed funding invest',
      price: 1440,
      cap: toWei('216000', 'ether'),
      startTime: await latest(),
      endTime: (await latest() + 5*24*3600),
      allocationMin: toWei('0.1', 'ether'),
      allocationMax: toWei('10', 'ether'),
      marketPoint: 90,
      devPoint: 10,
      isPrivate: true
    },{
      title: 'Public offering',
      price: 225,
      cap: toWei('225600', 'ether'),
      startTime: await latest(),
      endTime: (await latest() + 5*24*3600),
      allocationMin: toWei('0.1', 'ether'),
      allocationMax: toWei('15', 'ether'),
      marketPoint: 5,
      devPoint: 10,
      isPrivate: false
    },{
      title: 'Public offering',
      price: 225,
      cap: toWei('225600', 'ether'),
      startTime: await latest() + 3*24*3600,
      endTime: (await latest() + 5*24*3600),
      allocationMin: toWei('0.1', 'ether'),
      allocationMax: toWei('5', 'ether'),
      marketPoint: 5,
      devPoint: 10,
      isPrivate: false
    }];

    for (let i in sellPools) {
      let p = sellPools[i];
      await moonFund.addSellPool(p.title, p.price, p.cap, p.startTime, p.endTime, p.allocationMin,p.allocationMax,p.marketPoint,p.devPoint,p.isPrivate,{from: deployer});
    }
    // await moonFund.addSellPool(288, toWei('100000', 'ether'), parseInt(Date.now()/1000), (parseInt(Date.now()/1000) + 5*24*3600), {from: deployer});
    await moonFund.massUpdateWhitelist(0, toWei('5000', 'ether'), [deployer, alice, bob]);
    await moonFund.massUpdateWhitelist(1, toWei('5', 'ether'), [deployer, alice, bob]);

    await fork.mint(moonFund.address, toWei('10216000', 'ether'));
    
  })

  describe('when use moonFund crowdfunding', () => {
    it('should deposit BNB to get FORK', async () => {
      await moonFund.deposit(0, toWei('11', 'ether'), {from: alice, value: toWei('11', 'ether')});

      assert.equal(toWei(11*288+'', 'ether'), (await sfork.balanceOf(alice)).toString(), 'alice\'s sfork error ');
      assert.equal(toWei(11*0.85+'', 'ether'), (await wbnb.balanceOf(moonFund.address)).toString());
      assert.equal(toWei(11*0.15+'', 'ether'), (await wbnb.balanceOf(deployer)).toString(), 'deployer\' bnb error');
      assert.equal(toWei('11', 'ether'), (await moonFund.soldOfETH(0)).toString());
      assert.equal(toWei(11*288+'', 'ether'), (await moonFund.sold(0)).toString());

      await moonFund.deposit(1, toWei('4', 'ether'), {from: bob, value: toWei('4', 'ether')});
      assert.equal(toWei(4*1440+'', 'ether'), (await sfork.balanceOf(bob)).toString(), 'bob\'s sfork error ');
      assert.equal(toWei((11*0.85 + 0).toString(), 'ether'), (await wbnb.balanceOf(moonFund.address)).toString());
      assert.equal(toWei((11*0.15 + 4).toString(), 'ether'), (await wbnb.balanceOf(deployer)).toString(), 'deployer\' bnb error');
    });

    it('should deposit BNB to get FORK public pool when not in whitelist', async () => {
      await moonFund.deposit(2, toWei('11', 'ether'), {from: alice, value: toWei('11', 'ether')});

      assert.equal(toWei(11*225+'', 'ether'), (await sfork.balanceOf(alice)).toString(), 'alice\'s sfork error ');
      assert.equal(toWei(11*0.85+'', 'ether'), (await wbnb.balanceOf(moonFund.address)).toString());
      assert.equal(toWei('11', 'ether'), (await moonFund.soldOfETH(2)).toString());
      assert.equal(toWei(11*225+'', 'ether'), (await moonFund.sold(2)).toString());
      assert.equal(toWei((15-11).toString(), 'ether'), (await moonFund.userPendingQuata(2, alice)).toString());

    });

    it('shold revert when amount > limit', async () => {
      await truffleAssert.fails(moonFund.deposit(1, toWei('15', 'ether'), {from: bob, value: toWei('15', 'ether')}), null, "amount must <= allocationMax");
    });

    it('shold revert when amount is smaller then 0.1bnb', async () => {
      await truffleAssert.fails(moonFund.deposit(0, toWei('0.09', 'ether'), {from: bob, value: toWei('0.09', 'ether')}), null, "amount must > allocationMin");
    });

    it('shold revert when user is not in whitelist', async () => {
      await truffleAssert.fails(moonFund.deposit(0, toWei('6', 'ether'), {from: dev, value: toWei('6', 'ether')}), null, " white-list amount must > 0");
    });

    it('shold revert when pool is not start', async () => {
      await truffleAssert.fails(moonFund.deposit(3, toWei('4', 'ether'), {from: alice, value: toWei('4', 'ether')}), null, "crowdfunding: not start");
    });

    // it('should revert when sfork sold out', async()=>{
    //   await moonFund.deposit(0, toWei('9999', 'ether'), {from: bob, value: toWei('9999', 'ether')});
    //   await truffleAssert.reverts(moonFund.deposit(0, toWei('100', 'ether'), {from: bob, value: toWei('100', 'ether')}), "sold out");
    // })
  });

  describe("when using toTheMoon", () => {
    it("should toTheMoon", async() => {
      await moonFund.deposit(0, toWei('100', 'ether'), {from: alice, value: toWei('100', 'ether')});

      // 1. create pair
      await swapFactory.createPair(fork.address, wbnb.address);
      const pair_addr = await swapFactory.getPair(fork.address, wbnb.address);
      const pair = await IERC20.at(pair_addr);
      // 2. add liquidity
      // Approving swap on tokens for liquidity;
      await Promise.all([
        approveIfNot(fork, deployer, swapRouter.address, toWei('1000', 'ether')),
      ]);
      const amount = toWei('1000', 'ether');
      const amountMin = toWei('1000', 'ether');
      const amountETHMin = toWei('1', 'ether');
      await swapRouter.addLiquidityETH(
        fork.address, amount, amountMin, amountETHMin, deployer, deadline(), {from: deployer, value: amountETHMin},
        );

      assert.equal(toWei('31.622776601683792319', 'ether'), (await pair.balanceOf(deployer)).toString(), "addLiquidityETH error");
    
      // swap
      await moonFund.toTheMoon(toWei('1', 'ether'), toWei('0', 'ether'));
      assert.equal(toWei((100*0.85-1)+'', 'ether'), (await wbnb.balanceOf(moonFund.address)).toString(), "toTheMoon error");

    })

    it("should revents when call user is not opreator", async() => {
      await moonFund.deposit(0, toWei('100', 'ether'), {from: alice, value: toWei('100', 'ether')});


      await fork.mint(deployer, toWei('1000', 'ether'));
      // 1. create pair
      await swapFactory.createPair(fork.address, wbnb.address);
      const pair_addr = await swapFactory.getPair(fork.address, wbnb.address);
      const pair = await IERC20.at(pair_addr);
      // 2. add liquidity
      // Approving swap on tokens for liquidity;
      await Promise.all([
        approveIfNot(fork, deployer, swapRouter.address, toWei('1000', 'ether')),
      ]);
      const amount = toWei('1000', 'ether');
      const amountMin = toWei('1000', 'ether');
      const amountETHMin = toWei('1', 'ether');
      await swapRouter.addLiquidityETH(
        fork.address, amount, amountMin, amountETHMin, deployer, deadline(), {from: deployer, value: amountETHMin},
        );

      assert.equal(toWei('31.622776601683792319', 'ether'), (await pair.balanceOf(deployer)).toString(), "addLiquidityETH error");
    
      // swap
      await truffleAssert.reverts(moonFund.toTheMoon(toWei('1', 'ether'), toWei('0', 'ether'), {from: bob}), "operator: caller is not the operator");
    })

    it("should revents when amount > balance", async() => {
      await moonFund.deposit(0,toWei('100', 'ether'), {from: alice, value: toWei('100', 'ether')});


      await fork.mint(deployer, toWei('1000', 'ether'));
      // 1. create pair
      await swapFactory.createPair(fork.address, wbnb.address);
      const pair_addr = await swapFactory.getPair(fork.address, wbnb.address);
      const pair = await IERC20.at(pair_addr);
      // 2. add liquidity
      // Approving swap on tokens for liquidity;
      await Promise.all([
        approveIfNot(fork, deployer, swapRouter.address, toWei('1000', 'ether')),
      ]);
      const amount = toWei('1000', 'ether');
      const amountMin = toWei('1000', 'ether');
      const amountETHMin = toWei('1', 'ether');
      await swapRouter.addLiquidityETH(
        fork.address, amount, amountMin, amountETHMin, deployer, deadline(), {from: deployer, value: amountETHMin},
        );

      assert.equal(toWei('31.622776601683792319', 'ether'), (await pair.balanceOf(deployer)).toString(), "addLiquidityETH error");
    
      // swap
      await moonFund.toTheMoon(toWei('50', 'ether'), toWei('0', 'ether'));
      assert.equal(toWei((100*0.85-50)+'', 'ether'), (await wbnb.balanceOf(moonFund.address)).toString(), "toTheMoon error");
      await truffleAssert.reverts(moonFund.toTheMoon(toWei('50', 'ether'), toWei('0', 'ether')), "toTheMoon: INSUFFICIENT_INPUT_AMOUNT");
    })

    it("should slowDown", async() => {
      await moonFund.deposit(0,toWei('100', 'ether'), {from: alice, value: toWei('100', 'ether')});


      await fork.mint(deployer, toWei('1000', 'ether'));
      // 1. create pair
      await swapFactory.createPair(fork.address, wbnb.address);
      const pair_addr = await swapFactory.getPair(fork.address, wbnb.address);
      const pair = await IERC20.at(pair_addr);
      // 2. add liquidity
      // Approving swap on tokens for liquidity;
      await Promise.all([
        approveIfNot(fork, deployer, swapRouter.address, toWei('1000', 'ether')),
      ]);
      const amount = toWei('1000', 'ether');
      const amountMin = toWei('1000', 'ether');
      const amountETHMin = toWei('1', 'ether');
      await swapRouter.addLiquidityETH(
        fork.address, amount, amountMin, amountETHMin, deployer, deadline(), {from: deployer, value: amountETHMin},
        );

      assert.equal(toWei('31.622776601683792319', 'ether'), (await pair.balanceOf(deployer)).toString(), "addLiquidityETH error");
      // swap
      await moonFund.toTheMoon(toWei('50', 'ether'), toWei('0', 'ether'));
      const b = (await fork.balanceOf(moonFund.address)).toString();
      assert.equal(toWei((100*0.85-50)+'', 'ether'), (await wbnb.balanceOf(moonFund.address)).toString(), "toTheMoon error");
      await moonFund.slowDown(toWei('500', 'ether'), toWei('0', 'ether'));
      assert.equal(web3.utils.toBN(b).sub(web3.utils.toBN(toWei('500', 'ether').toString())).toString(), (await fork.balanceOf(moonFund.address)).toString());
    })
    it("should reverts when withdrawFork before unlock", async()=>{
      await moonFund.deposit(0,toWei('4000', 'ether'), {from: bob, value: toWei('4000', 'ether')});
    })
    it("should reverts when withdrawEth before unlock", async()=>{
      await moonFund.deposit(0,toWei('100', 'ether'), {from: alice, value: toWei('100', 'ether')});
    })
    it("should reverts when withdrawEth'caller is not timelock", async()=>{
      await moonFund.deposit(0,toWei('100', 'ether'), {from: alice, value: toWei('100', 'ether')});
    })
    it("should reverts when withdrawFork'caller is not timelock", async()=>{
      await moonFund.deposit(0,toWei('300', 'ether'), {from: alice, value: toWei('300', 'ether')});
    })
    it("should reverts when call withdrawFork but timelock is not delay", async()=>{
      await moonFund.deposit(0,toWei('100', 'ether'), {from: alice, value: toWei('100', 'ether')});
    })
    it("should reverts when call withdrawEth but timelock is not delay", async()=>{
      await moonFund.deposit(0,toWei('2000', 'ether'), {from: alice, value: toWei('2000', 'ether')});
    })
  })

  describe("when using moonFund", () => {
    // it('should withdrawETH', async()=>{
    //   await moonFund.deposit(0,toWei('100', 'ether'), {from: alice, value: toWei('100', 'ether')});


    //   await fork.mint(deployer, toWei('1000', 'ether'));
    //   // 1. create pair
    //   await swapFactory.createPair(fork.address, wbnb.address);
    //   const pair_addr = await swapFactory.getPair(fork.address, wbnb.address);
    //   const pair = await IERC20.at(pair_addr);
    //   // 2. add liquidity
    //   // Approving swap on tokens for liquidity;
    //   await Promise.all([
    //     approveIfNot(fork, deployer, swapRouter.address, toWei('1000', 'ether')),
    //   ]);
    //   const amount = toWei('1000', 'ether');
    //   const amountMin = toWei('1000', 'ether');
    //   const amountETHMin = toWei('1', 'ether');
    //   await swapRouter.addLiquidityETH(
    //     fork.address, amount, amountMin, amountETHMin, deployer, deadline(), {from: deployer, value: amountETHMin},
    //     );

    //   assert.equal(toWei('31.622776601683792319', 'ether'), (await pair.balanceOf(deployer)).toString(), "addLiquidityETH error");
      
    //   // swap
    //   await moonFund.toTheMoon(toWei('50', 'ether'), toWei('0', 'ether'));
    //   const b = (await web3.eth.getBalance(deployer)).toString();

    //   await moonFund.withdrawEth(toWei('1.1', 'ether'), {from: deployer});
    //   assert.equal(toWei((100*0.85-50-1.1)+'', 'ether'), (await wbnb.balanceOf(moonFund.address)).toString());
    // })
    // it('should withdrawFork', async()=>{
    //   await fork.mint(moonFund.address, toWei('1000', 'ether'));
    //   await moonFund.withdrawFork(bob, toWei('50', 'ether'));
    //   assert.equal(toWei(1000-50+'', 'ether'), (await fork.balanceOf(moonFund.address)).toString());
    // })

    it('should work', async() => {
      await moonFund.deposit(0,toWei('100', 'ether'), {from: alice, value: toWei('100', 'ether')});
      await moonFund.deposit(0,toWei('500', 'ether'), {from: bob, value: toWei('500', 'ether')});

      await fork.mint(moonFund.address, toWei('1880000', 'ether'));

      await fork.mint(deployer, toWei('1000', 'ether'));
      // 1. create pair
      await swapFactory.createPair(fork.address, wbnb.address);
      const pair_addr = await swapFactory.getPair(fork.address, wbnb.address);
      const pair = await IERC20.at(pair_addr);
      // 2. add liquidity
      // Approving swap on tokens for liquidity;
      await Promise.all([
        approveIfNot(fork, deployer, swapRouter.address, toWei('1000', 'ether')),
      ]);
      const amount = toWei('1000', 'ether');
      const amountMin = toWei('1000', 'ether');
      const amountETHMin = toWei('1', 'ether');
      await swapRouter.addLiquidityETH(
        fork.address, amount, amountMin, amountETHMin, deployer, deadline(), {from: deployer, value: amountETHMin},
        );

      assert.equal(toWei('31.622776601683792319', 'ether'), (await pair.balanceOf(deployer)).toString(), "addLiquidityETH error");
      
      // swap
      await moonFund.toTheMoon(toWei('50', 'ether'), toWei('0', 'ether'));

      // await moonFund.withdrawEth(toWei('1.1', 'ether'), {from: deployer});
      // assert.equal(toWei((600*0.85-50-1.1)+'', 'ether'), (await wbnb.balanceOf(moonFund.address)).toString());

    })

  });

  describe('when using timelock', ()=> {
    it("should withdrawEth with timelock", async()=>{
      await moonFund.deposit(0,toWei('1000', 'ether'), {from: alice, value: toWei('1000', 'ether')});
      await moonFund.deposit(0,toWei('3000', 'ether'), {from: bob, value: toWei('3000', 'ether')});
      const EXACT_ETA = (await latest()) + 60*60*24+1;
      const SIZE = toWei('100', 'ether');
      const signature = `withdrawEth(address,uint256)`;
      await timelock.queueTransaction(
        moonFund.address,
        0,
        signature,
        web3.eth.abi.encodeParameters(['address', 'uint256'],[alice, SIZE]),
        EXACT_ETA,
        {from: deployer}
      );
      await increaseTime(24 * 60 * 60+10);
      let alice_b = (await web3.eth.getBalance(alice)).toString();
      alice_b = web3.utils.toBN(alice_b).add(web3.utils.toBN(toWei('100', 'ether')));
      await timelock.executeTransaction(
        moonFund.address,
        0,
        signature,
        web3.eth.abi.encodeParameters(['address', 'uint256'],[alice, SIZE]),
        EXACT_ETA,
        {from: deployer}
      );

      assert.equal(alice_b.toString(), (await web3.eth.getBalance(alice)).toString());
    })
    it("should withdrawFork with timelock", async()=>{
      await fork.mint(moonFund.address, toWei('1000', 'ether'));

      await moonFund.deposit(0,toWei('1000', 'ether'), {from: alice, value: toWei('1000', 'ether')});
      await moonFund.deposit(0,toWei('3000', 'ether'), {from: bob, value: toWei('3000', 'ether')});
      const EXACT_ETA = (await latest()) + 60*60*24+1;
      const SIZE = toWei('100', 'ether');
      const signature = `withdrawFork(address,uint256)`;
      await timelock.queueTransaction(
        moonFund.address,
        0,
        signature,
        web3.eth.abi.encodeParameters(['address', 'uint256'],[alice, SIZE]),
        EXACT_ETA,
        {from: deployer}
      );
      await increaseTime(24 * 60 * 60+10);
      let alice_b = (await fork.balanceOf(alice)).toString();
      alice_b = web3.utils.toBN(alice_b).add(web3.utils.toBN(toWei('100', 'ether')));
      await timelock.executeTransaction(
        moonFund.address,
        0,
        signature,
        web3.eth.abi.encodeParameters(['address', 'uint256'],[alice, SIZE]),
        EXACT_ETA,
        {from: deployer}
      );

      assert.equal(alice_b.toString(), (await fork.balanceOf(alice)).toString());
    })
  })

});

async function approveIfNot(token, owner, spender, amount) {
  const allowance = await token.allowance(owner, spender);
  if (web3.utils.toBN(allowance).gte(web3.utils.toBN(amount))) {
    return;
  }
  await token.approve(spender, amount);
}

function deadline() {
  // 30 minutes
  return Math.floor(new Date().getTime() / 1000) + 1800;
}

function sleep (time) {
  return new Promise((resolve) => setTimeout(resolve, time));
}


const truffleAssert = require('truffle-assertions');

const sForkToken = artifacts.require('sForkToken');
const MockERC20 = artifacts.require('MockERC20');
const MockWBNB = artifacts.require('MockWBNB');
const MoonFund = artifacts.require("MoonFund");

const UniswapV2Factory = artifacts.require('UniswapV2Factory');
const UniswapV2Router02 = artifacts.require('UniswapV2Router02');

contract('MoonFund', async (accounts) => {
  const CHECK_REWARD_PER_BLOCK = web3.utils.toWei('5000', 'ether');
  const START_TIME = Date.parse('2021-03-22 14:00:00') / 1000;
  const END_TIME = Date.parse('2021-03-26 14:00:00') / 1000;
  let deployer, alice, bob, dev;
  const { toWei } = web3.utils;
  const { fromWei } = web3.utils;

  beforeEach(async () => {
    // pancake-swap
    swapRouter = await UniswapV2Router02.deployed();
    swapFactory = await UniswapV2Factory.deployed();
    // tokens
    sfork = await sForkToken.new();
    wbnb = await MockWBNB.deployed();
    fork = await MockERC20.new('Mock Fork Token', 'FORK');

    // users
    [deployer, alice, bob, dev] = accounts;
    // MoonFund
    moonFund = await MoonFund.new(swapRouter.address, sfork.address, wbnb.address, deployer, START_TIME, END_TIME);
    await sfork.transferOwnership(moonFund.address);
    
  })

  describe('when use moonFund crowdfunding', () => {
    it('should deposit BNB to get sFORK', async () => {
      await moonFund.deposit(toWei('11', 'ether'), {from: alice, value: toWei('11', 'ether')});

      assert.equal(toWei(11*282+'', 'ether'), (await sfork.balanceOf(alice)).toString(), 'alice\'s sfork error ');
      assert.equal(toWei(11*0.9+'', 'ether'), (await wbnb.balanceOf(moonFund.address)).toString());
      assert.equal(toWei(11*0.1+'', 'ether'), (await wbnb.balanceOf(deployer)).toString());
      assert.equal(toWei('11', 'ether'), (await moonFund.soldOfETH()).toString());
      assert.equal(toWei(11*282+'', 'ether'), (await moonFund.sold()).toString());
    });

    it('shold revert when amount is smaller then 0.1bnb', async () => {
      await truffleAssert.fails(moonFund.deposit(toWei('0.09', 'ether'), {from: bob, value: toWei('0.09', 'ether')}), null, "amount must > 0.1");
    });

    // it('should revert when sfork sold out', async()=>{
    //   await moonFund.deposit(toWei('9999', 'ether'), {from: bob, value: toWei('9999', 'ether')});
    //   await truffleAssert.reverts(moonFund.deposit(toWei('100', 'ether'), {from: bob, value: toWei('100', 'ether')}), "sold out");
    // })
  });

  describe('when setting moonFund', () => {
    it('should add cash pool', async () => {
      // transfer $FORK to moonFund after deploy $FORK 
      await fork.mint(moonFund.address, toWei('28200000', 'ether'));
      // add cash pool
      await moonFund.addCashPool(50, Date.parse('2021-03-23 18:00:00') / 1000);
      await moonFund.addCashPool(50, Date.parse('2021-03-24 18:00:00') / 1000);

      assert.equal(2, (await moonFund.poolLength()));
    })

    it('should cash', async () => {
      // deposit 100 bnb
      await moonFund.deposit(toWei('100', 'ether'), {from: alice, value: toWei('100', 'ether')});
      // transfer $FORK to moonFund after deploy $FORK 
      await fork.mint(moonFund.address, toWei('28200000', 'ether'));
      // set fork address
      await moonFund.setForkAddress(fork.address);
      // add cash pool
      await moonFund.addCashPool(50, parseInt((Date.now() / 1000)));
      await moonFund.addCashPool(20, parseInt((Date.now() / 1000)+ 20));
      await moonFund.addCashPool(30, parseInt((Date.now() / 1000)+ 100));
      assert.equal(toWei(282*100*0.5+'', 'ether'), (await moonFund.pendingCash(0, alice)).toString());

      await moonFund.cash(0, toWei('100', 'ether'), {from: alice});

      assert.equal(toWei((282*100*0.5-100)+'', 'ether'), (await moonFund.pendingCash(0, alice)).toString());
    })
  })
});
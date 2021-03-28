pragma solidity 0.6.6;

import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import '@openzeppelin/contracts/utils/Address.sol';

import "./sForkToken.sol";
import "./interfaces/IMoonFund.sol";
import "./owner/Operator.sol";
import "./interfaces/IRouter02.sol";
import "./interfaces/IWETH.sol";

contract MoonFund is
  IMoonFund,
  Ownable,
  Operator
{
  using SafeMath for uint256;
  using Address for address;
  using SafeERC20 for IERC20;

  // The TOKEN
  sForkToken public sfork;
  IERC20 public fork;
  address public weth;

  IRouter02 public router;

  // Dev address.
  address public devaddr;
  address public marketaddr;

  uint256 public totalDeposit;
  uint256 public currentDepositValue;

  mapping(address => uint256) userTotalDeposit;
  mapping(address => uint256) userHasFork;

  bool public isSetForkAddress;
  uint256 createdAt;

  struct SellPool {
    uint256 price;
    uint256 cap;
    uint256 startTime;
    uint256 endTime;
    uint256 sold;
  }
  SellPool[] public sellPool;
  mapping(uint256 => mapping(address => uint256)) whitelist;

  // cash pool
  struct CashPool {
    uint256 point;
    uint256 startTime;
  }

  CashPool[] public cashPool;

  mapping(uint256 => mapping(address => uint256)) public userCashed;

  event Deposit(address indexed user, uint256 amount);
  event Cashed(address indexed user, uint256 indexed pid, uint256 amount);
  event SwapExacted(address indexed user, address indexed token0,address indexed token1, uint256 amountIn);

  constructor(
    IRouter02 _router,
    sForkToken _sfork,
    address _weth,
    address _devaddr,
    address _marketaddr
  ) public {
    router = _router;
    sfork = _sfork;
    weth = _weth;
    devaddr = _devaddr;
    marketaddr = _marketaddr;
    isSetForkAddress = false;
    createdAt = block.timestamp;
  }

  modifier checkActive(uint256 _pid) {
    require(block.timestamp >= sellPool[_pid].startTime, 'crowdfunding: not start');
    require(block.timestamp < sellPool[_pid].endTime, 'crowdfunding: is over');
    _;
  }

  modifier checkCash(uint256 _pid) {
    require(isSetForkAddress, "cashing not active");
    require(block.timestamp >= cashPool[_pid].startTime, 'cashing: not start');
    _;
  }

  function setDev(address _devaddr) public {
    require(msg.sender == devaddr, "dev: wut?");
    devaddr = _devaddr;
  }

  function setMarket(address _marketaddr) public {
    require(msg.sender == _marketaddr, "market: wut?");
    marketaddr = _marketaddr;
  }

  // transfer $fork to moon-fund and set the fork address when fork deployed 
  function setForkAddress(address _fork) public onlyOperator {
    require(_fork != address(0), "add: not _fork addr");
    fork = IERC20(_fork);
    isSetForkAddress = true;
    createdAt = block.timestamp;
  }

  function addCashPool(uint256 _point, uint256 _startTime) public override onlyOperator {
    uint256 allPoint = _point.add(poolsPoint());
    require(allPoint<=100, "add: all haven cashed");
    require(_startTime >= block.timestamp, "add: startTime must > current time");
    cashPool.push(
      CashPool({
        point: _point,
        startTime: _startTime
      })
    );
  }

  function poolsPoint() public view returns (uint256) {
    uint256 currentPoint = 0;
    uint256 length = cashPool.length;
    for (uint256 _pid = 0; _pid < length; _pid++) {
      currentPoint = currentPoint.add(cashPool[_pid].point);
    }
    return currentPoint;
  }

  function cashPoolLength() external override view returns (uint256) {
    return cashPool.length;
  }
  function userDeposit(address _user) external view returns(uint256) {
    return userTotalDeposit[_user];
  }

  function addSellPool(
    uint256 _price,
    uint256 _cap,
    uint256 _startTime,
    uint256 _endTime
  ) public override onlyOperator {
    require(_endTime >= block.timestamp, "add: endTime must > current time");
    sellPool.push(
      SellPool({
        price: _price,
        cap: _cap,
        startTime: _startTime,
        endTime: _endTime,
        sold: 0
      })
    );
  }

  function sellPoolLength() external override view returns (uint256) {
    return sellPool.length;
  }

  // whitelist
  function massUpdateWhitelist(uint256 _pid, uint256 _amountMax, address[] calldata users) external onlyOperator {
    uint256 length = users.length;
    for (uint256 i = 0; i < length; ++i) {
      updateWhitelist(_pid, users[i], _amountMax);
    }
  }

  // whitelist
  function updateWhitelist(uint256 _pid, address _user, uint256 _amountMax) public onlyOperator {
    whitelist[_pid][_user] = _amountMax;
  }

  /**
  * crowdfunding
  */
  function deposit(uint256 _pid,uint256 amount)
  external override payable checkActive(_pid) {
    _deposit(_pid, amount);
  }
  
  function _deposit(uint256 _pid,uint256 amount) internal {
    require(msg.value != 0, "msg.value == 0");
    require(amount == msg.value, "amount != msg.value");
    require(amount>=1e17, "amount must > 0.1");
    require(amount<=whitelist[_pid][msg.sender], "white-list amount must > 0");

    uint256 rewards = amount.mul(sellPool[_pid].price);
    require(sellPool[_pid].sold.add(rewards)<=sellPool[_pid].cap, "sold out");
    IWETH(weth).deposit{value: msg.value}();
    IERC20(weth).safeTransfer(devaddr, amount.div(10));
    IERC20(weth).safeTransfer(marketaddr, amount.div(20));
    sfork.mint(msg.sender, rewards);
    userTotalDeposit[msg.sender] = userTotalDeposit[msg.sender].add(amount);
    currentDepositValue = currentDepositValue.add(amount);
    userHasFork[msg.sender] = userHasFork[msg.sender].add(rewards);
    sellPool[_pid].sold = sellPool[_pid].sold.add(rewards);
    emit Deposit(msg.sender, amount);
  }

  function currentDeposit() external override view returns (uint256) {
    return currentDepositValue;
  }

  function pending(uint256 _pid) external override view returns(uint256) {
    return sellPool[_pid].cap.sub(sellPool[_pid].sold);
  }

  function sold(uint256 _pid) external view returns(uint256) {
    return sellPool[_pid].sold;
  }

  function pendingOfETH(uint256 _pid) external view returns(uint256) {
    return sellPool[_pid].cap.sub(sellPool[_pid].sold).div(sellPool[_pid].price);
  }

  function soldOfETH(uint256 _pid) external view returns(uint256) {
    return sellPool[_pid].sold.div(sellPool[_pid].price);
  }

  /**
   * cash
   */

  function cash(uint256 _pid, uint256 _amount) external override {
    _cash(_pid, _amount);
  }

  function pendingCash(uint256 _pid, address _user) external override view returns (uint256) {
    return cash_limit(_pid, _user);
  }

  function _cash(uint256 _pid, uint256 _amount) internal checkCash(_pid) {
    uint256 maxCash = cash_limit(_pid, msg.sender);
    require(_amount<=maxCash, 'cashing: amount > maxlimit');
    sfork.burn(msg.sender, _amount);
    fork.safeTransfer(msg.sender, _amount);
    userCashed[_pid][msg.sender] = userCashed[_pid][msg.sender].add(_amount);
    emit Cashed(msg.sender, _pid, _amount);
  }

  function cash_limit(uint256 _pid, address _user) public view returns (uint256) {
    return userHasFork[_user].mul(cashPool[_pid].point).div(100).sub(userCashed[_pid][_user]);
  }

  /**
   * buy
   */
  function toTheMoon(uint256 _amount, uint256 _amountOutMin) external onlyOperator {
    require(_amount<=IERC20(weth).balanceOf(address(this)), "toTheMoon: INSUFFICIENT_INPUT_AMOUNT");
    address[] memory path = new address[](2);
    path[0] = weth;
    path[1] = address(fork);
    _approve(IERC20(weth), address(router), _amount);
    _swapExactTokensForTokens(_amount, _amountOutMin, path);
  }

  function slowDown(uint256 _amount, uint256 _amountOutMin) external onlyOperator {
    require(_amount<=fork.balanceOf(address(this)), "toTheMoon: INSUFFICIENT_INPUT_AMOUNT");
    address[] memory path = new address[](2);
    path[0] = address(fork);
    path[1] = weth;
    _approve(fork, address(router), _amount);
    _swapExactTokensForTokens(_amount, _amountOutMin, path);
  }
  

  // Buy in specified quantity
  function _swapTokensForExactTokens(
    uint amountOut,
    uint amountInMax,
    address[] memory path
  ) internal {
    address to = address(this);
    uint256 deadline = block.timestamp + 1800;
    bytes memory data = abi.encodeWithSelector(router.swapTokensForExactTokens.selector, amountOut, amountInMax, path, to, deadline);
    bytes memory returndata = address(router).functionCall(data, "Buy: low-level swapTokensForExactTokens() call failed");
    if (returndata.length > 0) {
      require(abi.decode(returndata, (bool)), "Buy: operation swapTokensForExactTokens() did not succeed");
    }
  }

  // Sell in specified quantity
  function _swapExactTokensForTokens(
    uint amountIn,
    uint amountOutMin,
    address[] memory path
    ) internal {
    address to = address(this);
    uint256 deadline = block.timestamp + 1800;
    bytes memory data = abi.encodeWithSelector(router.swapExactTokensForTokens.selector, amountIn, amountOutMin, path, to, deadline);
    bytes memory returndata = address(router).functionCall(data, "Sell: low-level swapExactTokensForTokens() call failed");
    if (returndata.length > 0) {
      require(abi.decode(returndata, (bool)), "Sell: operation swapExactTokensForTokens() did not succeed");
      emit SwapExacted(address(this), path[0], path[1], amountIn);
    }
  }

  function _approve(IERC20 token, address spender,uint256 amount) internal {
    if ((amount == 0) || (token.allowance(address(this), spender) == 0)) {
      token.safeApprove(spender, amount);
    } else if(token.allowance(address(this), spender) < amount) {
      token.safeIncreaseAllowance(spender, amount);
    } else {
      token.safeDecreaseAllowance(spender, amount);
    }
  }

  // locked 3*30day
  // owned by timelock;
  // all withdraw must after lock and by timelock
  modifier checkLock() {
    uint256 unlockAt =  createdAt.add(3600*24*30*3);
    require(block.timestamp>=unlockAt, "locking");
    _;
  }

  function withdrawEth(address _to, uint256 _amount) external checkLock onlyOwner {
    IWETH(weth).withdraw(_amount);
    address(uint160(_to)).transfer(_amount);

  }

  function withdrawFork(address _to, uint256 _amount) external checkLock onlyOwner {
    fork.safeTransfer(_to, _amount);
  }
  
  function getCroTime(uint256 _pid) external view returns(uint256, uint256, uint256) {
    return (sellPool[_pid].startTime, sellPool[_pid].endTime, block.timestamp);
  }

  receive() external payable {}
}
pragma solidity 0.6.6;

import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/Address.sol";

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
  IERC20 public fork;
  address public weth;

  IRouter02 public router;

  // Dev address.
  address public devaddr;
  address public marketaddr;

  uint256 public totalDeposit;
  uint256 public currentDepositValue;

  mapping(address => uint256) private userTotalDeposit;
  mapping(address => uint256) private userHasFork;

  uint256 public createdAt;
  uint256 public lockTime;

  struct SellPool {
    string title;
    uint256 price;
    uint256 cap;
    uint256 startTime;
    uint256 endTime;
    uint256 sold;
    // other config
    uint256 allocationMin;
    uint256 allocationMax;
    uint256 markePoint;
    uint256 devPoint;
    bool isPrivate;
  }
  SellPool[] public sellPool;
  mapping(uint256 => mapping(address => uint256)) public whitelist;
  mapping(uint256 => mapping(address => uint256)) public whitelistQuataUsed;

  event Deposit(address indexed user, uint256 amount);
  event SwapExacted(address indexed user, address indexed token0,address indexed token1, uint256 amountIn);

  constructor(
    IRouter02 _router,
    IERC20 _fork,
    address _weth,
    address _devaddr,
    address _marketaddr,
    uint256 _lockTime
  ) public {
    router = _router;
    fork = _fork;
    weth = _weth;
    devaddr = _devaddr;
    marketaddr = _marketaddr;
    createdAt = block.timestamp;
    lockTime = _lockTime;
  }

  modifier checkActive(uint256 _pid) {
    require(block.timestamp >= sellPool[_pid].startTime, 'crowdfunding: not start');
    require(block.timestamp < sellPool[_pid].endTime, 'crowdfunding: is over');
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

  function addSellPool(
    string memory _title,
    uint256 _price,
    uint256 _cap,
    uint256 _startTime,
    uint256 _endTime,
    uint256 _allocationMin,
    uint256 _allocationMax,
    uint256 _marketPoint,
    uint256 _devPoint,
    bool _isPrivate
  ) public override onlyOperator {
    require(_endTime >= block.timestamp, "add: endTime must > current time");
    sellPool.push(
      SellPool({
        title: _title,
        price: _price,
        cap: _cap,
        startTime: _startTime,
        endTime: _endTime,
        sold: 0,
        // other config
        allocationMin: _allocationMin,
        allocationMax: _allocationMax,
        markePoint: _marketPoint,
        devPoint: _devPoint,
        isPrivate: _isPrivate
      })
    );
  }

  // function setSellPool(
  //   uint256 _pid,
  //   string memory _title,
  //   uint256 _price,
  //   uint256 _cap,
  //   uint256 _startTime,
  //   uint256 _endTime,
  //   uint256 _allocationMin,
  //   uint256 _allocationMax
  // ) public onlyOperator {
  //   require(_endTime >= block.timestamp, "update: endTime must > current time");
  //   require(sellPool[_pid].startTime < block.timestamp, "update: can't update after start");
  //   sellPool[_pid].title = _title;
  //   sellPool[_pid].price = _price;
  //   sellPool[_pid].startTime = _startTime;
  //   sellPool[_pid].endTime = _endTime;
  //   sellPool[_pid].allocationMin = _allocationMin;
  //   sellPool[_pid].allocationMax = _allocationMax;
  // }

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
    require(amount>=sellPool[_pid].allocationMin, "amount must > allocationMin");
    require(amount<=sellPool[_pid].allocationMax, "amount must <= allocationMax");
    if (sellPool[_pid].isPrivate) {
      require(amount<=whitelist[_pid][msg.sender], "white-list amount must > 0");
    }

    uint256 rewards = amount.mul(sellPool[_pid].price);
    require(sellPool[_pid].sold.add(rewards)<=sellPool[_pid].cap, "sold out");

    IWETH(weth).deposit{value: msg.value}();
    IERC20(weth).safeTransfer(devaddr, amount.mul(sellPool[_pid].devPoint).div(100));
    IERC20(weth).safeTransfer(marketaddr, amount.mul(sellPool[_pid].markePoint).div(100));
    fork.safeTransfer(msg.sender, rewards);

    userTotalDeposit[msg.sender] = userTotalDeposit[msg.sender].add(amount);
    currentDepositValue = currentDepositValue.add(amount);
    userHasFork[msg.sender] = userHasFork[msg.sender].add(rewards);
    whitelistQuataUsed[_pid][msg.sender] = whitelistQuataUsed[_pid][msg.sender].add(amount);
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

  function userPendingQuata(uint256 _pid, address _user) external view returns(uint256) {
    if (sellPool[_pid].isPrivate && whitelist[_pid][_user] <= sellPool[_pid].allocationMax) {
      return whitelist[_pid][_user].sub(whitelistQuataUsed[_pid][_user]);
    }
    return sellPool[_pid].allocationMax.sub(whitelistQuataUsed[_pid][_user]);
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
    uint256 unlockAt =  createdAt.add(lockTime);
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
pragma solidity 0.6.6;

interface IMoonFund {
  function sellPoolLength() external view returns (uint256);


  function addSellPool(
    string calldata _title,
    uint256 _price,
    uint256 _cap,
    uint256 _startTime,
    uint256 _endTime,
    uint256 _allocationMin,
    uint256 _allocationMax,
    uint256 _marketPoint,
    uint256 _devPoint,
    bool _isPrivate
  ) external;

  function pending(uint256 _pid) external view returns (uint256);
  

  function deposit(uint256 _pid,uint256 _amount) payable external;
  function currentDeposit() external view returns (uint256);
}
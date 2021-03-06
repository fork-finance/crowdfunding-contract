pragma solidity 0.6.6;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

// sForkToken.
contract sForkToken is ERC20("Share Fork Token", "sFORK"), Ownable {

  // 18800000*0.1
  // uint256 private _cap = 1880000e18;

  constructor() public {
    _setupDecimals(18);
  }

  // function cap() public view returns (uint256) {
  //   return _cap;
  // }

  function mint(address _to, uint256 _amount) public onlyOwner {
    // require(totalSupply().add(_amount) <= cap(), "cap exceeded");
    _mint(_to, _amount);
  }

  function burn(address _account, uint256 _amount) public onlyOwner {
    _burn(_account, _amount);
  }
  
}
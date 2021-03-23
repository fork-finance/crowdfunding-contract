# Crowdfunding

**The existence of the To-the-moon fund is to stabilize the price of $FORK and provide continuous impetus for $FORK to the moon**

# Usage

```
yarn
```

# Functions

sFork-Token

Crowdfunding

MoonFund

* setDev()
* setCashToken()
* setFork()
* toTheMoon()
* slowDown()
* cash()
* deposit()


# Test case

- [] MoonFund
  - [x] deposit
    - [x] should deposit
    - [x] should reverts when activity is end
    - [x] should reverts when activity is not start
    - [x] should reverts when sold out
  - [x] addCashPool
    - [x] should add cash pool
    - [x] should reverts when pool point is full
  - [] cash
    - [x] should cash $sFORK for $FORK
    - [x] should reverts when cash enable < amount
    - [x] should reverts when cash pool is not start
    - [x] should reverts when fork address not set
  - [x] toTheMoon
    - [x] should toTheMoon
    - [x] should reverts when call user is not opreator
    - [x] should reverts when amount > balance
  - [x] withdrawEth
    - [] should reverts when withdrawETH befor unlock
    - [] should reverts withdrawETH by anyone except timelock
  - [] withdrawFork
    - [] should reverts when withdrawFork befor unlock
    - [] should reverts withdrawFork by anyone except timelock




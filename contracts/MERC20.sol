// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MERC20 is ERC20 {
    constructor(string memory _name, string memory _symbol) ERC20(_name, _symbol) {
        mintself(1000_000_000);
    }

    function name() public view override returns (string memory) {
        return super.name();
    }

    function symbol() public view override returns (string memory) {
        return super.symbol();
    }

    function mint(uint amount) external {
        _mint(msg.sender, amount);
    }

    function mintself(uint amount) private  {
        _mint(msg.sender, amount);
    }
}
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IERC20 {
    // *************************** 函数 ***************************
    // 查询发行总量
    function totalSupply() external view returns (uint);

    // 查询账户余额
    function balanceOf(address account) external view returns (uint);

    // 转账
    function transfer(address recipient, uint amount) external returns (bool);

    // 获取授权额度
    function allowance(address owner,address spender) external view returns (uint);

    // 授权
    function approve(address spender, uint amount) external returns (bool);

    // 授权转账
    function transferFrom(address sender,address recipient,uint amount) external returns (bool);

    // *************************** 事件 ***************************
    // 转账事件
    event Transfer(address indexed from, address indexed to, uint value);
    // 授权事件
    event Approval(address indexed owner, address indexed spender, uint value);
}

contract MYERC20 is IERC20 {
    uint public totalSupply;
    mapping(address  => uint) public balanceOf;
    mapping(address  => mapping(address  => uint)) public allowance;
    string public name;
    string public symbol;
    uint8 public decimals = 18;

    // 构造函数
    constructor(string memory _name, string memory _symbol) {
        name = _name;
        symbol = _symbol;
        mintself(100 * 10**uint(decimals));
    }

    // 转账
    function transfer(address recipient, uint amount) external returns (bool) {
        balanceOf[msg.sender] -= amount;
        balanceOf[recipient] += amount;
        emit Transfer(msg.sender, recipient, amount);
        return true;
    }

    // 授权
    function approve(address spender, uint amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    // 授权转账
    function transferFrom(address senderFrom, address recipient,uint amount) external returns (bool) {
        allowance[senderFrom][msg.sender] -= amount;
        balanceOf[senderFrom] -= amount;
        balanceOf[recipient] += amount;
        emit Transfer(senderFrom, recipient, amount);
        return true;
    }

    // mint 函数：发行代币，示例代码，直接 mint 到 msg.sender
    function mint(uint amount) external {
        balanceOf[msg.sender] += amount;
        totalSupply += amount;
        emit Transfer(address(0), msg.sender, amount);
    }
    // mint 函数：发行代币，示例代码，直接 mint 到 msg.sender
    function mintself(uint amount) private  {
        balanceOf[msg.sender] += amount;
        totalSupply += amount;
        emit Transfer(address(0), msg.sender, amount);
    }

    // burn 函数：销毁代币，示例代码，直接从 msg.sender 中销毁
    function burn(uint amount) external {
        balanceOf[msg.sender] -= amount;
        totalSupply -= amount;
        emit Transfer(msg.sender, address(0), amount);
    }
}

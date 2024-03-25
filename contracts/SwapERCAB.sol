// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";

contract SwapERCAB is Ownable {
    IERC20 public m_tokenA;
    IERC20 public m_tokenB;

    uint public m_tokenABalance;
    uint public m_tokenBBalance;

    uint public m_ratioA2B;

    address public m_creator;
    bool public m_isActive;

    event SwapCreated(address indexed creator);
    event TokensAdded(address indexed creator,uint amountA, uint amountB);
    event SwapEvent(address indexed sender,IERC20 tokenIn,uint amountIn,IERC20 tokenOut,uint amountOut);


    constructor(IERC20 tokenA, IERC20 tokenB,uint ratioA2B) Ownable(msg.sender)  {
        m_tokenA = tokenA;
        m_tokenB = tokenB;
        m_ratioA2B = ratioA2B;
        m_creator = owner();
        m_isActive = true;
        emit SwapCreated(m_creator);
    }

    function setRatio(uint ratioA2B) external onlyOwner {
        m_ratioA2B = ratioA2B;
    }

    function calculateAmountOut(uint amountIn,uint reserveOut,bool isA2B,uint ratioA2B) public pure returns (uint amountOut) {
        require(amountIn > 0, "Insufficient input amount");
        require(ratioA2B > 0, "Invalid ratio");

        bool success;
        if (isA2B) {
            (success, amountOut) = Math.tryMul(amountIn , ratioA2B);
        } else {
            (success, amountOut )= Math.tryDiv(amountIn, ratioA2B);
        }

        require(success, "Calculation failed");
        require(amountOut > 0 && amountOut <= reserveOut , "Insufficient output amount");
    }

    function swap(uint amountIn,bool isA2B) public returns (uint amountOut) {
        require(m_isActive, "Swap is not active");

        IERC20 tokenIn = isA2B? m_tokenA: m_tokenB;
        IERC20 tokenOut = isA2B? m_tokenB: m_tokenA;

        require(amountIn > 0 , "Amount must be greater than 0");
        require(tokenIn.balanceOf(msg.sender) >= amountIn , "Insufficient balance");
        require(tokenIn.allowance(msg.sender, address(this)) >= amountIn , "Insufficient allowance");

        // uint tokenInBalance = tokenIn.balanceOf(address(this));
        uint tokenOutBalance = tokenOut.balanceOf(address(this));

        amountOut = calculateAmountOut(amountIn, tokenOutBalance, isA2B, m_ratioA2B);

        tokenIn.transferFrom(msg.sender, address(this), amountIn);
        tokenOut.transfer(msg.sender, amountOut);

        m_tokenABalance = tokenIn.balanceOf(address(this));
        m_tokenBBalance = tokenOut.balanceOf(address(this));

        emit SwapEvent(msg.sender,tokenIn, amountIn,tokenOut, amountOut);
    }

    function swapAtoB(uint amountAIn) public returns (uint amountBOut) {
        return swap(amountAIn, true);
    }

    function swapBtoA(uint amountBIn) public returns (uint amountAOut) {
        return swap(amountBIn, false);
    }


    function addTokens(uint amountInBaseA) external onlyOwner {
        require(!m_isActive, "Swap is active");

        (bool success,uint amountInB) = Math.tryMul(amountInBaseA, m_ratioA2B);
        require(success, "Calculation failed");

        require(m_tokenA.balanceOf(msg.sender) >= amountInBaseA, "Insufficient balance of A Token");
        require(m_tokenA.allowance(msg.sender,address(this)) >= amountInBaseA, "Insufficient balance of A Token");

        require(m_tokenB.balanceOf(msg.sender) >= amountInB, "Insufficient balance of B Token");
        require(m_tokenB.allowance(msg.sender,address(this)) >= amountInB, "Insufficient bbalance of B Token");

        m_tokenA.transferFrom(msg.sender, address(this), amountInBaseA);
        m_tokenB.transferFrom(msg.sender, address(this), amountInB);

        m_tokenABalance = m_tokenA.balanceOf(address(this));
        m_tokenBBalance = m_tokenB.balanceOf(address(this));
        
        emit TokensAdded(msg.sender, amountInBaseA, amountInB);
    }

    function activateSwap() public onlyOwner {
        m_isActive = true;
    }

    function cancelSwap() public onlyOwner {
        m_isActive = false;
        // Transfer remaining m_tokenA and m_tokenB back to the m_creator
        m_tokenA.transfer(m_creator, m_tokenA.balanceOf(address(this)));
        m_tokenB.transfer(m_creator, m_tokenB.balanceOf(address(this)));
    }
}
// SPDX-License-Identifier: MIT
import  "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";

pragma solidity ^0.8.0;

contract SwapAB is ERC20 {
    IERC20 public m_tokenA;
    IERC20 public m_tokenB;

    uint public m_totalA;
    uint public m_totalB;

    event Mint(address indexed _from, uint _amountA, uint _amountB);
    event Burn(address indexed _from, uint _amountA, uint _amountB);
    event Swap(address indexed _from, address _tokenIn, uint _amountIn,address _tokenOut, uint _amountOut);

    constructor(IERC20 tokenA, IERC20 tokenB) ERC20("SwapAB","SAB") {
        address tokenAAddress = address(tokenA);
        address tokenBAddress = address(tokenB);
        require(tokenAAddress != tokenBAddress, 'INVALID_TOKEN: tokenA and tokenB must be different');
        require(tokenAAddress != address(0) && tokenBAddress != address(0), 'INVALID_TOKEN: tokenA and tokenB must be valid');
        m_tokenA = tokenA;
        m_tokenB = tokenB;
    }

    // get min
    function min(uint x, uint y) internal pure returns (uint min_one) {
        return x < y ? x : y;
    }

    function addLiquidity(uint amountA, uint amountB) public returns (uint lp_amount) {
        require(amountA > 0 || amountB > 0, 'amount must be greater than 0'); 

        m_tokenA.transferFrom(msg.sender,address(this),amountA);
        m_tokenB.transferFrom(msg.sender,address(this),amountB);

        uint _totalSupply = totalSupply();

        if (_totalSupply == 0){
            lp_amount = Math.sqrt(amountA * amountB);
        }else{

            lp_amount = _totalSupply * min(amountA/m_totalA, amountB/m_totalB);
        }

        require(lp_amount > 0, 'INSUFFICIENT_LIQUIDITY_MINTED');

        m_totalA = m_tokenA.balanceOf(address(this));
        m_totalB = m_tokenB.balanceOf(address(this));

        _mint(msg.sender, lp_amount);

        emit Mint(msg.sender, amountA, amountB);
    }

    function removeLiquidity(uint amountLP) external returns (uint amountA, uint amountB){
        require(amountLP > 0,'INSUFFICIENT_LIQUIDITY_AMOUNT: Liquidity amount must be greater than 0');

        uint balanceA = m_tokenA.balanceOf(address(this));
        uint balanceB = m_tokenB.balanceOf(address(this));

        uint total = totalSupply();
        amountA = amountLP * balanceA / total;
        amountB = amountLP * balanceB / total;

        require(amountA > 0 && amountB > 0,'INSUFFICIENT_LIQUIDITY_BURNED:');

        _burn(msg.sender,amountLP);

        m_tokenA.transfer(msg.sender,amountA);
        m_tokenB.transfer(msg.sender,amountB);

        m_totalA = m_tokenA.balanceOf(address(this));
        m_totalB = m_tokenB.balanceOf(address(this));

        emit Burn(msg.sender, amountA, amountB);
    }

    function getAmountOut(uint amountIn,uint reserveIn,uint reserveOut) public pure returns(uint amountOut){
        require(amountIn > 0, 'INSUFFICIENT_AMOUNT: the amount in must be greater than 0');
        require(reserveIn > 0 && reserveOut > 0, 'INSUFFICIENT_LIQUIDITY: insufficient token reserve');
        amountOut = (amountIn * reserveOut)/(amountIn + reserveIn);
    }

    function swap(IERC20 tokenIn, uint amountIn, uint minAmountOut) public returns (uint amountOut) {
        require(amountIn > 0, 'INSUFFICIENT_OUTPUT_AMOUNT: the amount in must be greater than 0');
        require(tokenIn == m_tokenA || tokenIn == m_tokenB, 'INVALID_TOKEN: tokenIn must be tokenA or tokenB');

        uint balanceA = m_tokenA.balanceOf(address(this));
        uint balanceB = m_tokenB.balanceOf(address(this));

        IERC20 tokenOut;

        if (tokenIn == m_tokenA) {
            tokenOut=m_tokenB;
            amountOut = getAmountOut(amountIn, balanceA, balanceB);
        } else {
            tokenOut=m_tokenA;
            amountOut = getAmountOut(amountIn, balanceB, balanceA);
        }

        require(amountOut > minAmountOut,'INSUFFICIENT_OUTPUT_AMOUNT: the amount out is less than min out amount');
        tokenIn.transferFrom(msg.sender,address(this),amountIn);
        tokenOut.transfer(msg.sender,amountOut);

        emit Swap(msg.sender,address(tokenIn), amountIn,address(tokenOut), amountOut);
    }
}
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

contract MerchantTreasuryUSDC {
    address public immutable owner;
    IERC20 public immutable usdc;
    address public constant MOCK_ROUTER_ADDRESS = 0xE592427a0cC86a461e2d486D38aAA1e7b686D11b;

    event PaymentReceived(address indexed sender, uint256 amount);
    event FundsWithdrawn(address indexed to, uint256 amount);
    event SwapRouted(
        address indexed user,
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut
    );

    constructor(address _owner, address _usdc) {
        require(_owner != address(0), "Invalid owner");
        require(_usdc != address(0), "Invalid USDC");
        owner = _owner;
        usdc = IERC20(_usdc);
    }

    function deposit(uint256 amount) external {
        require(amount > 0, "Invalid amount");
        bool ok = usdc.transferFrom(msg.sender, address(this), amount);
        require(ok, "USDC transferFrom failed");
        emit PaymentReceived(msg.sender, amount);
    }

    function withdraw() external {
        require(msg.sender == owner, "Unauthorized");

        uint256 amount = usdc.balanceOf(address(this));
        require(amount > 0, "No funds");

        bool ok = usdc.transfer(owner, amount);
        require(ok, "USDC transfer failed");
        emit FundsWithdrawn(owner, amount);
    }

    function balance() external view returns (uint256) {
        return usdc.balanceOf(address(this));
    }

    function swapExactTokens(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOutMin
    ) external payable {
        require(amountIn > 0, "Invalid swap amount");

        if (msg.value > 0) {
            // Native Gas Token (USDC)
            require(msg.value == amountIn, "Value mismatch");
            (bool success, ) = payable(MOCK_ROUTER_ADDRESS).call{value: amountIn}("");
            require(success, "Mock Router native call failed");
        } else {
            // ERC-20 Token (EURC, cirBTC, etc.)
            bool ok = IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
            require(ok, "TransferFrom failed");
            
            // Approve the router and transfer the tokens to it
            IERC20(tokenIn).approve(MOCK_ROUTER_ADDRESS, amountIn);
            bool transferOk = IERC20(tokenIn).transfer(MOCK_ROUTER_ADDRESS, amountIn);
            require(transferOk, "Transfer to Mock Router failed");
        }

        emit SwapRouted(msg.sender, tokenIn, tokenOut, amountIn, amountOutMin);
    }
}


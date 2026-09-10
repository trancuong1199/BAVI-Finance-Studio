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

    // Kept for ABI compatibility. Swaps use the separate verified router UI.
    // Old deployed contracts are immutable and require replacement.
    function swapExactTokens(address, address, uint256, uint256) external payable {
        revert("Treasury swaps disabled; use the swap router");
    }
}

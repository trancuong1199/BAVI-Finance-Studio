// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

contract MerchantTreasuryUSDC {
    address public immutable owner;
    IERC20 public immutable usdc;

    event PaymentReceived(address indexed sender, uint256 amount);
    event FundsWithdrawn(address indexed to, uint256 amount);

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
}

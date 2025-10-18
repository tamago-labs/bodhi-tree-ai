// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

interface IBodhiVault {
    // Events
    event Deposit(address indexed sender, address indexed owner, uint256 assets, uint256 shares);
    event Withdraw(address indexed sender, address indexed receiver, address indexed owner, uint256 assets, uint256 shares);
    event BotWithdraw(address indexed bot, uint256 amount, string reason);
    event BotDeposit(address indexed bot, uint256 amount, uint256 profit);
    event BotAddressUpdated(address indexed oldBot, address indexed newBot);
    event LiquidReserveUpdated(uint256 oldPercentage, uint256 newPercentage);
    event FeesUpdated(uint256 performanceFee, uint256 managementFee);
    event FeeRecipientUpdated(address indexed oldRecipient, address indexed newRecipient);
    event PerformanceFeeCollected(uint256 amount, uint256 newHighWaterMark);
    event ManagementFeeCollected(uint256 amount);
    event AssetsUpdated(uint256 oldTotal, uint256 newTotal, int256 profitLoss);

    // Bot functions
    function botWithdraw(uint256 amount, string calldata reason) external;
    function botDepositNative(uint256 profit) external payable;
    function botDeposit(uint256 amount, uint256 profit) external;
    function updateBotManagedAssets(uint256 newManagedAssets) external;
    
    // Native KAIA functions
    function depositNative() external payable returns (uint256 shares);
    function withdrawNative(uint256 assets, address receiver) external returns (uint256 shares);
    
    // KIP-7 functions
    function deposit(uint256 assets, address receiver) external returns (uint256 shares);
    function mint(uint256 shares, address receiver) external returns (uint256 assets);
    function withdraw(uint256 assets, address receiver, address owner) external returns (uint256 shares);
    function redeem(uint256 shares, address receiver, address owner) external returns (uint256 assets);
    
    // Fee functions
    function collectManagementFee() external;
    function withdrawFees() external;
    
    // Admin functions
    function setBotAddress(address _bot) external;
    function setLiquidReservePercentage(uint256 _percentage) external;
    function setFees(uint256 _performanceFee, uint256 _managementFee) external;
    function setFeeRecipient(address _recipient) external;
    function setMinDeposit(uint256 _min) external;
    function setMaxTotalDeposits(uint256 _max) external;
    function pause() external;
    function unpause() external;
    
    // View functions
    function asset() external view returns (address);
    function isNative() external view returns (bool);
    function botAddress() external view returns (address);
    function liquidReservePercentage() external view returns (uint256);
    function performanceFee() external view returns (uint256);
    function managementFee() external view returns (uint256);
    function highWaterMark() external view returns (uint256);
    function botManagedAssets() external view returns (uint256);
    function accumulatedFees() external view returns (uint256);
    function totalAssets() external view returns (uint256);
    function liquidBalance() external view returns (uint256);
    function convertToShares(uint256 assets) external view returns (uint256);
    function convertToAssets(uint256 shares) external view returns (uint256);
    function previewDeposit(uint256 assets) external view returns (uint256);
    function previewMint(uint256 shares) external view returns (uint256);
    function previewWithdraw(uint256 assets) external view returns (uint256);
    function previewRedeem(uint256 shares) external view returns (uint256);
    function sharePrice() external view returns (uint256);
    function maxWithdraw(address owner) external view returns (uint256);
    function maxRedeem(address owner) external view returns (uint256);
}

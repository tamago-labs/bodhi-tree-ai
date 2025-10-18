// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import "@kaiachain/contracts/KIP/token/KIP7/KIP7.sol";
import "@kaiachain/contracts/access/Ownable.sol";
import "@kaiachain/contracts/security/ReentrancyGuard.sol";
import "@kaiachain/contracts/security/Pausable.sol";
import "@kaiachain/contracts/KIP/token/KIP7/IKIP7.sol";

/**
 * @title BodhiVault
 * @notice Vault for DeFi AI agent with bot-managed strategies
 * @dev Features:
 *  - Share-based vault similar to ERC-4626
 *  - Native KAIA and KIP-7 token support
 *  - Bot wallet can withdraw/deposit for off-chain strategy execution
 *  - Maintains liquid reserve for immediate user withdrawals
 *  - Performance and management fees based on Kommune model
 *  - High water mark for performance fees
 */
contract BodhiVault is KIP7, Ownable, ReentrancyGuard, Pausable {

    // ========================================================================
    // CONSTANTS
    // ========================================================================
    
    uint256 public constant BASIS_POINTS = 10000;
    uint256 public constant MAX_PERFORMANCE_FEE = 2000; // 20%
    uint256 public constant MAX_MANAGEMENT_FEE = 200;   // 2%
    uint256 public constant SECONDS_PER_YEAR = 365 days;
    
    // ========================================================================
    // STATE VARIABLES
    // ========================================================================
    
    /// @notice Underlying asset (address(0) for native KAIA)
    address public immutable asset;
    
    /// @notice Bot address authorized to withdraw/deposit for strategies
    address public botAddress;
    
    /// @notice Whether this vault uses native KAIA
    bool public immutable isNative;
    
    /// @notice Asset decimals
    uint8 public immutable assetDecimals;
    
    /// @notice Minimum liquid balance to maintain (percentage in basis points)
    uint256 public liquidReservePercentage; // e.g., 1000 = 10%
    
    /// @notice Fee recipient address
    address public feeRecipient;
    
    /// @notice Performance fee in basis points (% of profits)
    uint256 public performanceFee;
    
    /// @notice Management fee in basis points (% annually)
    uint256 public managementFee;
    
    /// @notice High water mark for performance fees
    uint256 public highWaterMark;
    
    /// @notice Last time management fee was collected
    uint256 public lastFeeCollection;
    
    /// @notice Total assets managed by bot (off-chain)
    uint256 public botManagedAssets;
    
    /// @notice Accumulated fees ready to collect
    uint256 public accumulatedFees;
    
    /// @notice Minimum deposit amount
    uint256 public minDeposit;
    
    /// @notice Maximum total deposits
    uint256 public maxTotalDeposits;
    
    // ========================================================================
    // EVENTS
    // ========================================================================
    
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
    
    // ========================================================================
    // ERRORS
    // ========================================================================
    
    error NotBot();
    error InvalidAddress();
    error ZeroAmount();
    error BelowMinDeposit();
    error ExceedsMaxDeposit();
    error InsufficientLiquidity();
    error InvalidFee();
    error InvalidPercentage();
    error InsufficientShares();
    error TransferFailed();
    
    // ========================================================================
    // MODIFIERS
    // ========================================================================
    
    modifier onlyBot() {
        if (msg.sender != botAddress && msg.sender != owner()) revert NotBot();
        _;
    }
    
    // ========================================================================
    // CONSTRUCTOR
    // ========================================================================
    
    constructor(
        address _asset,
        string memory _name,
        string memory _symbol,
        uint8 _assetDecimals,
        bool _isNative
    ) KIP7(_name, _symbol) {
        asset = _asset;
        isNative = _isNative;
        assetDecimals = _assetDecimals;
        botAddress = msg.sender;
        feeRecipient = msg.sender;
        
        liquidReservePercentage = 1000; // 10% default
        performanceFee = 1000; // 10%
        managementFee = 150; // 1.5%
        minDeposit = 10 * 10**_assetDecimals;
        maxTotalDeposits = 500_000 * 10**_assetDecimals;
        
        lastFeeCollection = block.timestamp;
        highWaterMark = 1e18; // Start at 1:1
    }
    
    // ========================================================================
    // USER DEPOSIT FUNCTIONS
    // ========================================================================
    
    /**
     * @notice Deposit native KAIA
     */
    function depositNative() external payable nonReentrant whenNotPaused returns (uint256 shares) {
        if (!isNative) revert InvalidAddress();
        if (msg.value == 0) revert ZeroAmount();
        if (msg.value < minDeposit) revert BelowMinDeposit();
        if (totalAssets() + msg.value > maxTotalDeposits) revert ExceedsMaxDeposit();
        
        shares = previewDeposit(msg.value);
        _mint(msg.sender, shares);
        
        emit Deposit(msg.sender, msg.sender, msg.value, shares);
        return shares;
    }
    
    /**
     * @notice Deposit KIP-7 tokens
     */
    function deposit(uint256 assets, address receiver) 
        external 
        nonReentrant 
        whenNotPaused 
        returns (uint256 shares) 
    {
        if (isNative) revert InvalidAddress();
        if (assets < minDeposit) revert BelowMinDeposit();
        if (totalAssets() + assets > maxTotalDeposits) revert ExceedsMaxDeposit();
        
        shares = previewDeposit(assets);
        
        // Use regular transferFrom (not safeTransferFrom)
        bool success = IKIP7(asset).transferFrom(msg.sender, address(this), assets);
        if (!success) revert TransferFailed();
        
        _mint(receiver, shares);
        
        emit Deposit(msg.sender, receiver, assets, shares);
        return shares;
    }
    
    /**
     * @notice Mint exact shares
     */
    function mint(uint256 shares, address receiver) 
        external 
        nonReentrant 
        whenNotPaused 
        returns (uint256 assets) 
    {
        if (isNative) revert InvalidAddress();
        
        assets = previewMint(shares);
        if (assets < minDeposit) revert BelowMinDeposit();
        if (totalAssets() + assets > maxTotalDeposits) revert ExceedsMaxDeposit();
        
        // Use regular transferFrom
        bool success = IKIP7(asset).transferFrom(msg.sender, address(this), assets);
        if (!success) revert TransferFailed();
        
        _mint(receiver, shares);
        
        emit Deposit(msg.sender, receiver, assets, shares);
        return assets;
    }
    
    // ========================================================================
    // USER WITHDRAWAL FUNCTIONS (IMMEDIATE)
    // ========================================================================
    
    /**
     * @notice Withdraw native KAIA immediately
     */
    function withdrawNative(uint256 assets, address receiver) 
        external 
        nonReentrant 
        returns (uint256 shares) 
    {
        if (!isNative) revert InvalidAddress();
        if (assets == 0) revert ZeroAmount();
        
        // Check liquid balance
        if (assets > address(this).balance) revert InsufficientLiquidity();
        
        shares = previewWithdraw(assets);
        if (balanceOf(msg.sender) < shares) revert InsufficientShares();
        
        _burn(msg.sender, shares);
        
        (bool success, ) = payable(receiver).call{value: assets}("");
        if (!success) revert TransferFailed();
        
        emit Withdraw(msg.sender, receiver, msg.sender, assets, shares);
        return shares;
    }
    
    /**
     * @notice Withdraw KIP-7 tokens immediately
     */
    function withdraw(uint256 assets, address receiver, address owner) 
        external 
        nonReentrant 
        returns (uint256 shares) 
    {
        if (isNative) revert InvalidAddress();
        
        // Check liquid balance
        uint256 liquidBalance = IKIP7(asset).balanceOf(address(this));
        if (assets > liquidBalance) revert InsufficientLiquidity();
        
        shares = previewWithdraw(assets);
        
        if (msg.sender != owner) {
            uint256 allowed = allowance(owner, msg.sender);
            if (allowed != type(uint256).max) {
                require(allowed >= shares, "Insufficient allowance");
                _approve(owner, msg.sender, allowed - shares);
            }
        }
        
        if (balanceOf(owner) < shares) revert InsufficientShares();
        
        _burn(owner, shares);
        
        // Use regular transfer
        bool success = IKIP7(asset).transfer(receiver, assets);
        if (!success) revert TransferFailed();
        
        emit Withdraw(msg.sender, receiver, owner, assets, shares);
        return shares;
    }
    
    /**
     * @notice Redeem shares for assets immediately
     */
    function redeem(uint256 shares, address receiver, address owner) 
        external 
        nonReentrant 
        returns (uint256 assets) 
    {
        if (isNative) revert InvalidAddress();
        
        assets = previewRedeem(shares);
        
        // Check liquid balance
        uint256 liquidBalance = IKIP7(asset).balanceOf(address(this));
        if (assets > liquidBalance) revert InsufficientLiquidity();
        
        if (msg.sender != owner) {
            uint256 allowed = allowance(owner, msg.sender);
            if (allowed != type(uint256).max) {
                require(allowed >= shares, "Insufficient allowance");
                _approve(owner, msg.sender, allowed - shares);
            }
        }
        
        if (balanceOf(owner) < shares) revert InsufficientShares();
        
        _burn(owner, shares);
        
        // Use regular transfer
        bool success = IKIP7(asset).transfer(receiver, assets);
        if (!success) revert TransferFailed();
        
        emit Withdraw(msg.sender, receiver, owner, assets, shares);
        return assets;
    }
    
    // ========================================================================
    // BOT FUNCTIONS
    // ========================================================================
    
    /**
     * @notice Bot withdraws assets for off-chain strategy execution
     */
    function botWithdraw(uint256 amount, string calldata reason) 
        external 
        onlyBot 
        nonReentrant 
    {
        if (amount == 0) revert ZeroAmount();
        
        // Ensure we maintain minimum liquid reserve
        uint256 minLiquid = (totalAssets() * liquidReservePercentage) / BASIS_POINTS;
        uint256 currentLiquid = isNative 
            ? address(this).balance 
            : IKIP7(asset).balanceOf(address(this));
        
        if (currentLiquid - amount < minLiquid) revert InsufficientLiquidity();
        
        botManagedAssets += amount;
        
        if (isNative) {
            (bool success, ) = payable(msg.sender).call{value: amount}("");
            if (!success) revert TransferFailed();
        } else {
            bool success = IKIP7(asset).transfer(msg.sender, amount);
            if (!success) revert TransferFailed();
        }
        
        emit BotWithdraw(msg.sender, amount, reason);
    }
    
    /**
     * @notice Bot deposits native KAIA back after strategy execution
     */
    function botDepositNative(uint256 profit) 
        external 
        payable 
        onlyBot 
        nonReentrant 
    {
        if (!isNative) revert InvalidAddress();
        if (msg.value == 0) revert ZeroAmount();
        
        uint256 oldTotal = totalAssets();
        botManagedAssets = botManagedAssets > msg.value ? botManagedAssets - msg.value : 0;
        
        // Collect performance fee if profit > 0
        if (profit > 0) {
            _collectPerformanceFee(profit);
        }
        
        emit BotDeposit(msg.sender, msg.value, profit);
        emit AssetsUpdated(oldTotal, totalAssets(), int256(profit));
    }
    
    /**
     * @notice Bot deposits KIP-7 tokens back after strategy execution
     */
    function botDeposit(uint256 amount, uint256 profit) 
        external 
        onlyBot 
        nonReentrant 
    {
        if (isNative) revert InvalidAddress();
        if (amount == 0) revert ZeroAmount();
        
        uint256 oldTotal = totalAssets();
        botManagedAssets = botManagedAssets > amount ? botManagedAssets - amount : 0;
        
        // Use regular transferFrom
        bool success = IKIP7(asset).transferFrom(msg.sender, address(this), amount);
        if (!success) revert TransferFailed();
        
        // Collect performance fee if profit > 0
        if (profit > 0) {
            _collectPerformanceFee(profit);
        }
        
        emit BotDeposit(msg.sender, amount, profit);
        emit AssetsUpdated(oldTotal, totalAssets(), int256(profit));
    }
    
    /**
     * @notice Bot updates managed assets value (for tracking)
     */
    function updateBotManagedAssets(uint256 newManagedAssets) 
        external 
        onlyBot 
    {
        botManagedAssets = newManagedAssets;
    }
    
    // ========================================================================
    // FEE COLLECTION
    // ========================================================================
    
    /**
     * @notice Collect management fee
     */
    function collectManagementFee() external {
        uint256 timeElapsed = block.timestamp - lastFeeCollection;
        if (timeElapsed == 0) return;
        
        uint256 feeAmount = (totalAssets() * managementFee * timeElapsed) 
            / (BASIS_POINTS * SECONDS_PER_YEAR);
        
        if (feeAmount > 0) {
            accumulatedFees += feeAmount;
            lastFeeCollection = block.timestamp;
            emit ManagementFeeCollected(feeAmount);
        }
    }
    
    /**
     * @notice Withdraw accumulated fees
     */
    function withdrawFees() external onlyOwner nonReentrant {
        uint256 amount = accumulatedFees;
        if (amount == 0) revert ZeroAmount();
        
        accumulatedFees = 0;
        
        if (isNative) {
            (bool success, ) = payable(feeRecipient).call{value: amount}("");
            if (!success) revert TransferFailed();
        } else {
            bool success = IKIP7(asset).transfer(feeRecipient, amount);
            if (!success) revert TransferFailed();
        }
    }
    
    // ========================================================================
    // ADMIN FUNCTIONS
    // ========================================================================
    
    function setBotAddress(address _bot) external onlyOwner {
        if (_bot == address(0)) revert InvalidAddress();
        emit BotAddressUpdated(botAddress, _bot);
        botAddress = _bot;
    }
    
    function setLiquidReservePercentage(uint256 _percentage) external onlyOwner {
        if (_percentage > BASIS_POINTS) revert InvalidPercentage();
        emit LiquidReserveUpdated(liquidReservePercentage, _percentage);
        liquidReservePercentage = _percentage;
    }
    
    function setFees(uint256 _performanceFee, uint256 _managementFee) external onlyOwner {
        if (_performanceFee > MAX_PERFORMANCE_FEE) revert InvalidFee();
        if (_managementFee > MAX_MANAGEMENT_FEE) revert InvalidFee();
        
        performanceFee = _performanceFee;
        managementFee = _managementFee;
        
        emit FeesUpdated(_performanceFee, _managementFee);
    }
    
    function setFeeRecipient(address _recipient) external onlyOwner {
        if (_recipient == address(0)) revert InvalidAddress();
        emit FeeRecipientUpdated(feeRecipient, _recipient);
        feeRecipient = _recipient;
    }
    
    function setMinDeposit(uint256 _min) external onlyOwner {
        minDeposit = _min;
    }
    
    function setMaxTotalDeposits(uint256 _max) external onlyOwner {
        maxTotalDeposits = _max;
    }
    
    function pause() external onlyOwner {
        _pause();
    }
    
    function unpause() external onlyOwner {
        _unpause();
    }
    
    // ========================================================================
    // VIEW FUNCTIONS
    // ========================================================================
    
    /**
     * @notice Total assets including bot-managed assets
     */
    function totalAssets() public view returns (uint256) {
        uint256 vaultBalance = isNative 
            ? address(this).balance 
            : IKIP7(asset).balanceOf(address(this));
        
        return vaultBalance + botManagedAssets - accumulatedFees;
    }
    
    /**
     * @notice Available liquid balance for immediate withdrawals
     */
    function liquidBalance() public view returns (uint256) {
        return isNative 
            ? address(this).balance 
            : IKIP7(asset).balanceOf(address(this));
    }
    
    /**
     * @notice Convert assets to shares
     */
    function convertToShares(uint256 assets) public view returns (uint256) {
        uint256 supply = totalSupply();
        return (supply == 0) ? assets : (assets * supply) / totalAssets();
    }
    
    /**
     * @notice Convert shares to assets
     */
    function convertToAssets(uint256 shares) public view returns (uint256) {
        uint256 supply = totalSupply();
        return (supply == 0) ? 0 : (shares * totalAssets()) / supply;
    }
    
    /**
     * @notice Preview deposit
     */
    function previewDeposit(uint256 assets) public view returns (uint256) {
        return convertToShares(assets);
    }
    
    /**
     * @notice Preview mint
     */
    function previewMint(uint256 shares) public view returns (uint256) {
        uint256 supply = totalSupply();
        return (supply == 0) ? shares : ((shares * totalAssets()) / supply) + 1;
    }
    
    /**
     * @notice Preview withdraw
     */
    function previewWithdraw(uint256 assets) public view returns (uint256) {
        uint256 supply = totalSupply();
        return (supply == 0) ? assets : ((assets * supply) / totalAssets()) + 1;
    }
    
    /**
     * @notice Preview redeem
     */
    function previewRedeem(uint256 shares) public view returns (uint256) {
        return convertToAssets(shares);
    }
    
    /**
     * @notice Current share price
     */
    function sharePrice() public view returns (uint256) {
        uint256 supply = totalSupply();
        if (supply == 0) return 1e18;
        return (totalAssets() * 1e18) / supply;
    }
    
    /**
     * @notice Maximum withdrawable amount respecting liquid reserve
     */
    function maxWithdraw(address owner) public view returns (uint256) {
        uint256 liquid = liquidBalance();
        uint256 ownerAssets = convertToAssets(balanceOf(owner));
        return liquid < ownerAssets ? liquid : ownerAssets;
    }
    
    /**
     * @notice Maximum redeemable shares respecting liquid reserve
     */
    function maxRedeem(address owner) public view returns (uint256) {
        uint256 liquid = liquidBalance();
        uint256 maxAssets = convertToAssets(balanceOf(owner));
        
        if (liquid >= maxAssets) {
            return balanceOf(owner);
        } else {
            return convertToShares(liquid);
        }
    }
    
    // ========================================================================
    // INTERNAL FUNCTIONS
    // ========================================================================
    
    function _collectPerformanceFee(uint256 profit) internal {
        uint256 currentPrice = sharePrice();
        
        // Only collect if above high water mark
        if (currentPrice > highWaterMark) {
            uint256 feeAmount = (profit * performanceFee) / BASIS_POINTS;
            accumulatedFees += feeAmount;
            highWaterMark = currentPrice;
            
            emit PerformanceFeeCollected(feeAmount, highWaterMark);
        }
    }
    
    // ========================================================================
    // RECEIVE FUNCTION
    // ========================================================================
    
    receive() external payable {
        require(isNative, "Native not supported");
        require(msg.sender == botAddress || msg.sender == owner(), "Unauthorized");
    }
}

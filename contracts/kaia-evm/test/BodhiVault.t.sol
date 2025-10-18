// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import "forge-std/Test.sol";
import "../src/BodhiVault.sol";
import "@kaiachain/contracts/KIP/token/KIP7/KIP7.sol";

contract MockKIP7 is KIP7 {
    constructor() KIP7("Mock USDT", "USDT") {}
    
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

contract BodhiVaultTest is Test {
    BodhiVault public vaultNative;
    BodhiVault public vaultToken;
    MockKIP7 public token;
    
    address public owner;
    address public bot;
    address public user1;
    address public user2;
    address public feeRecipient;
    
    function setUp() public {
        owner = address(this);
        bot = address(0x1);
        user1 = address(0x2);
        user2 = address(0x3);
        feeRecipient = address(0x4);
        
        // Deploy mock token
        token = new MockKIP7();
        
        // Deploy vaults
        vaultNative = new BodhiVault(
            address(0),
            "Bodhi KAIA Vault",
            "bKAIA",
            18,
            true
        );
        
        vaultToken = new BodhiVault(
            address(token),
            "Bodhi USDT Vault",
            "bUSDT",
            18,
            false
        );
        
        // Setup
        vaultNative.setBotAddress(bot);
        vaultToken.setBotAddress(bot);
        
        vaultNative.setFeeRecipient(feeRecipient);
        vaultToken.setFeeRecipient(feeRecipient);
        
        // Fund users
        vm.deal(user1, 100 ether);
        vm.deal(user2, 100 ether);
        vm.deal(bot, 100 ether);
        
        token.mint(user1, 1000 * 10**18);
        token.mint(user2, 1000 * 10**18);
        token.mint(bot, 10000 * 10**18);
    }
    
    function testDepositNative() public {
        vm.startPrank(user1);
        
        uint256 depositAmount = 10 ether;
        uint256 shares = vaultNative.depositNative{value: depositAmount}();
        
        assertEq(vaultNative.balanceOf(user1), shares);
        assertEq(vaultNative.totalAssets(), depositAmount);
        
        vm.stopPrank();
    }
    
    function testWithdrawNative() public {
        vm.startPrank(user1);
        
        uint256 depositAmount = 10 ether;
        vaultNative.depositNative{value: depositAmount}();
        
        uint256 balanceBefore = user1.balance;
        uint256 withdrawAmount = 5 ether;
        
        vaultNative.withdrawNative(withdrawAmount, user1);
        
        assertEq(user1.balance - balanceBefore, withdrawAmount);
        
        vm.stopPrank();
    }
    
    function testBotWithdrawNative() public {
        // User deposits
        vm.prank(user1);
        vaultNative.depositNative{value: 10 ether}();
        
        // Bot withdraws for strategy
        vm.startPrank(bot);
        
        uint256 withdrawAmount = 5 ether;
        vaultNative.botWithdraw(withdrawAmount, "Deploy to Aave");
        
        assertEq(vaultNative.botManagedAssets(), withdrawAmount);
        assertEq(bot.balance, 100 ether + withdrawAmount);
        
        vm.stopPrank();
    }
    
    function testBotDepositNativeWithProfit() public {
        // User deposits
        vm.prank(user1);
        vaultNative.depositNative{value: 10 ether}();
        
        // Bot withdraws
        vm.startPrank(bot);
        vaultNative.botWithdraw(5 ether, "Deploy strategy");
        
        // Bot deposits back with profit
        uint256 profit = 0.5 ether;
        vaultNative.botDepositNative{value: 5 ether + profit}(profit);
        
        assertGt(vaultNative.accumulatedFees(), 0);
        assertEq(vaultNative.botManagedAssets(), 0);
        
        vm.stopPrank();
    }
    
    function testLiquidReserve() public {
        vm.prank(user1);
        vaultNative.depositNative{value: 10 ether}();
        
        // Set liquid reserve to 20%
        vaultNative.setLiquidReservePercentage(2000);
        
        // Bot tries to withdraw too much
        vm.startPrank(bot);
        
        vm.expectRevert(BodhiVault.InsufficientLiquidity.selector);
        vaultNative.botWithdraw(9 ether, "Exceeds reserve");
        
        // Should work with correct amount
        vaultNative.botWithdraw(7 ether, "Within reserve");
        
        vm.stopPrank();
    }
    
    function testDepositToken() public {
        vm.startPrank(user1);
        
        uint256 depositAmount = 100 * 10**18;
        token.approve(address(vaultToken), depositAmount);
        
        uint256 shares = vaultToken.deposit(depositAmount, user1);
        
        assertEq(vaultToken.balanceOf(user1), shares);
        assertEq(vaultToken.totalAssets(), depositAmount);
        
        vm.stopPrank();
    }
    
    function testWithdrawToken() public {
        vm.startPrank(user1);
        
        uint256 depositAmount = 100 * 10**18;
        token.approve(address(vaultToken), depositAmount);
        vaultToken.deposit(depositAmount, user1);
        
        uint256 withdrawAmount = 50 * 10**18;
        uint256 balanceBefore = token.balanceOf(user1);
        
        vaultToken.withdraw(withdrawAmount, user1, user1);
        
        assertEq(token.balanceOf(user1) - balanceBefore, withdrawAmount);
        
        vm.stopPrank();
    }
    
    function testBotDepositToken() public {
        // User deposits
        vm.startPrank(user1);
        token.approve(address(vaultToken), 100 * 10**18);
        vaultToken.deposit(100 * 10**18, user1);
        vm.stopPrank();
        
        // Bot withdraws
        vm.startPrank(bot);
        vaultToken.botWithdraw(50 * 10**18, "Deploy strategy");
        
        // Bot deposits back with profit
        uint256 profit = 5 * 10**18;
        token.approve(address(vaultToken), 50 * 10**18 + profit);
        vaultToken.botDeposit(50 * 10**18 + profit, profit);
        
        assertGt(vaultToken.accumulatedFees(), 0);
        
        vm.stopPrank();
    }
    
    function testFeeCollection() public {
        // User deposits
        vm.startPrank(user1);
        token.approve(address(vaultToken), 100 * 10**18);
        vaultToken.deposit(100 * 10**18, user1);
        vm.stopPrank();
        
        // Advance time
        vm.warp(block.timestamp + 365 days);
        
        // Collect management fee
        vaultToken.collectManagementFee();
        
        assertGt(vaultToken.accumulatedFees(), 0);
    }
    
    function testSharePrice() public {
        vm.startPrank(user1);
        
        uint256 depositAmount = 100 * 10**18;
        token.approve(address(vaultToken), depositAmount);
        vaultToken.deposit(depositAmount, user1);
        
        uint256 price1 = vaultToken.sharePrice();
        assertEq(price1, 1e18); // Initial 1:1
        
        vm.stopPrank();
        
        // Bot generates profit
        vm.startPrank(bot);
        vaultToken.botWithdraw(50 * 10**18, "Strategy");
        
        token.approve(address(vaultToken), 60 * 10**18);
        vaultToken.botDeposit(60 * 10**18, 10 * 10**18);
        
        uint256 price2 = vaultToken.sharePrice();
        assertGt(price2, price1); // Price increased
        
        vm.stopPrank();
    }
    
    function testConvertFunctions() public {
        vm.startPrank(user1);
        
        token.approve(address(vaultToken), 100 * 10**18);
        vaultToken.deposit(100 * 10**18, user1);
        
        uint256 shares = vaultToken.balanceOf(user1);
        uint256 assets = vaultToken.convertToAssets(shares);
        
        assertEq(assets, 100 * 10**18);
        
        uint256 convertedShares = vaultToken.convertToShares(assets);
        assertEq(convertedShares, shares);
        
        vm.stopPrank();
    }
    
    function testMaxWithdraw() public {
        vm.startPrank(user1);
        
        uint256 depositAmount = 100 * 10**18;
        token.approve(address(vaultToken), depositAmount);
        vaultToken.deposit(depositAmount, user1);
        
        uint256 maxW = vaultToken.maxWithdraw(user1);
        assertEq(maxW, depositAmount);
        
        vm.stopPrank();
        
        // Bot withdraws most funds
        vm.prank(bot);
        vaultToken.botWithdraw(80 * 10**18, "Strategy");
        
        // Now user can only withdraw liquid balance
        uint256 maxW2 = vaultToken.maxWithdraw(user1);
        assertEq(maxW2, 20 * 10**18);
    }
}

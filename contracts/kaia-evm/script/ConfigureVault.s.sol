// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import "forge-std/Script.sol";
import "../src/BodhiVault.sol";

contract ConfigureVault is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address vaultAddress = vm.envAddress("VAULT_ADDRESS");
        address botAddress = vm.envAddress("BOT_ADDRESS");
        address feeRecipient = vm.envAddress("FEE_RECIPIENT");
        
        console.log("Configuring vault at:", vaultAddress);
        
        vm.startBroadcast(deployerPrivateKey);
        
        BodhiVault vault = BodhiVault(payable(vaultAddress));
        
        // Set bot address
        vault.setBotAddress(botAddress);
        console.log("Bot address set to:", botAddress);
        
        // Set fee recipient
        vault.setFeeRecipient(feeRecipient);
        console.log("Fee recipient set to:", feeRecipient);
        
        // Set liquid reserve (10%)
        vault.setLiquidReservePercentage(1000);
        console.log("Liquid reserve set to: 10%");
        
        // Set fees (10% performance, 1.5% management)
        vault.setFees(1000, 150);
        console.log("Fees set: 10% performance, 1.5% management");
        
        // Set deposit limits
        vault.setMinDeposit(10 * 10**18); // 10 KAIA/tokens
        vault.setMaxTotalDeposits(500_000 * 10**18); // 500k cap
        console.log("Deposit limits configured");
        
        vm.stopBroadcast();
        
        console.log("Configuration completed!");
    }
}

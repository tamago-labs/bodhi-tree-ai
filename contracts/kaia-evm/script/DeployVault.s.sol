// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import "forge-std/Script.sol";
import "../src/BodhiVault.sol";

contract DeployBodhiVault is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("Deploying from:", deployer);
        console.log("Balance:", deployer.balance);
        
        vm.startBroadcast(deployerPrivateKey);
        
        // Deploy Native KAIA Vault
        BodhiVault vaultNative = new BodhiVault(
            address(0),
            "Bodhi KAIA Vault",
            "bKAIA",
            18,
            true
        );
        
        console.log("Bodhi KAIA Vault deployed at:", address(vaultNative));
        
        // Optional: Deploy USDT Vault (if USDT address provided)
        address usdtAddress = vm.envOr("USDT_ADDRESS", address(0));
        
        if (usdtAddress != address(0)) {
            BodhiVault vaultUSDT = new BodhiVault(
                usdtAddress,
                "Bodhi USDT Vault",
                "bUSDT",
                18,
                false
            );
            
            console.log("Bodhi USDT Vault deployed at:", address(vaultUSDT));
        }
        
        vm.stopBroadcast();
        
        console.log("Deployment completed!");
    }
}

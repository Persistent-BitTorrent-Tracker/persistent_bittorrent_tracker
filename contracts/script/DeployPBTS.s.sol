// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/RepFactory.sol";

contract DeployPBTS is Script {
    function run() external {
        vm.startBroadcast();
        RepFactory factory = new RepFactory();
        // Deploy first tracker contract (no referrer)
        address firstTracker = factory.deployNewTracker(address(0));
        console.log("RepFactory:", address(factory));
        console.log("First ReputationTracker:", firstTracker);
        vm.stopBroadcast();
    }
}

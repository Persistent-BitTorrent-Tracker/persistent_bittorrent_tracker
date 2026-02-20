// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import {ReputationTracker} from "../src/ReputationTracker.sol";

contract DeployPBTS is Script {
    function run() external {
        vm.startBroadcast();
        ReputationTracker tracker = new ReputationTracker(address(0));
        console.log("ReputationTracker:", address(tracker));
        vm.stopBroadcast();
    }
}

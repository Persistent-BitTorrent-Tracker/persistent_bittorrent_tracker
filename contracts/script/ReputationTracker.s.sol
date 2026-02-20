// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {Script, console} from "forge-std/Script.sol";
import {ReputationTracker} from "../src/ReputationTracker.sol";

contract ReputationTrackerScript is Script {
    function run() public {
        vm.startBroadcast();

        ReputationTracker tracker = new ReputationTracker();
        console.log("ReputationTracker deployed at:", address(tracker));
        console.log("Owner:", tracker.owner());

        vm.stopBroadcast();
    }
}

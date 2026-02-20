// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ReputationTracker} from "./ReputationTracker.sol";

contract RepFactory {
    address public owner;
    mapping(address => bool) public isValidTracker; // for future TEE attestation

    event NewReputationTracker(address indexed newContract, address indexed referrer, address indexed newTracker);

    constructor() {
        owner = msg.sender;
    }

    function deployNewTracker(address _referrer) external returns (address) {
        // In full version: verify TEE attestation here
        // For MVP: only owner (or later backend signer) can call
        require(msg.sender == owner || isValidTracker[msg.sender], "Unauthorized");

        ReputationTracker newTracker = new ReputationTracker(_referrer);
        emit NewReputationTracker(address(newTracker), _referrer, msg.sender);
        return address(newTracker);
    }

    // Allow adding new tracker addresses after TEE attestation
    function addValidTracker(address tracker) external {
        require(msg.sender == owner, "Only owner");
        isValidTracker[tracker] = true;
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ReputationTracker} from "./ReputationTracker.sol";

/**
 * @title  RepFactory
 * @notice Deploys new ReputationTracker contracts and manages the registry of
 *         authorised TEE-backed tracker servers.
 *
 * TEE attestation design
 * ──────────────────────
 * In the full production deployment the backend server runs inside a Trusted
 * Execution Environment (TEE).  Before a tracker address is added to the
 * `isValidTracker` allowlist the factory owner is expected to verify an
 * off-chain attestation report (e.g. TLS-Notary or a remote-attestation quote)
 * that proves the binary running at that address is the canonical PBTS tracker.
 *
 * The `attestationHash` mapping stores the keccak256 of the attestation report
 * submitted at registration time so it can be audited on-chain.  An empty hash
 * means the tracker was added by the owner without a formal attestation (MVP
 * mode).
 */
contract RepFactory {
    address public owner;
    /// tracker address → is authorised
    mapping(address => bool) public isValidTracker;
    /// tracker address → keccak256 of TEE attestation report (empty = owner-added)
    mapping(address => bytes32) public attestationHash;

    event NewReputationTracker(
        address indexed newContract,
        address indexed referrer,
        address indexed newTracker
    );
    event TrackerAdded(address indexed tracker, bytes32 attestation);
    event TrackerRemoved(address indexed tracker);

    error Unauthorized();
    error InvalidReferrer();

    constructor() {
        owner = msg.sender;
    }

    // ── Deployment ─────────────────────────────────────────────────────────

    /**
     * @notice Deploy a new ReputationTracker.
     * @param _referrer Address of the previous tracker for single-hop
     *                  reputation delegation, or address(0) for a fresh start.
     */
    function deployNewTracker(address _referrer) external returns (address) {
        if (msg.sender != owner && !isValidTracker[msg.sender]) revert Unauthorized();

        // Guard: referrer must be a deployed contract (not an EOA or garbage).
        if (_referrer != address(0)) {
            uint256 codeSize;
            assembly { codeSize := extcodesize(_referrer) }
            if (codeSize == 0) revert InvalidReferrer();
        }

        ReputationTracker newTracker = new ReputationTracker(_referrer);
        // Immediately grant the calling backend wallet write access to the new
        // tracker so that register / updateReputation calls work without a
        // separate setTracker transaction.
        newTracker.setTracker(msg.sender);
        emit NewReputationTracker(address(newTracker), _referrer, msg.sender);
        return address(newTracker);
    }

    // ── Tracker registry ───────────────────────────────────────────────────

    /**
     * @notice Register a tracker address as authorised.
     * @param tracker     Address of the tracker server wallet.
     * @param attestation keccak256 of the TEE attestation report.  Pass
     *                    bytes32(0) for owner-managed (non-TEE) trackers.
     */
    function addValidTracker(address tracker, bytes32 attestation) external {
        if (msg.sender != owner) revert Unauthorized();
        isValidTracker[tracker] = true;
        attestationHash[tracker] = attestation;
        emit TrackerAdded(tracker, attestation);
    }

    /**
     * @notice Revoke a tracker's authorisation (e.g. after key compromise).
     */
    function removeValidTracker(address tracker) external {
        if (msg.sender != owner) revert Unauthorized();
        isValidTracker[tracker] = false;
        attestationHash[tracker] = bytes32(0);
        emit TrackerRemoved(tracker);
    }

    /**
     * @notice Transfer factory ownership.
     */
    function transferOwnership(address newOwner) external {
        if (msg.sender != owner) revert Unauthorized();
        owner = newOwner;
    }
}


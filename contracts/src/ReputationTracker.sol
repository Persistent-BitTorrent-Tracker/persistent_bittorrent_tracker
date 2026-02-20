// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

/**
 * @title ReputationTracker
 * @notice Persistent, on-chain reputation storage for the PBTS system.
 *
 * Only the tracker server (contract owner) can register users and update
 * reputation. Anyone can read reputation data — public transparency.
 *
 * New users receive an initial upload credit (1 GiB) so they can begin
 * downloading immediately without having to seed first.
 */
contract ReputationTracker {
    // ── Types ────────────────────────────────────────────────────────────

    struct UserReputation {
        address publicKey;
        uint256 uploadBytes;
        uint256 downloadBytes;
        uint256 registeredAt;
        bool exists;
    }

    // ── State ────────────────────────────────────────────────────────────

    address public owner;
    uint256 public constant INITIAL_UPLOAD_CREDIT = 1_073_741_824; // 1 GiB

    mapping(address => UserReputation) private users;
    address[] private registeredUsers;

    // ── Events ───────────────────────────────────────────────────────────

    event UserRegistered(address indexed user, uint256 timestamp);
    event ReputationUpdated(
        address indexed user,
        uint256 uploadDelta,
        uint256 downloadDelta,
        uint256 newUploadBytes,
        uint256 newDownloadBytes
    );
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    // ── Errors ───────────────────────────────────────────────────────────

    error NotOwner();
    error AlreadyRegistered();
    error NotRegistered();
    error ZeroAddress();

    // ── Modifiers ────────────────────────────────────────────────────────

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    // ── Constructor ──────────────────────────────────────────────────────

    constructor() {
        owner = msg.sender;
    }

    // ── Write functions ──────────────────────────────────────────────────

    /**
     * @notice Register a new user with an initial upload credit.
     * @param user The Ethereum address to register.
     * @return true on success.
     */
    function register(address user) external onlyOwner returns (bool) {
        if (user == address(0)) revert ZeroAddress();
        if (users[user].exists) revert AlreadyRegistered();

        users[user] = UserReputation({
            publicKey: user,
            uploadBytes: INITIAL_UPLOAD_CREDIT,
            downloadBytes: 0,
            registeredAt: block.timestamp,
            exists: true
        });

        registeredUsers.push(user);

        emit UserRegistered(user, block.timestamp);
        return true;
    }

    /**
     * @notice Update a user's upload and/or download counters.
     * @param user           The user whose reputation to update.
     * @param uploadDelta    Bytes to add to uploadBytes.
     * @param downloadDelta  Bytes to add to downloadBytes.
     */
    function updateReputation(
        address user,
        uint256 uploadDelta,
        uint256 downloadDelta
    ) external onlyOwner {
        if (!users[user].exists) revert NotRegistered();

        users[user].uploadBytes += uploadDelta;
        users[user].downloadBytes += downloadDelta;

        emit ReputationUpdated(
            user,
            uploadDelta,
            downloadDelta,
            users[user].uploadBytes,
            users[user].downloadBytes
        );
    }

    /**
     * @notice Transfer ownership of the contract.
     * @param newOwner The address of the new owner.
     */
    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert ZeroAddress();
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    // ── Read functions ───────────────────────────────────────────────────

    /**
     * @notice Check whether a user is registered.
     */
    function isRegistered(address user) external view returns (bool) {
        return users[user].exists;
    }

    /**
     * @notice Get the full reputation struct for a user.
     */
    function getReputation(address user) external view returns (UserReputation memory) {
        return users[user];
    }

    /**
     * @notice Get the upload/download ratio scaled by 1e18.
     * @dev Returns type(uint256).max when downloadBytes == 0 (infinite ratio).
     *      This matches the backend's expectation (formatRatio treats MaxUint256 as Infinity).
     */
    function getRatio(address user) external view returns (uint256) {
        UserReputation storage rep = users[user];
        if (!rep.exists) return 0;
        if (rep.downloadBytes == 0) return type(uint256).max;
        return (rep.uploadBytes * 1e18) / rep.downloadBytes;
    }

    /**
     * @notice Get the total number of registered users.
     */
    function getUserCount() external view returns (uint256) {
        return registeredUsers.length;
    }

    /**
     * @notice Get a registered user's address by index.
     */
    function getUserAtIndex(uint256 index) external view returns (address) {
        return registeredUsers[index];
    }
}

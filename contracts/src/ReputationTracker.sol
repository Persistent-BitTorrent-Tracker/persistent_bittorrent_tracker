// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract ReputationTracker {
    address public immutable OWNER;
    address public immutable REFERRER; // single-hop inheritance
    bytes32 public immutable IID;      // instance identifier set at deployment
    address public tracker; // current authorized tracker backend

    struct UserReputation {
        uint256 uploadBytes;
        uint256 downloadBytes;
        uint256 lastUpdated;
    }

    mapping(address => UserReputation) public users;

    uint256 public constant INITIAL_CREDIT = 1_073_741_824; // 1 GB

    event UserRegistered(address indexed user, uint256 timestamp);
    event ReputationUpdated(address indexed user, uint256 uploadDelta, uint256 downloadDelta);

    constructor(bytes32 _iid, address _referrer) {
        OWNER = msg.sender;
        IID = _iid;
        REFERRER = _referrer;
        tracker = msg.sender; // deployer becomes initial tracker
    }

    modifier onlyTracker() {
        _onlyTracker();
        _;
    }

    function _onlyTracker() internal view {
        require(msg.sender == tracker, "Only tracker");
    }

    function register(address userKey) external onlyTracker returns (bool) {
        if (users[userKey].lastUpdated > 0) revert("Already registered");
        users[userKey] = UserReputation({ uploadBytes: INITIAL_CREDIT, downloadBytes: 0, lastUpdated: block.timestamp });
        emit UserRegistered(userKey, block.timestamp);
        return true;
    }

    function updateReputation(address user, uint256 uploadDelta, uint256 downloadDelta) external onlyTracker {
        UserReputation storage rep = users[user];
        if (rep.lastUpdated == 0) {
            rep.uploadBytes = INITIAL_CREDIT;
        }
        rep.uploadBytes += uploadDelta;
        rep.downloadBytes += downloadDelta;
        rep.lastUpdated = block.timestamp;
        emit ReputationUpdated(user, uploadDelta, downloadDelta);
    }

    // getReputation with referrer delegation (single hop)
    function getReputation(address user) external view returns (UserReputation memory) {
        UserReputation memory rep = users[user];
        if (rep.lastUpdated > 0 || REFERRER == address(0)) {
            return rep;
        }
        return ReputationTracker(REFERRER).getReputation(user);
    }

    // getRatio with referrer delegation (single hop)
    function getRatio(address user) external view returns (uint256) {
        UserReputation memory rep = users[user];
        if (rep.lastUpdated > 0 || REFERRER == address(0)) {
            if (rep.downloadBytes == 0) return type(uint256).max;
            return (rep.uploadBytes * 1e18) / rep.downloadBytes;
        }
        return ReputationTracker(REFERRER).getRatio(user);
    }

    // Allow owner to change tracker address (for migration)
    function setTracker(address newTracker) external {
        require(msg.sender == OWNER, "Only owner");
        tracker = newTracker;
    }
}

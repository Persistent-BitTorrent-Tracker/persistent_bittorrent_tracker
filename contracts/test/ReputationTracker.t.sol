// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {Test} from "forge-std/Test.sol";
import {ReputationTracker} from "../src/ReputationTracker.sol";

contract ReputationTrackerTest is Test {
    ReputationTracker public tracker;

    address owner = address(this);
    address alice = makeAddr("alice");
    address bob = makeAddr("bob");
    address charlie = makeAddr("charlie");
    address attacker = makeAddr("attacker");

    uint256 constant ONE_GIB = 1_073_741_824;
    uint256 constant ONE_MIB = 1_048_576;

    event UserRegistered(address indexed user, uint256 timestamp);
    event ReputationUpdated(
        address indexed user,
        uint256 uploadDelta,
        uint256 downloadDelta,
        uint256 newUploadBytes,
        uint256 newDownloadBytes
    );
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    function setUp() public {
        tracker = new ReputationTracker();
    }

    // ─────────────────────────────────────────────────────────────────────
    // Registration
    // ─────────────────────────────────────────────────────────────────────

    function test_register_success() public {
        bool result = tracker.register(alice);
        assertTrue(result);
        assertTrue(tracker.isRegistered(alice));
    }

    function test_register_initial_credit() public {
        tracker.register(alice);

        ReputationTracker.UserReputation memory rep = tracker.getReputation(alice);
        assertEq(rep.uploadBytes, ONE_GIB);
        assertEq(rep.downloadBytes, 0);
        assertEq(rep.publicKey, alice);
        assertTrue(rep.exists);
        assertEq(rep.registeredAt, block.timestamp);
    }

    function test_register_emits_event() public {
        vm.expectEmit(true, false, false, true);
        emit UserRegistered(alice, block.timestamp);
        tracker.register(alice);
    }

    function test_register_increments_user_count() public {
        assertEq(tracker.getUserCount(), 0);
        tracker.register(alice);
        assertEq(tracker.getUserCount(), 1);
        tracker.register(bob);
        assertEq(tracker.getUserCount(), 2);
        assertEq(tracker.getUserAtIndex(0), alice);
        assertEq(tracker.getUserAtIndex(1), bob);
    }

    function test_register_reverts_duplicate() public {
        tracker.register(alice);
        vm.expectRevert(ReputationTracker.AlreadyRegistered.selector);
        tracker.register(alice);
    }

    function test_register_reverts_zero_address() public {
        vm.expectRevert(ReputationTracker.ZeroAddress.selector);
        tracker.register(address(0));
    }

    function test_register_reverts_non_owner() public {
        vm.prank(attacker);
        vm.expectRevert(ReputationTracker.NotOwner.selector);
        tracker.register(alice);
    }

    // ─────────────────────────────────────────────────────────────────────
    // Update reputation
    // ─────────────────────────────────────────────────────────────────────

    function test_updateReputation_upload_only() public {
        tracker.register(alice);
        tracker.updateReputation(alice, ONE_MIB, 0);

        ReputationTracker.UserReputation memory rep = tracker.getReputation(alice);
        assertEq(rep.uploadBytes, ONE_GIB + ONE_MIB);
        assertEq(rep.downloadBytes, 0);
    }

    function test_updateReputation_download_only() public {
        tracker.register(alice);
        tracker.updateReputation(alice, 0, ONE_MIB);

        ReputationTracker.UserReputation memory rep = tracker.getReputation(alice);
        assertEq(rep.uploadBytes, ONE_GIB);
        assertEq(rep.downloadBytes, ONE_MIB);
    }

    function test_updateReputation_both() public {
        tracker.register(alice);
        tracker.updateReputation(alice, 500, 300);

        ReputationTracker.UserReputation memory rep = tracker.getReputation(alice);
        assertEq(rep.uploadBytes, ONE_GIB + 500);
        assertEq(rep.downloadBytes, 300);
    }

    function test_updateReputation_cumulative() public {
        tracker.register(alice);
        tracker.updateReputation(alice, ONE_MIB, 0);
        tracker.updateReputation(alice, ONE_MIB, 0);
        tracker.updateReputation(alice, 0, ONE_MIB);

        ReputationTracker.UserReputation memory rep = tracker.getReputation(alice);
        assertEq(rep.uploadBytes, ONE_GIB + 2 * ONE_MIB);
        assertEq(rep.downloadBytes, ONE_MIB);
    }

    function test_updateReputation_emits_event() public {
        tracker.register(alice);

        vm.expectEmit(true, false, false, true);
        emit ReputationUpdated(alice, ONE_MIB, 0, ONE_GIB + ONE_MIB, 0);
        tracker.updateReputation(alice, ONE_MIB, 0);
    }

    function test_updateReputation_reverts_not_registered() public {
        vm.expectRevert(ReputationTracker.NotRegistered.selector);
        tracker.updateReputation(alice, ONE_MIB, 0);
    }

    function test_updateReputation_reverts_non_owner() public {
        tracker.register(alice);

        vm.prank(attacker);
        vm.expectRevert(ReputationTracker.NotOwner.selector);
        tracker.updateReputation(alice, ONE_MIB, 0);
    }

    // ─────────────────────────────────────────────────────────────────────
    // getRatio
    // ─────────────────────────────────────────────────────────────────────

    function test_getRatio_unregistered_returns_zero() public view {
        assertEq(tracker.getRatio(alice), 0);
    }

    function test_getRatio_no_downloads_returns_max() public {
        tracker.register(alice);
        // No downloads → ratio = MaxUint256 (infinite)
        assertEq(tracker.getRatio(alice), type(uint256).max);
    }

    function test_getRatio_equal_upload_download() public {
        tracker.register(alice);
        // Upload = 1 GiB (initial), Download = 1 GiB → ratio = 1.0
        tracker.updateReputation(alice, 0, ONE_GIB);

        uint256 ratio = tracker.getRatio(alice);
        // 1 GiB / 1 GiB * 1e18 = 1e18
        assertEq(ratio, 1e18);
    }

    function test_getRatio_two_to_one() public {
        tracker.register(alice);
        // Upload = 2 GiB, Download = 1 GiB → ratio = 2.0
        tracker.updateReputation(alice, ONE_GIB, ONE_GIB);

        uint256 ratio = tracker.getRatio(alice);
        // 2 GiB / 1 GiB * 1e18 = 2e18
        assertEq(ratio, 2e18);
    }

    function test_getRatio_half() public {
        tracker.register(alice);
        // Upload = 1 GiB (initial), Download = 2 GiB → ratio = 0.5
        tracker.updateReputation(alice, 0, 2 * ONE_GIB);

        uint256 ratio = tracker.getRatio(alice);
        // 1 GiB / 2 GiB * 1e18 = 0.5e18
        assertEq(ratio, 5e17);
    }

    function test_getRatio_below_minimum() public {
        tracker.register(alice);
        // Upload = 1 GiB (initial), Download = 10 GiB → ratio = 0.1
        tracker.updateReputation(alice, 0, 10 * ONE_GIB);

        uint256 ratio = tracker.getRatio(alice);
        // 1 GiB / 10 GiB * 1e18 = 0.1e18
        assertEq(ratio, 1e17);
    }

    // ─────────────────────────────────────────────────────────────────────
    // isRegistered
    // ─────────────────────────────────────────────────────────────────────

    function test_isRegistered_false_by_default() public view {
        assertFalse(tracker.isRegistered(alice));
    }

    function test_isRegistered_true_after_register() public {
        tracker.register(alice);
        assertTrue(tracker.isRegistered(alice));
    }

    // ─────────────────────────────────────────────────────────────────────
    // getReputation for unregistered user
    // ─────────────────────────────────────────────────────────────────────

    function test_getReputation_unregistered() public view {
        ReputationTracker.UserReputation memory rep = tracker.getReputation(alice);
        assertEq(rep.publicKey, address(0));
        assertEq(rep.uploadBytes, 0);
        assertEq(rep.downloadBytes, 0);
        assertEq(rep.registeredAt, 0);
        assertFalse(rep.exists);
    }

    // ─────────────────────────────────────────────────────────────────────
    // Ownership
    // ─────────────────────────────────────────────────────────────────────

    function test_owner_is_deployer() public view {
        assertEq(tracker.owner(), owner);
    }

    function test_transferOwnership() public {
        vm.expectEmit(true, true, false, false);
        emit OwnershipTransferred(owner, alice);
        tracker.transferOwnership(alice);

        assertEq(tracker.owner(), alice);
    }

    function test_transferOwnership_new_owner_can_write() public {
        tracker.transferOwnership(alice);

        vm.prank(alice);
        tracker.register(bob);
        assertTrue(tracker.isRegistered(bob));
    }

    function test_transferOwnership_old_owner_cannot_write() public {
        tracker.transferOwnership(alice);

        vm.expectRevert(ReputationTracker.NotOwner.selector);
        tracker.register(bob);
    }

    function test_transferOwnership_reverts_zero_address() public {
        vm.expectRevert(ReputationTracker.ZeroAddress.selector);
        tracker.transferOwnership(address(0));
    }

    function test_transferOwnership_reverts_non_owner() public {
        vm.prank(attacker);
        vm.expectRevert(ReputationTracker.NotOwner.selector);
        tracker.transferOwnership(attacker);
    }

    // ─────────────────────────────────────────────────────────────────────
    // Multi-user scenario (integration)
    // ─────────────────────────────────────────────────────────────────────

    function test_multi_user_transfer_scenario() public {
        // Register Alice and Bob
        tracker.register(alice);
        tracker.register(bob);

        // Simulate: Bob downloads 2 MiB from Alice
        // Alice uploads 2 MiB, Bob downloads 2 MiB
        tracker.updateReputation(alice, 2 * ONE_MIB, 0);
        tracker.updateReputation(bob, 0, 2 * ONE_MIB);

        // Alice: upload = 1 GiB + 2 MiB, download = 0 → ratio = max
        assertEq(tracker.getRatio(alice), type(uint256).max);

        // Bob: upload = 1 GiB, download = 2 MiB → ratio = 1 GiB / 2 MiB = 512
        uint256 bobRatio = tracker.getRatio(bob);
        // 1 GiB / 2 MiB = 1024 / 2 = 512, scaled by 1e18
        assertEq(bobRatio, 512e18);

        // Now Bob seeds 1 MiB to Charlie
        tracker.register(charlie);
        tracker.updateReputation(bob, ONE_MIB, 0);
        tracker.updateReputation(charlie, 0, ONE_MIB);

        // Bob: upload = 1 GiB + 1 MiB, download = 2 MiB
        ReputationTracker.UserReputation memory bobRep = tracker.getReputation(bob);
        assertEq(bobRep.uploadBytes, ONE_GIB + ONE_MIB);
        assertEq(bobRep.downloadBytes, 2 * ONE_MIB);
    }

    // ─────────────────────────────────────────────────────────────────────
    // Fuzz tests
    // ─────────────────────────────────────────────────────────────────────

    function testFuzz_updateReputation(uint128 upload, uint128 download) public {
        tracker.register(alice);
        tracker.updateReputation(alice, uint256(upload), uint256(download));

        ReputationTracker.UserReputation memory rep = tracker.getReputation(alice);
        assertEq(rep.uploadBytes, ONE_GIB + uint256(upload));
        assertEq(rep.downloadBytes, uint256(download));
    }

    function testFuzz_getRatio_consistency(uint128 extraUpload, uint128 download) public {
        vm.assume(download > 0);
        tracker.register(alice);
        tracker.updateReputation(alice, uint256(extraUpload), uint256(download));

        uint256 ratio = tracker.getRatio(alice);
        uint256 totalUpload = ONE_GIB + uint256(extraUpload);

        // ratio should equal (totalUpload * 1e18) / download
        uint256 expected = (totalUpload * 1e18) / uint256(download);
        assertEq(ratio, expected);
    }
}

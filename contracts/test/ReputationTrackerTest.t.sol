// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {ReputationTracker} from "../src/ReputationTracker.sol";
import {RepFactory} from "../src/RepFactory.sol";

contract ReputationTrackerTest is Test {
    RepFactory public factory;
    ReputationTracker public tracker1;
    ReputationTracker public tracker2;

    address public trackerBackend = address(this); // test contract acts as tracker
    address public user1 = address(0x1001);
    address public user2 = address(0x1002);

    function setUp() public {
        factory = new RepFactory();

        // Deploy first tracker (no referrer)
        address t1Addr = factory.deployNewTracker(address(0));
        tracker1 = ReputationTracker(t1Addr);

        // The factory is the owner of tracker1; set the test contract as the tracker
        vm.prank(address(factory));
        tracker1.setTracker(trackerBackend);
    }

    // ── Basic registration and reputation ─────────────────────────────────────

    function test_RegisterUser() public {
        bool ok = tracker1.register(user1);
        assertTrue(ok);

        ReputationTracker.UserReputation memory rep = tracker1.getReputation(user1);
        assertEq(rep.uploadBytes, tracker1.INITIAL_CREDIT());
        assertEq(rep.downloadBytes, 0);
        assertGt(rep.lastUpdated, 0);
    }

    function test_RegisterDuplicate_Reverts() public {
        tracker1.register(user1);
        vm.expectRevert("Already registered");
        tracker1.register(user1);
    }

    function test_UpdateReputation() public {
        tracker1.register(user1);
        tracker1.updateReputation(user1, 500_000, 200_000);

        ReputationTracker.UserReputation memory rep = tracker1.getReputation(user1);
        assertEq(rep.uploadBytes, tracker1.INITIAL_CREDIT() + 500_000);
        assertEq(rep.downloadBytes, 200_000);
    }

    function test_GetRatio_NoDownloads() public {
        tracker1.register(user1);
        uint256 ratio = tracker1.getRatio(user1);
        assertEq(ratio, type(uint256).max);
    }

    function test_GetRatio_WithDownloads() public {
        tracker1.register(user1);
        tracker1.updateReputation(user1, 2 * tracker1.INITIAL_CREDIT(), tracker1.INITIAL_CREDIT());

        uint256 ratio = tracker1.getRatio(user1);
        // uploadBytes = INITIAL_CREDIT + 2*INITIAL_CREDIT = 3*INITIAL_CREDIT
        // downloadBytes = INITIAL_CREDIT
        // ratio = 3 * 1e18
        assertEq(ratio, 3e18);
    }

    // ── OnlyTracker modifier ──────────────────────────────────────────────────

    function test_OnlyTracker_Register() public {
        vm.prank(address(0xdead));
        vm.expectRevert("Only tracker");
        tracker1.register(user1);
    }

    function test_SetTracker() public {
        address newBackend = address(0xBEEF);
        // owner of tracker1 is the factory
        vm.prank(address(factory));
        tracker1.setTracker(newBackend);
        assertEq(tracker1.tracker(), newBackend);
    }

    // ── Migration: reputation preserved across tracker contracts ─────────────

    function test_Migration_PreservesReputation() public {
        // Register user1 and build reputation on tracker1
        tracker1.register(user1);
        tracker1.updateReputation(user1, 500_000_000, 100_000_000);

        ReputationTracker.UserReputation memory rep1 = tracker1.getReputation(user1);
        uint256 expectedUpload = rep1.uploadBytes;
        uint256 expectedDownload = rep1.downloadBytes;

        // Deploy tracker2 with tracker1 as referrer
        address t2Addr = factory.deployNewTracker(address(tracker1));
        tracker2 = ReputationTracker(t2Addr);
        vm.prank(address(factory));
        tracker2.setTracker(trackerBackend);

        // user1 has no entry in tracker2 yet → delegates to tracker1
        ReputationTracker.UserReputation memory rep2 = tracker2.getReputation(user1);
        assertEq(rep2.uploadBytes, expectedUpload);
        assertEq(rep2.downloadBytes, expectedDownload);

        // Ratio is also delegated
        uint256 ratio2 = tracker2.getRatio(user1);
        uint256 ratio1 = tracker1.getRatio(user1);
        assertEq(ratio1, ratio2);
    }

    function test_Migration_NewUserNotInOld() public {
        // Deploy tracker2 with tracker1 as referrer
        address t2Addr = factory.deployNewTracker(address(tracker1));
        tracker2 = ReputationTracker(t2Addr);
        vm.prank(address(factory));
        tracker2.setTracker(trackerBackend);

        // user2 not in tracker1 or tracker2 → empty reputation
        ReputationTracker.UserReputation memory rep = tracker2.getReputation(user2);
        assertEq(rep.uploadBytes, 0);
        assertEq(rep.downloadBytes, 0);
        assertEq(rep.lastUpdated, 0);
    }

    function test_Migration_NewDataOnNewContract() public {
        // Register user1 on tracker1
        tracker1.register(user1);
        tracker1.updateReputation(user1, 200_000_000, 50_000_000);

        // Migrate: deploy tracker2 with tracker1 as referrer
        address t2Addr = factory.deployNewTracker(address(tracker1));
        tracker2 = ReputationTracker(t2Addr);
        vm.prank(address(factory));
        tracker2.setTracker(trackerBackend);

        // Register user1 on tracker2 (new activity after migration)
        tracker2.register(user1);
        tracker2.updateReputation(user1, 100_000_000, 10_000_000);

        // tracker2 has its own entry → does NOT delegate to tracker1
        ReputationTracker.UserReputation memory rep = tracker2.getReputation(user1);
        assertEq(rep.uploadBytes, tracker2.INITIAL_CREDIT() + 100_000_000);
        assertEq(rep.downloadBytes, 10_000_000);
    }

    // ── RepFactory ────────────────────────────────────────────────────────────

    function test_Factory_OnlyOwnerCanDeploy() public {
        vm.prank(address(0xdead));
        vm.expectRevert("Unauthorized");
        factory.deployNewTracker(address(0));
    }

    function test_Factory_AddValidTracker() public {
        address validTrackerAddr = address(0xABCD);
        factory.addValidTracker(validTrackerAddr);
        assertTrue(factory.isValidTracker(validTrackerAddr));

        // valid tracker can now deploy
        vm.prank(validTrackerAddr);
        address newT = factory.deployNewTracker(address(0));
        assertTrue(newT != address(0));
    }
}

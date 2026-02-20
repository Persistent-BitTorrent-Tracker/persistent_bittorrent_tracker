import { ethers } from "ethers";
import config from "../config/index";

// Minimal ABI — only the functions the server needs to call.
const REPUTATION_TRACKER_ABI = [
  // Write
  "function register(address userKey) external returns (bool)",
  "function updateReputation(address user, uint256 uploadDelta, uint256 downloadDelta) external",
  "function setTracker(address newTracker) external",

  // Read
  "function IID() external view returns (bytes32)",
  "function getReputation(address user) external view returns (tuple(uint256 uploadBytes, uint256 downloadBytes, uint256 lastUpdated))",
  "function getRatio(address user) external view returns (uint256)",
];

// Minimal ABI for the RepFactory contract.
const REP_FACTORY_ABI = [
  "function deployNewTracker(bytes32 _iid, address _referrer) external returns (address)",
  "function addValidTracker(address tracker, bytes32 attestation) external",
  "function removeValidTracker(address tracker) external",
  "function isValidTracker(address) external view returns (bool)",
  "function isDeployedTracker(address) external view returns (bool)",
  "function attestationHash(address) external view returns (bytes32)",
  "event NewReputationTracker(address indexed newContract, address indexed referrer, address indexed newTracker, bytes32 iid)",
  "event TrackerAdded(address indexed tracker, bytes32 attestation)",
  "event TrackerRemoved(address indexed tracker)",
];

let _provider: ethers.JsonRpcProvider | null = null;
let _signer: ethers.NonceManager | null = null;

function getProvider(): ethers.JsonRpcProvider {
  if (!_provider) {
    _provider = new ethers.JsonRpcProvider(config.rpcUrl);
  }
  return _provider;
}

function getSigner(): ethers.NonceManager {
  if (!_signer) {
    const wallet = new ethers.Wallet(config.trackerPrivateKey, getProvider());
    _signer = new ethers.NonceManager(wallet);
  }
  return _signer;
}

/**
 * Return a ReputationTracker contract instance connected to the tracker signer
 * (for writes) or to the plain provider (for reads, when `readonly` is true).
 * Always uses the current CURRENT_CONTRACT_ADDRESS from config.
 */
export function getContract(readonly = false): ethers.Contract {
  return new ethers.Contract(
    config.contractAddress,
    REPUTATION_TRACKER_ABI,
    readonly ? getProvider() : getSigner()
  );
}

/**
 * Return a RepFactory contract instance.
 */
export function getFactory(readonly = false): ethers.Contract {
  return new ethers.Contract(
    config.factoryAddress,
    REP_FACTORY_ABI,
    readonly ? getProvider() : getSigner()
  );
}

// -------------------------------------------------------------------------
// Typed wrappers
// -------------------------------------------------------------------------

export interface UserReputation {
  uploadBytes: bigint;
  downloadBytes: bigint;
  lastUpdated: bigint;
}

/** Register a new user on-chain. Throws if already registered or call fails. */
export async function registerUser(userAddress: string): Promise<ethers.TransactionReceipt> {
  const contract = getContract();
  const tx: ethers.TransactionResponse = await contract["register"](userAddress);
  const receipt = await tx.wait();
  if (!receipt) throw new Error("Transaction receipt is null");
  return receipt;
}

/**
 * Check whether a user is registered without spending gas.
 * A user is considered registered if their lastUpdated timestamp is non-zero.
 */
export async function isUserRegistered(userAddress: string): Promise<boolean> {
  const rep = await getContract(true)["getReputation"](userAddress);
  return (rep.lastUpdated as bigint) > 0n;
}

/** Read full reputation from the chain (delegates to referrer if needed). */
export async function getUserReputation(userAddress: string): Promise<UserReputation> {
  const rep = await getContract(true)["getReputation"](userAddress);
  return {
    uploadBytes: rep.uploadBytes as bigint,
    downloadBytes: rep.downloadBytes as bigint,
    lastUpdated: rep.lastUpdated as bigint,
  };
}

/**
 * Return the ratio scaled by 1e18 as returned by the contract.
 * Returns MaxUint256 when the user has never downloaded anything.
 */
export async function getUserRatio(userAddress: string): Promise<bigint> {
  return getContract(true)["getRatio"](userAddress);
}

/** Update upload and/or download counters for a single user. */
export async function updateReputation(
  userAddress: string,
  uploadDelta: bigint,
  downloadDelta: bigint
): Promise<ethers.TransactionReceipt> {
  const contract = getContract();
  const tx: ethers.TransactionResponse = await contract["updateReputation"](
    userAddress,
    uploadDelta,
    downloadDelta
  );
  const receipt = await tx.wait();
  if (!receipt) throw new Error("Transaction receipt is null");
  return receipt;
}

/**
 * Deploy a new ReputationTracker via the RepFactory, pointing its referrer at
 * the old contract so that reputation is preserved.  Returns the address of
 * the newly deployed tracker.
 *
 * @param iid         bytes32 instance identifier for the new tracker.
 * @param oldContract Address of the predecessor ReputationTracker.
 */
export async function migrateFrom(iid: string, oldContract: string): Promise<string> {
  const factory = getFactory();
  const tx: ethers.TransactionResponse = await factory["deployNewTracker"](iid, oldContract);
  const receipt = await tx.wait();
  if (!receipt) throw new Error("Migration transaction receipt is null");

  // Parse the NewReputationTracker event to retrieve the deployed address.
  const iface = new ethers.Interface(REP_FACTORY_ABI);
  for (const log of receipt.logs) {
    try {
      const parsed = iface.parseLog({ topics: log.topics as string[], data: log.data });
      if (parsed && parsed.name === "NewReputationTracker") {
        return parsed.args[0] as string;
      }
    } catch {
      // skip logs from other contracts
    }
  }
  throw new Error("NewReputationTracker event not found in migration receipt");
}

/**
 * Compute a human-readable ratio (regular JS number) from a contract ratio
 * value that is scaled by 1e18.  Returns Infinity when ratio === MaxUint256.
 */
export function formatRatio(ratioScaled: bigint): number {
  if (ratioScaled === ethers.MaxUint256) return Infinity;
  return Number(ratioScaled) / 1e18;
}

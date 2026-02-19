import { ethers } from "ethers";
import config from "../config/index";

// Minimal ABI — only the functions the server needs to call.
const REPUTATION_TRACKER_ABI = [
  // Write
  "function register(address user) external returns (bool)",
  "function updateReputation(address user, uint256 uploadDelta, uint256 downloadDelta) external",

  // Read
  "function isRegistered(address user) external view returns (bool)",
  "function getReputation(address user) external view returns (tuple(address publicKey, uint256 uploadBytes, uint256 downloadBytes, uint256 registeredAt, bool exists))",
  "function getRatio(address user) external view returns (uint256)",
];

let _provider: ethers.JsonRpcProvider | null = null;
let _signer: ethers.Wallet | null = null;

function getProvider(): ethers.JsonRpcProvider {
  if (!_provider) {
    _provider = new ethers.JsonRpcProvider(config.rpcUrl);
  }
  return _provider;
}

function getSigner(): ethers.Wallet {
  if (!_signer) {
    _signer = new ethers.Wallet(config.trackerPrivateKey, getProvider());
  }
  return _signer;
}

/**
 * Return a contract instance connected to the tracker signer (for writes)
 * or to the plain provider (for reads, when `readonly` is true).
 * A new instance is created each call to guarantee the correct signer/provider.
 */
export function getContract(readonly = false): ethers.Contract {
  return new ethers.Contract(
    config.contractAddress,
    REPUTATION_TRACKER_ABI,
    readonly ? getProvider() : getSigner()
  );
}

// -------------------------------------------------------------------------
// Typed wrappers
// -------------------------------------------------------------------------

export interface UserReputation {
  publicKey: string;
  uploadBytes: bigint;
  downloadBytes: bigint;
  registeredAt: bigint;
  exists: boolean;
}

/** Register a new user on-chain. Throws if already registered or call fails. */
export async function registerUser(userAddress: string): Promise<ethers.TransactionReceipt> {
  const contract = getContract();
  const tx: ethers.TransactionResponse = await contract["register"](userAddress);
  const receipt = await tx.wait();
  if (!receipt) throw new Error("Transaction receipt is null");
  return receipt;
}

/** Check whether a user is registered without spending gas. */
export async function isUserRegistered(userAddress: string): Promise<boolean> {
  return getContract(true)["isRegistered"](userAddress);
}

/** Read full reputation from the chain. */
export async function getUserReputation(userAddress: string): Promise<UserReputation> {
  const rep = await getContract(true)["getReputation"](userAddress);
  return {
    publicKey: rep.publicKey as string,
    uploadBytes: rep.uploadBytes as bigint,
    downloadBytes: rep.downloadBytes as bigint,
    registeredAt: rep.registeredAt as bigint,
    exists: rep.exists as boolean,
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
 * Compute a human-readable ratio (regular JS number) from a contract ratio
 * value that is scaled by 1e18.  Returns Infinity when ratio === MaxUint256.
 */
export function formatRatio(ratioScaled: bigint): number {
  if (ratioScaled === ethers.MaxUint256) return Infinity;
  return Number(ratioScaled) / 1e18;
}

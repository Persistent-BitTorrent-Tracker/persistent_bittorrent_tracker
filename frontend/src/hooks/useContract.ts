import { useState, useCallback } from 'react'
import { ethers } from 'ethers'

const REPUTATION_TRACKER_ABI = [
  'function getReputation(address user) external view returns (tuple(uint256 uploadBytes, uint256 downloadBytes, uint256 lastUpdated))',
  'function getRatio(address user) external view returns (uint256)',
  'function isRegistered(address user) external view returns (bool)',
]

const DEFAULT_RPC = import.meta.env.VITE_RPC_URL ?? 'https://api.avax-test.network/ext/bc/C/rpc'

export interface OnChainReputation {
  uploadBytes: bigint
  downloadBytes: bigint
  lastUpdated: bigint
  ratio: number
  isRegistered: boolean
}

export function useContract() {
  const [reputation, setReputation] = useState<OnChainReputation | null>(null)
  const [loading, setLoading] = useState(false)
  const [contractAddress, setContractAddress] = useState<string | null>(
    import.meta.env.VITE_CONTRACT_ADDRESS ?? null
  )

  const fetchReputation = useCallback(async (userAddress: string, contractAddr?: string) => {
    const addr = contractAddr ?? contractAddress
    if (!addr || !ethers.isAddress(addr)) return
    setLoading(true)
    try {
      const provider = new ethers.JsonRpcProvider(DEFAULT_RPC)
      const contract = new ethers.Contract(addr, REPUTATION_TRACKER_ABI, provider)
      const [rep, ratioScaled] = await Promise.all([
        contract['getReputation'](userAddress),
        contract['getRatio'](userAddress).catch(() => ethers.MaxUint256),
      ])
      const ratio = ratioScaled === ethers.MaxUint256 ? Infinity : Number(ratioScaled) / 1e18
      setReputation({
        uploadBytes: rep.uploadBytes as bigint,
        downloadBytes: rep.downloadBytes as bigint,
        lastUpdated: rep.lastUpdated as bigint,
        ratio: isFinite(ratio) ? ratio : 999,
        isRegistered: (rep.lastUpdated as bigint) > 0n,
      })
    } catch (err) {
      console.error('Failed to fetch reputation:', err)
    } finally {
      setLoading(false)
    }
  }, [contractAddress])

  return { reputation, loading, contractAddress, setContractAddress, fetchReputation }
}

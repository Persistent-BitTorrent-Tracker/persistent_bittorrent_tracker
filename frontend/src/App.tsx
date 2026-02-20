import { useState } from 'react'
import { WalletConnect } from '@/components/pbts/wallet-connect'
import { Dashboard } from '@/components/pbts/dashboard'

export default function App() {
  const [connectedAddress, setConnectedAddress] = useState<string | null>(null)

  if (!connectedAddress) {
    return <WalletConnect onConnect={setConnectedAddress} />
  }

  return (
    <Dashboard
      address={connectedAddress}
      onDisconnect={() => setConnectedAddress(null)}
    />
  )
}

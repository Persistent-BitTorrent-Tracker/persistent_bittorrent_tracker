import { useState } from 'react'
import { UserDashboard } from '@/components/pbts/user-dashboard'
import { TrackerDashboard } from '@/components/pbts/tracker-dashboard'
import { MarketplaceDashboard } from '@/components/pbts/marketplace-dashboard'
import { LandingPage } from '@/components/pbts/landing-page'

export type AppView = 'landing' | 'user' | 'tracker' | 'marketplace'

export default function App() {
  const [view, setView] = useState<AppView>('landing')

  if (view === 'user') {
    return <UserDashboard onBack={() => setView('landing')} />
  }

  if (view === 'tracker') {
    return <TrackerDashboard onBack={() => setView('landing')} />
  }

  if (view === 'marketplace') {
    return <MarketplaceDashboard onBack={() => setView('landing')} />
  }

  return <LandingPage onSelectRole={setView} />
}

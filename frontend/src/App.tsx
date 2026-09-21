import { useState } from 'react'
import Dashboard from './pages/Dashboard/Dashboard'
import Requests from './pages/Requests/Requests'

type AppPage = 'Dashboard' | 'Requests'

const getInitialPage = (): AppPage => {
  const page = new URLSearchParams(window.location.search).get('page')

  return page?.toLowerCase() === 'requests' ? 'Requests' : 'Dashboard'
}

function App() {
  const [activePage, setActivePage] = useState<AppPage>(getInitialPage)

  const handleNavigate = (item: string) => {
    if (item === 'Dashboard' || item === 'Requests') {
      setActivePage(item)
    }
  }

  if (activePage === 'Requests') {
    return <Requests onNavigate={handleNavigate} />
  }

  return <Dashboard onNavigate={handleNavigate} />
}

export default App

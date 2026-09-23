import { useState } from 'react'
import Assignments from './pages/Assignments/Assignments'
import Dashboard from './pages/Dashboard/Dashboard'
import Requests from './pages/Requests/Requests'

type AppPage = 'Dashboard' | 'Requests' | 'Assignments'

const getInitialPage = (): AppPage => {
  const page = new URLSearchParams(window.location.search).get('page')?.toLowerCase()

  if (page === 'requests') {
    return 'Requests'
  }

  if (page === 'assignments') {
    return 'Assignments'
  }

  return 'Dashboard'
}

function App() {
  const [activePage, setActivePage] = useState<AppPage>(getInitialPage)

  const handleNavigate = (item: string) => {
    if (item === 'Dashboard' || item === 'Requests' || item === 'Assignments') {
      setActivePage(item)
    }
  }

  if (activePage === 'Requests') {
    return <Requests onNavigate={handleNavigate} />
  }

  if (activePage === 'Assignments') {
    return <Assignments onNavigate={handleNavigate} />
  }

  return <Dashboard onNavigate={handleNavigate} />
}

export default App

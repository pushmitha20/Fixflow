import { useState } from 'react'
import Analytics from './pages/Analytics/Analytics'
import Assignments from './pages/Assignments/Assignments'
import Dashboard from './pages/Dashboard/Dashboard'
import Notifications from './pages/Notifications/Notifications'
import Requests from './pages/Requests/Requests'
import Users from './pages/Users/Users'

type AppPage = 'Dashboard' | 'Requests' | 'Assignments' | 'Notifications' | 'Analytics' | 'Users'

const getInitialPage = (): AppPage => {
  const page = new URLSearchParams(window.location.search).get('page')?.toLowerCase()

  if (page === 'requests') {
    return 'Requests'
  }

  if (page === 'assignments') {
    return 'Assignments'
  }

  if (page === 'notifications') {
    return 'Notifications'
  }

  if (page === 'analytics') {
    return 'Analytics'
  }

  if (page === 'users') {
    return 'Users'
  }

  return 'Dashboard'
}

function App() {
  const [activePage, setActivePage] = useState<AppPage>(getInitialPage)

  const handleNavigate = (item: string) => {
    if (
      item === 'Dashboard' ||
      item === 'Requests' ||
      item === 'Assignments' ||
      item === 'Notifications' ||
      item === 'Analytics' ||
      item === 'Users'
    ) {
      setActivePage(item)
    }
  }

  if (activePage === 'Requests') {
    return <Requests onNavigate={handleNavigate} />
  }

  if (activePage === 'Assignments') {
    return <Assignments onNavigate={handleNavigate} />
  }

  if (activePage === 'Notifications') {
    return <Notifications onNavigate={handleNavigate} />
  }

  if (activePage === 'Analytics') {
    return <Analytics onNavigate={handleNavigate} />
  }

  if (activePage === 'Users') {
    return <Users onNavigate={handleNavigate} />
  }

  return <Dashboard onNavigate={handleNavigate} />
}

export default App

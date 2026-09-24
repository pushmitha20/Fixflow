import { useState, type ReactNode } from 'react'
import Navigation from './Navigation'
import TopBar from './TopBar'

type AppLayoutProps = {
  title?: string
  subtitle?: string
  children?: ReactNode
  onNavigate?: (item: string) => void
}

export default function AppLayout({
  title = 'Dashboard',
  subtitle = 'Operations centre',
  children,
  onNavigate,
}: AppLayoutProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  const handleNavigate = (item: string) => {
    onNavigate?.(item)
    setMobileNavOpen(false)
  }

  return (
    <div className="ff-app-shell">
      <Navigation
        activeItem={title}
        mobileOpen={mobileNavOpen}
        onNavigate={handleNavigate}
      />

      <div className="ff-app-shell__content">
        <TopBar
          title={title}
          subtitle={subtitle}
          mobileNavOpen={mobileNavOpen}
          onToggleMobileNav={() => setMobileNavOpen((current) => !current)}
          onOpenNotifications={() => handleNavigate('Notifications')}
        />

        <main className="ff-shell-main">{children}</main>
      </div>
    </div>
  )
}

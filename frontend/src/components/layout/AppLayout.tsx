import { useState, type ReactNode } from 'react'
import Navigation from './Navigation'
import TopBar from './TopBar'

type AppLayoutProps = {
  title?: string
  subtitle?: string
  children?: ReactNode
}

export default function AppLayout({
  title = 'Dashboard',
  subtitle = 'Operations centre',
  children,
}: AppLayoutProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  return (
    <div className="ff-app-shell">
      <Navigation
        activeItem={title}
        mobileOpen={mobileNavOpen}
        onNavigate={() => setMobileNavOpen(false)}
      />

      <div className="ff-app-shell__content">
        <TopBar
          title={title}
          subtitle={subtitle}
          mobileNavOpen={mobileNavOpen}
          onToggleMobileNav={() => setMobileNavOpen((current) => !current)}
        />

        <main className="ff-shell-main">{children}</main>
      </div>
    </div>
  )
}

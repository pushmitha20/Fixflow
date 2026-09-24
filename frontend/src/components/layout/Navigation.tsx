import type { ReactNode } from 'react'

type NavItem = {
  id: string
  label: string
  icon: ReactNode
}

const navigationItems: NavItem[] = [
  { id: 'Dashboard', label: 'Dashboard', icon: '▣' },
  { id: 'Requests', label: 'Requests', icon: '▤' },
  { id: 'Assignments', label: 'Assignments', icon: '◫' },
  { id: 'Users', label: 'Users', icon: '◌' },
  { id: 'Notifications', label: 'Notifications', icon: '◍' },
  { id: 'Analytics', label: 'Analytics', icon: '◐' },
]

type NavigationProps = {
  activeItem?: string
  mobileOpen?: boolean
  onNavigate?: (item: string) => void
}

export default function Navigation({
  activeItem = 'Dashboard',
  mobileOpen = false,
  onNavigate,
}: NavigationProps) {
  return (
    <aside className={`ff-nav ${mobileOpen ? 'ff-nav--open' : ''}`} aria-label="Main navigation">
      <div className="ff-nav__branding" aria-label="FixFlow home">
        <span className="ff-nav__mark">F</span>
        <div>
          <strong>FixFlow</strong>
          <span>Operations</span>
        </div>
      </div>

      <nav className="ff-nav__list" aria-label="Primary navigation">
        {navigationItems.map((item) => {
          const isActive = item.id === activeItem

          return (
            <button
              key={item.id}
              type="button"
              className={`ff-nav__item ${isActive ? 'is-active' : ''}`}
              onClick={() => onNavigate?.(item.id)}
              aria-current={isActive ? 'page' : undefined}
            >
              <span className="ff-nav__icon" aria-hidden="true">
                {item.icon}
              </span>
              <span>{item.label}</span>
            </button>
          )
        })}
      </nav>

      <div className="ff-nav__profile" aria-label="Current user profile">
        <div className="ff-nav__avatar" aria-hidden="true">FL</div>
        <div>
          <strong>FixFlow Local Dev User</strong>
          <span>Local demo user</span>
        </div>
      </div>
    </aside>
  )
}

type TopBarProps = {
  title: string
  subtitle: string
  mobileNavOpen: boolean
  onToggleMobileNav: () => void
  onOpenNotifications: () => void
}

export default function TopBar({
  title,
  subtitle,
  mobileNavOpen,
  onToggleMobileNav,
  onOpenNotifications,
}: TopBarProps) {
  return (
    <header className="ff-topbar">
      <div className="ff-topbar__left">
        <button
          type="button"
          className="ff-topbar__menu"
          aria-label={mobileNavOpen ? 'Close navigation' : 'Open navigation'}
          aria-expanded={mobileNavOpen}
          onClick={onToggleMobileNav}
        >
          <span aria-hidden="true" />
          <span aria-hidden="true" />
          <span aria-hidden="true" />
        </button>

        <div className="ff-topbar__heading">
          {subtitle && <p className="eyebrow">{subtitle}</p>}
          <h2>{title}</h2>
        </div>
      </div>

      <div className="ff-topbar__actions">
        <button
          type="button"
          className="ff-topbar__action"
          aria-label="Notifications"
          title="Notifications"
          onClick={onOpenNotifications}
        >
          <svg
            className="ff-topbar__icon"
            viewBox="0 0 24 24"
            width="20"
            height="20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            focusable="false"
          >
            <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
        </button>
      </div>
    </header>
  )
}

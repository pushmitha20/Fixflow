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
          <p className="eyebrow">{subtitle}</p>
          <h2>{title}</h2>
        </div>
      </div>

      <div className="ff-topbar__actions">
        <button
          type="button"
          className="ff-topbar__action"
          aria-label="View notifications"
          onClick={onOpenNotifications}
        >
          <span aria-hidden="true">◔</span>
        </button>
      </div>
    </header>
  )
}

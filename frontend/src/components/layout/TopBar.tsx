type TopBarProps = {
  title: string
  subtitle: string
  mobileNavOpen: boolean
  onToggleMobileNav: () => void
}

export default function TopBar({
  title,
  subtitle,
  mobileNavOpen,
  onToggleMobileNav,
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
        <button type="button" className="ff-topbar__search" aria-label="Search records">
          <span aria-hidden="true">⌕</span>
          <span>Search</span>
        </button>

        <button
          type="button"
          className="ff-topbar__action"
          aria-label="Notifications"
        >
          <span aria-hidden="true">◔</span>
          <span className="ff-topbar__badge" aria-hidden="true" />
        </button>

        <button type="button" className="ff-topbar__profile" aria-label="Open profile menu">
          <span className="ff-topbar__avatar">AM</span>
          <span className="ff-topbar__user">Alex Morgan</span>
        </button>
      </div>
    </header>
  )
}

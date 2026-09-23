import { useEffect, useMemo, useState } from 'react'
import AppLayout from '../../components/layout/AppLayout'
import MotionButton from '../../components/MotionButton'
import Reveal from '../../components/Reveal'
import { notificationService } from '../../services/notificationService'
import { requestService } from '../../services/requestService'
import { userService } from '../../services/userService'
import type { MaintenanceRequest, RequestStatus, SystemNotification, User } from '../../types/api'

type NotificationsProps = {
  onNavigate?: (item: string) => void
}

type NotificationRow = {
  notification: SystemNotification
  requestId: number | null
  request?: MaintenanceRequest
  recipient?: User
  requestsLoaded: boolean
}

type NotificationData = {
  notifications: SystemNotification[]
  requests: MaintenanceRequest[]
  users: User[]
  unavailableSources: string[]
}

type ReadFilter = 'ALL' | 'UNREAD' | 'READ'

const LOAD_ERROR = 'Notifications could not be loaded. Check the gateway connection and try again.'

// The notification contract has no request_id. The Notification Service writes this exact
// message for assignment events, so only a full match is treated as a request reference.
const ASSIGNMENT_MESSAGE = /^Maintenance request #(\d+) has been assigned to a technician\.$/

const requestStatusLabels: Record<RequestStatus, string> = {
  OPEN: 'Open',
  IN_PROGRESS: 'In Progress',
  RESOLVED: 'Resolved',
  CLOSED: 'Closed',
}

const readFilterLabels: Record<ReadFilter, string> = {
  ALL: 'All',
  UNREAD: 'Unread',
  READ: 'Read',
}

// Notifications are the source of truth; request and user data only enrich rows,
// so a failure there degrades the view instead of hiding real notifications.
const fetchNotificationData = async (): Promise<NotificationData> => {
  const [notificationResult, requestResult, userResult] = await Promise.allSettled([
    notificationService.getNotifications(),
    requestService.getRequests(),
    userService.getUsers(),
  ])

  if (notificationResult.status === 'rejected') {
    throw notificationResult.reason
  }

  const unavailableSources: string[] = []

  if (requestResult.status === 'rejected') {
    unavailableSources.push('request details')
  }

  if (userResult.status === 'rejected') {
    unavailableSources.push('recipient names')
  }

  return {
    notifications: notificationResult.value,
    requests: requestResult.status === 'fulfilled' ? requestResult.value : [],
    users: userResult.status === 'fulfilled' ? userResult.value : [],
    unavailableSources,
  }
}

// created_at carries no timezone offset, so it is shown as the recorded wall-clock time.
const parseRecordedTime = (value: string) => new Date(value)

const formatDay = (value: string) => {
  const date = parseRecordedTime(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}

const formatTime = (value: string) => {
  const date = parseRecordedTime(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat(undefined, { timeStyle: 'short' }).format(date)
}

const formatTypeLabel = (type: string) =>
  type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase())

const typeClassName = (type: string) =>
  `ff-status ${type === 'ASSIGNMENT' ? 'ff-status--assigned' : 'ff-status--open'}`

const recipientLabel = ({ notification, recipient }: NotificationRow) =>
  recipient ? `${recipient.name} (#${recipient.id})` : `User #${notification.user_id}`

export default function Notifications({ onNavigate }: NotificationsProps) {
  const [data, setData] = useState<NotificationData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState('ALL')
  const [readFilter, setReadFilter] = useState<ReadFilter>('ALL')

  useEffect(() => {
    let isActive = true

    fetchNotificationData()
      .then((result) => {
        if (isActive) {
          setData(result)
        }
      })
      .catch(() => {
        if (isActive) {
          setError(LOAD_ERROR)
        }
      })
      .finally(() => {
        if (isActive) {
          setIsLoading(false)
        }
      })

    return () => {
      isActive = false
    }
  }, [])

  const retryLoad = async () => {
    setIsLoading(true)
    setError(null)

    try {
      setData(await fetchNotificationData())
    } catch {
      setError(LOAD_ERROR)
    } finally {
      setIsLoading(false)
    }
  }

  const rows = useMemo<NotificationRow[]>(() => {
    if (!data) {
      return []
    }

    const requestsById = new Map(data.requests.map((request) => [request.id, request]))
    const usersById = new Map(data.users.map((user) => [user.id, user]))
    const requestsLoaded = !data.unavailableSources.includes('request details')

    return data.notifications.map((notification) => {
      const match = ASSIGNMENT_MESSAGE.exec(notification.message)
      const requestId = match ? Number(match[1]) : null

      return {
        notification,
        requestId,
        request: requestId === null ? undefined : requestsById.get(requestId),
        recipient: usersById.get(notification.user_id),
        requestsLoaded,
      }
    })
  }, [data])

  const typeCounts = useMemo(() => {
    const counts = new Map<string, number>()

    rows.forEach(({ notification }) => {
      counts.set(notification.type, (counts.get(notification.type) ?? 0) + 1)
    })

    return counts
  }, [rows])

  const unreadCount = rows.filter(({ notification }) => !notification.is_read).length
  const readCount = rows.length - unreadCount
  const showTypeFilter = typeCounts.size > 1
  const showReadFilter = unreadCount > 0 && readCount > 0

  const filteredRows = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase().replace(/^#/, '')

    return rows.filter((row) => {
      const { notification, requestId, request, recipient } = row

      if (typeFilter !== 'ALL' && notification.type !== typeFilter) {
        return false
      }

      if (readFilter === 'UNREAD' && notification.is_read) {
        return false
      }

      if (readFilter === 'READ' && !notification.is_read) {
        return false
      }

      if (!normalizedSearch) {
        return true
      }

      return [
        String(notification.id),
        String(notification.user_id),
        requestId === null ? undefined : String(requestId),
        notification.message,
        request?.title,
        request?.location,
        recipient?.name,
      ].some((value) => value?.toLowerCase().includes(normalizedSearch))
    })
  }, [rows, searchTerm, typeFilter, readFilter])

  const groupedRows = useMemo(() => {
    const groups: { day: string; rows: NotificationRow[] }[] = []

    filteredRows.forEach((row) => {
      const day = formatDay(row.notification.created_at)
      const lastGroup = groups[groups.length - 1]

      if (lastGroup?.day === day) {
        lastGroup.rows.push(row)
      } else {
        groups.push({ day, rows: [row] })
      }
    })

    return groups
  }, [filteredRows])

  const totalCount = rows.length
  const hasActiveFilters = searchTerm.trim().length > 0 || typeFilter !== 'ALL' || readFilter !== 'ALL'

  const resultLabel = hasActiveFilters
    ? `${filteredRows.length} of ${totalCount} notifications`
    : `${totalCount} ${totalCount === 1 ? 'notification' : 'notifications'} · ${unreadCount} unread`

  const clearFilters = () => {
    setSearchTerm('')
    setTypeFilter('ALL')
    setReadFilter('ALL')
  }

  return (
    <AppLayout title="Notifications" subtitle="System activity" onNavigate={onNavigate}>
      <div className="ff-requests ff-notifications">
        <Reveal as="header" className="ff-requests__intro" delay={40}>
          <div>
            <p className="label">System activity</p>
            <h1>What the platform has told people, and when.</h1>
          </div>
        </Reveal>

        <Reveal className="ff-requests__workspace" delay={80}>
          <section className="ff-requests__toolbar" aria-label="Notification filters">
            <div className="ff-requests__search">
              <label htmlFor="notification-search">Search notifications</label>
              <input
                id="notification-search"
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Message, request, recipient, or ID"
              />
            </div>

            {showTypeFilter ? (
              <div className="ff-filter-group" role="group" aria-labelledby="notification-type-filter">
                <span id="notification-type-filter">Type</span>
                <div className="ff-filter-group__options">
                  {['ALL', ...typeCounts.keys()].map((type) => (
                    <button
                      key={type}
                      type="button"
                      className={typeFilter === type ? 'is-active' : ''}
                      onClick={() => setTypeFilter(type)}
                      aria-pressed={typeFilter === type}
                    >
                      {type === 'ALL' ? 'All' : `${formatTypeLabel(type)} · ${typeCounts.get(type)}`}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {showReadFilter ? (
              <div className="ff-filter-group" role="group" aria-labelledby="notification-read-filter">
                <span id="notification-read-filter">Read state</span>
                <div className="ff-filter-group__options">
                  {(['ALL', 'UNREAD', 'READ'] as ReadFilter[]).map((option) => (
                    <button
                      key={option}
                      type="button"
                      className={readFilter === option ? 'is-active' : ''}
                      onClick={() => setReadFilter(option)}
                      aria-pressed={readFilter === option}
                    >
                      {readFilterLabels[option]}
                      {option === 'UNREAD' ? ` · ${unreadCount}` : option === 'READ' ? ` · ${readCount}` : ''}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </section>

          <section className="ff-requests__list" aria-labelledby="notifications-list-heading">
            <div className="ff-requests__list-head">
              <div>
                <p className="label">Activity feed</p>
                <h2 id="notifications-list-heading">Notifications</h2>
              </div>
              <span aria-live="polite">{isLoading ? 'Loading notifications' : error ? '' : resultLabel}</span>
            </div>

            {!isLoading && !error && data && data.unavailableSources.length > 0 ? (
              <p className="ff-notification-notice" role="status">
                Showing notification records only — {data.unavailableSources.join(' and ')} could not be
                loaded.
              </p>
            ) : null}

            {isLoading ? <NotificationsLoading /> : null}

            {!isLoading && error ? (
              <div className="ff-requests-state" role="alert">
                <p className="label">Connection issue</p>
                <h3>Unable to load notifications</h3>
                <p>{error}</p>
                <MotionButton onClick={retryLoad}>Retry</MotionButton>
              </div>
            ) : null}

            {!isLoading && !error && totalCount === 0 ? (
              <div className="ff-requests-state">
                <p className="label">No notifications</p>
                <h3>No system activity yet</h3>
                <p>Notifications are created automatically when maintenance requests are assigned.</p>
              </div>
            ) : null}

            {!isLoading && !error && totalCount > 0 && filteredRows.length === 0 ? (
              <div className="ff-requests-state">
                <p className="label">No matches</p>
                <h3>No notifications match your current filters.</h3>
                <p>Adjust the search or filters to widen the view.</p>
                <MotionButton onClick={clearFilters}>Clear filters</MotionButton>
              </div>
            ) : null}

            {!isLoading && !error && groupedRows.length > 0 ? (
              <div className="ff-notification-feed">
                {groupedRows.map((group) => (
                  <div key={group.day} className="ff-notification-day">
                    <h3 className="ff-notification-day__heading">{group.day}</h3>
                    <ol className="ff-notification-list">
                      {group.rows.map((row) => (
                        <NotificationItem key={row.notification.id} row={row} />
                      ))}
                    </ol>
                  </div>
                ))}
              </div>
            ) : null}
          </section>
        </Reveal>
      </div>
    </AppLayout>
  )
}

function NotificationItem({ row }: { row: NotificationRow }) {
  const { notification, requestId, request, requestsLoaded } = row

  return (
    <li className={`ff-notification-item ${notification.is_read ? '' : 'is-unread'}`}>
      <time className="ff-notification-item__time" dateTime={notification.created_at}>
        {formatTime(notification.created_at)}
      </time>

      <div className="ff-notification-item__body">
        <p className="ff-notification-item__message">{notification.message}</p>

        <dl className="ff-notification-item__meta">
          {requestId !== null ? (
            <div>
              <dt>Request</dt>
              <dd>
                #{requestId}
                {request
                  ? ` · ${request.title} · ${request.location} · ${requestStatusLabels[request.status]}`
                  : requestsLoaded
                    ? ' · not in current requests'
                    : ' · details unavailable'}
              </dd>
            </div>
          ) : null}
          <div>
            <dt>Recipient</dt>
            <dd>{recipientLabel(row)}</dd>
          </div>
        </dl>
      </div>

      <div className="ff-notification-item__aside">
        <span className="ff-notification-item__id">#{notification.id}</span>
        <span className={typeClassName(notification.type)}>{formatTypeLabel(notification.type)}</span>
        <span className="ff-notification-item__read">{notification.is_read ? 'Read' : 'Unread'}</span>
      </div>
    </li>
  )
}

function NotificationsLoading() {
  return (
    <div className="ff-request-loading" aria-hidden="true">
      {Array.from({ length: 5 }, (_, index) => (
        <div className="ff-notification-skeleton" key={index}>
          <span />
          <span />
          <span />
        </div>
      ))}
    </div>
  )
}

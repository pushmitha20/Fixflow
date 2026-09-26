import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'

export type FilterSelectOption<TValue extends string> = {
  label: string
  value: TValue
}

type FilterSelectProps<TValue extends string> = {
  label: string
  value: TValue
  options: Array<FilterSelectOption<TValue>>
  onChange: (value: TValue) => void
  className?: string
  disabled?: boolean
  invalid?: boolean
  describedBy?: string
}

type MenuPlacement = {
  side: 'bottom' | 'top'
  maxHeight?: number
}

const MENU_GAP = 6
const MENU_MAX_HEIGHT = 260
const MENU_MIN_HEIGHT = 120

const isClippingElement = (element: HTMLElement) => {
  const { overflowY } = window.getComputedStyle(element)
  return overflowY !== 'visible'
}

// Visible vertical bounds for the menu: the viewport, narrowed by any
// scrolling/clipping ancestor (e.g. a modal body).
const getClippingBounds = (element: HTMLElement) => {
  let top = 0
  let bottom = window.innerHeight
  let ancestor = element.parentElement

  while (ancestor && ancestor !== document.body) {
    if (isClippingElement(ancestor)) {
      const rect = ancestor.getBoundingClientRect()
      top = Math.max(top, rect.top)
      bottom = Math.min(bottom, rect.bottom)
    }
    ancestor = ancestor.parentElement
  }

  return { top, bottom }
}

// Listbox-pattern dropdown shared by filter toolbars and forms: a trigger button
// that opens a themed option menu, replacing the browser-rendered native <select> popup.
export default function FilterSelect<TValue extends string>({
  label,
  value,
  options,
  onChange,
  className = 'ff-filter-group',
  disabled = false,
  invalid = false,
  describedBy,
}: FilterSelectProps<TValue>) {
  const id = useId()
  const labelId = `${id}-label`
  const triggerId = `${id}-trigger`
  const listboxId = `${id}-listbox`
  const optionId = (index: number) => `${id}-option-${index}`

  const rootRef = useRef<HTMLDivElement | null>(null)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const listboxRef = useRef<HTMLUListElement | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const [placement, setPlacement] = useState<MenuPlacement>({ side: 'bottom' })

  const selectedIndex = Math.max(
    options.findIndex((option) => option.value === value),
    0,
  )
  const selectedOption = options[selectedIndex]

  const openMenu = (index = selectedIndex) => {
    setActiveIndex(index)
    setPlacement({ side: 'bottom' })
    setIsOpen(true)
  }

  const closeMenu = (restoreFocus: boolean) => {
    setIsOpen(false)

    if (restoreFocus) {
      triggerRef.current?.focus()
    }
  }

  const selectOption = (index: number) => {
    const option = options[index]

    if (option && option.value !== value) {
      onChange(option.value)
    }

    closeMenu(true)
  }

  // Open downward when the menu fits, otherwise flip above the trigger, so it
  // is never cut off by a scrolling container such as a modal body.
  useLayoutEffect(() => {
    const root = rootRef.current
    const listbox = listboxRef.current

    if (!isOpen || !root || !listbox) {
      return
    }

    const triggerRect = root.getBoundingClientRect()
    const bounds = getClippingBounds(root)
    const spaceBelow = bounds.bottom - triggerRect.bottom - MENU_GAP
    const spaceAbove = triggerRect.top - bounds.top - MENU_GAP
    const menuHeight = Math.min(listbox.scrollHeight, MENU_MAX_HEIGHT)

    if (menuHeight <= spaceBelow) {
      return
    }

    const side = spaceAbove > spaceBelow ? 'top' : 'bottom'
    const available = side === 'top' ? spaceAbove : spaceBelow

    setPlacement({
      side,
      maxHeight: available < menuHeight ? Math.max(available, MENU_MIN_HEIGHT) : undefined,
    })
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) {
      return undefined
    }

    listboxRef.current?.focus({ preventScroll: true })

    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)

    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) {
      return
    }

    // Scroll only the menu itself; scrollIntoView would also scroll parent containers.
    const listbox = listboxRef.current
    const option = listbox?.children[activeIndex] as HTMLElement | undefined

    if (!listbox || !option) {
      return
    }

    if (option.offsetTop < listbox.scrollTop) {
      listbox.scrollTop = option.offsetTop
    } else if (option.offsetTop + option.offsetHeight > listbox.scrollTop + listbox.clientHeight) {
      listbox.scrollTop = option.offsetTop + option.offsetHeight - listbox.clientHeight
    }
  }, [activeIndex, isOpen, placement])

  const handleTriggerKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    switch (event.key) {
      case 'Enter':
      case ' ':
      case 'ArrowDown':
      case 'ArrowUp':
        event.preventDefault()
        openMenu()
        break
      default:
        break
    }
  }

  const handleListboxKeyDown = (event: KeyboardEvent<HTMLUListElement>) => {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        setActiveIndex((current) => Math.min(current + 1, options.length - 1))
        break
      case 'ArrowUp':
        event.preventDefault()
        setActiveIndex((current) => Math.max(current - 1, 0))
        break
      case 'Home':
        event.preventDefault()
        setActiveIndex(0)
        break
      case 'End':
        event.preventDefault()
        setActiveIndex(options.length - 1)
        break
      case 'Enter':
      case ' ':
        event.preventDefault()
        selectOption(activeIndex)
        break
      case 'Escape':
        event.preventDefault()
        event.stopPropagation()
        closeMenu(true)
        break
      case 'Tab':
        closeMenu(false)
        break
      default:
        break
    }
  }

  return (
    <div className={className}>
      <span id={labelId} className="ff-select-label">{label}</span>
      <div ref={rootRef} className={`ff-select ${isOpen ? 'is-open' : ''}`.trim()}>
        <button
          ref={triggerRef}
          id={triggerId}
          type="button"
          className="ff-select__trigger"
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-controls={isOpen ? listboxId : undefined}
          aria-labelledby={`${labelId} ${triggerId}`}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          disabled={disabled}
          onClick={() => (isOpen ? closeMenu(true) : openMenu())}
          onKeyDown={handleTriggerKeyDown}
        >
          <span className="ff-select__value">{selectedOption?.label}</span>
          <svg
            className="ff-select__chevron"
            viewBox="0 0 24 24"
            width="12"
            height="12"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            focusable="false"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>

        {isOpen ? (
          <ul
            ref={listboxRef}
            id={listboxId}
            className={`ff-select__menu ${placement.side === 'top' ? 'ff-select__menu--top' : ''}`.trim()}
            style={placement.maxHeight ? { maxHeight: placement.maxHeight } : undefined}
            role="listbox"
            tabIndex={-1}
            aria-labelledby={labelId}
            aria-activedescendant={optionId(activeIndex)}
            onKeyDown={handleListboxKeyDown}
          >
            {options.map((option, index) => (
              <li
                key={option.value}
                id={optionId(index)}
                role="option"
                aria-selected={index === selectedIndex}
                className={[
                  'ff-select__option',
                  index === selectedIndex ? 'is-selected' : '',
                  index === activeIndex ? 'is-active' : '',
                ].join(' ').trim()}
                onPointerEnter={() => setActiveIndex(index)}
                onClick={() => selectOption(index)}
              >
                <span>{option.label}</span>
                {index === selectedIndex ? (
                  <svg
                    className="ff-select__check"
                    viewBox="0 0 24 24"
                    width="14"
                    height="14"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                    focusable="false"
                  >
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  )
}

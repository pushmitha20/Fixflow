import { useEffect, useId, useRef, useState } from 'react'
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
}

// Listbox-pattern dropdown for filter toolbars: a trigger button that opens a
// themed option menu, replacing the browser-rendered native <select> popup.
export default function FilterSelect<TValue extends string>({
  label,
  value,
  options,
  onChange,
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

  const selectedIndex = Math.max(
    options.findIndex((option) => option.value === value),
    0,
  )
  const selectedOption = options[selectedIndex]

  const openMenu = (index = selectedIndex) => {
    setActiveIndex(index)
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

  useEffect(() => {
    if (!isOpen) {
      return undefined
    }

    listboxRef.current?.focus()

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

    listboxRef.current?.children[activeIndex]?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex, isOpen])

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
    <div className="ff-filter-group">
      <span id={labelId}>{label}</span>
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
            className="ff-select__menu"
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

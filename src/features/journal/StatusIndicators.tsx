import type {
  EnergyLevel,
  MoodLevel
} from '../../types'
export function MoodFace({ level }: { level: MoodLevel }) {
  const common = { viewBox: '0 0 64 64', className: `mood-face-svg mood-face-${level}`, 'aria-hidden': true } as const

  if (level === 1) return (
    <svg {...common}>
      <circle className="mood-ring" cx="32" cy="32" r="26" />
      <path className="mood-line" d="M15.5 21.5l10 10M25.5 21.5l-10 10" />
      <path className="mood-line" d="M38.5 21.5l10 10M48.5 21.5l-10 10" />
      <path className="mood-line" d="M19 45c3-4 6 4 9 0s6-4 9 0 6 4 9 0" />
    </svg>
  )
  if (level === 2) return (
    <svg {...common}>
      <circle className="mood-ring" cx="32" cy="32" r="26" />
      <path className="mood-thin" d="M16.5 24.5c3.1-2.2 6.6-2.2 9.7 0M37.8 24.5c3.1-2.2 6.6-2.2 9.7 0" />
      <circle className="mood-fill" cx="21.5" cy="28.5" r="2.1" />
      <circle className="mood-fill" cx="42.5" cy="28.5" r="2.1" />
      <path className="mood-line" d="M21 45c5.7-5.6 16.3-5.6 22 0" />
    </svg>
  )
  if (level === 3) return (
    <svg {...common}>
      <circle className="mood-ring" cx="32" cy="32" r="26" />
      <circle className="mood-fill" cx="22" cy="26" r="2.4" />
      <circle className="mood-fill" cx="42" cy="26" r="2.4" />
      <path className="mood-line" d="M23 43h18" />
    </svg>
  )
  if (level === 4) return (
    <svg {...common}>
      <circle className="mood-ring" cx="32" cy="32" r="26" />
      <circle className="mood-fill" cx="21.5" cy="27" r="2.2" />
      <path className="mood-thin" d="M38 27c2.7-1.6 5.5-1.6 8.2 0" />
      <path className="mood-line" d="M20.5 39.5c5.7 4.4 15.5 5.1 23.5-.8" />
    </svg>
  )

  return (
    <svg {...common}>
      <circle className="mood-ring" cx="32" cy="32" r="26" />
      <path className="mood-line" d="M15.5 28c3-4 8-4 11 0" />
      <path className="mood-line" d="M37.5 28c3-4 8-4 11 0" />
      <path className="mood-line" d="M18.5 37c5.5 10.5 21.5 10.5 27 0" />
    </svg>
  )
}

export function EnergyBattery({ level }: { level: EnergyLevel }) {
  return <span className={`energy-battery energy-${level}`} aria-hidden="true">
    <span className="battery-cap" />
    <span className="battery-body">{[5,4,3,2,1].map(cell => <span key={cell} className={`battery-cell${cell <= level ? ' filled' : ''}`} />)}</span>
  </span>
}

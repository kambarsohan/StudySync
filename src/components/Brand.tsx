import { Link } from 'react-router-dom'

export function Mark({ size = 34 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden="true">
    <path d="M7 10.8c4.6-2.3 8.8-1.6 13 1.2v19c-4.2-2.8-8.4-3.5-13-1.2V10.8Z" fill="#34764B"/>
    <path d="M33 10.8c-4.6-2.3-8.8-1.6-13 1.2v19c4.2-2.8 8.4-3.5 13-1.2V10.8Z" fill="#78A982"/>
    <path d="M20 12v19M10.5 17.1c2.5-.4 4.6.1 6.4 1.1M29.5 17.1c-2.5-.4-4.6-.4-6.4 1.1" stroke="#FFFFFF" strokeWidth="1.35" strokeLinecap="round"/>
  </svg>
}

export function Brand({ to = '/', compact = false, className = '' }: { to?: string; compact?: boolean; className?: string }) {
  return <Link className={`brand ${compact ? 'brand-compact' : ''} ${className}`} to={to} aria-label="StudySync home">
    <Mark size={compact ? 30 : 36} /><span>Study<span className="brand-accent">Sync</span></span>
  </Link>
}

import { forwardRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { initials } from '../lib/utils'

export function Button({ className = '', variant = 'primary', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' | 'danger' }) {
  return <button className={`button button-${variant} ${className}`} {...props} />
}

export function Card({ children, className = '', ...props }: { children: ReactNode; className?: string } & React.HTMLAttributes<HTMLElement>) {
  return <section className={`card ${className}`} {...props}>{children}</section>
}

export const Field = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string; hint?: string }>(function Field({ label, error, hint, className = '', id, ...props }, ref) {
  const fieldId = id ?? props.name
  return <div className={`field ${className}`}>
    <label htmlFor={fieldId}>{label}</label>
    <input ref={ref} id={fieldId} aria-invalid={Boolean(error)} aria-describedby={error ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined} {...props} />
    {hint && !error && <span className="field-hint" id={`${fieldId}-hint`}>{hint}</span>}
    {error && <span className="field-error" id={`${fieldId}-error`} role="alert">{error}</span>}
  </div>
})

export function TextareaField({ label, error, className = '', id, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; error?: string }) {
  const fieldId = id ?? props.name
  return <div className={`field ${className}`}>
    <label htmlFor={fieldId}>{label}</label>
    <textarea id={fieldId} aria-invalid={Boolean(error)} aria-describedby={error ? `${fieldId}-error` : undefined} {...props} />
    {error && <span className="field-error" id={`${fieldId}-error`} role="alert">{error}</span>}
  </div>
}

export function SelectField({ label, children, error, className = '', id, ...props }: SelectHTMLAttributes<HTMLSelectElement> & { label: string; children: ReactNode; error?: string }) {
  const fieldId = id ?? props.name
  return <div className={`field ${className}`}>
    <label htmlFor={fieldId}>{label}</label>
    <select id={fieldId} aria-invalid={Boolean(error)} {...props}>{children}</select>
    {error && <span className="field-error" role="alert">{error}</span>}
  </div>
}

export function PageTitle({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: ReactNode }) {
  return <div className="page-title"><div>{eyebrow && <p className="eyebrow">{eyebrow}</p>}<h1>{title}</h1>{description && <p className="page-description">{description}</p>}</div>{action && <div className="page-title-action">{action}</div>}</div>
}

export function Avatar({ name, src, size = 'md' }: { name?: string | null; src?: string | null; size?: 'sm' | 'md' | 'lg' }) {
  return <span className={`avatar avatar-${size}`} aria-label={name || 'Student'} role="img">{src ? <img src={src} alt="" /> : initials(name)}</span>
}

export function EmptyState({ icon, title, body, action }: { icon?: ReactNode; title: string; body: string; action?: ReactNode }) {
  return <div className="empty-state">{icon && <div className="empty-icon" aria-hidden="true">{icon}</div>}<h3>{title}</h3><p>{body}</p>{action}</div>
}

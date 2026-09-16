import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react'

export function Button({
  variant = 'primary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'ghost' | 'danger' }) {
  const styles =
    variant === 'primary'
      ? 'bg-citrus text-ink hover:brightness-110'
      : variant === 'danger'
        ? 'bg-coral/90 text-ink hover:brightness-110'
        : 'border border-mist/25 text-mist hover:bg-panel'
  return (
    <button
      className={`inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold transition disabled:opacity-50 ${styles} ${className}`}
      {...props}
    />
  )
}

export function Input({ className = '', ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`w-full rounded-xl border border-mist/15 bg-panel px-3 py-2.5 text-foam outline-none ring-citrus/40 placeholder:text-mist/40 focus:ring-2 ${className}`}
      {...props}
    />
  )
}

export function TextArea({
  className = '',
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={`w-full rounded-xl border border-mist/15 bg-panel px-3 py-2.5 text-foam outline-none ring-citrus/40 placeholder:text-mist/40 focus:ring-2 ${className}`}
      {...props}
    />
  )
}

export function Label({ children }: { children: ReactNode }) {
  return <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-mist/70">{children}</label>
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      {children}
    </div>
  )
}

export function Panel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-mist/10 bg-panel/70 p-4 shadow-[0_20px_60px_-40px_rgba(0,0,0,0.8)] ${className}`}>
      {children}
    </section>
  )
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-mist/20 px-4 py-10 text-center">
      <p className="font-display text-xl text-foam">{title}</p>
      {hint && <p className="mt-2 text-sm text-mist/60">{hint}</p>}
    </div>
  )
}

export function ErrorText({ children }: { children: ReactNode }) {
  return <p className="text-sm text-coral">{children}</p>
}

export function PageTitle({ children, subtitle }: { children: ReactNode; subtitle?: string }) {
  return (
    <div className="mb-5">
      <h1 className="font-display text-3xl font-semibold text-foam">{children}</h1>
      {subtitle && <p className="mt-1 text-sm text-mist/70">{subtitle}</p>}
    </div>
  )
}

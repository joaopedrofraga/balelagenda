import { addMonths, mondayIndex, startOfMonth, toDateKey } from '../lib/dateUtils'

const WEEKDAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'] as const

export type DayMarker = {
  colors: string[]
  count: number
}

type Props = {
  month: Date
  selectedKey: string
  /** Por dateKey: até 3 cores distintas dos eventos do dia */
  dayMarkers: Map<string, DayMarker>
  onMonthChange: (month: Date) => void
  onSelectDay: (dateKey: string) => void
}

export function MonthCalendar({
  month,
  selectedKey,
  dayMarkers,
  onMonthChange,
  onSelectDay,
}: Props) {
  const anchor = startOfMonth(month)
  const todayKey = toDateKey(new Date())
  const label = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(anchor)

  const leading = mondayIndex(anchor)
  const daysInMonth = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0).getDate()
  const cells: Array<{ key: string; day: number } | null> = []

  for (let i = 0; i < leading; i++) cells.push(null)
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(anchor.getFullYear(), anchor.getMonth(), day)
    cells.push({ key: toDateKey(date), day })
  }
  while (cells.length % 7 !== 0) cells.push(null)

  return (
    <div className="calendar-shell">
      <div className="mb-4 flex items-center justify-between gap-3">
        <button
          type="button"
          aria-label="Mês anterior"
          onClick={() => onMonthChange(addMonths(anchor, -1))}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-mist/15 text-mist transition hover:border-citrus/50 hover:text-citrus"
        >
          ‹
        </button>
        <h2 className="font-display text-xl capitalize text-foam sm:text-2xl">{label}</h2>
        <button
          type="button"
          aria-label="Próximo mês"
          onClick={() => onMonthChange(addMonths(anchor, 1))}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-mist/15 text-mist transition hover:border-citrus/50 hover:text-citrus"
        >
          ›
        </button>
      </div>

      <div className="mb-2 grid grid-cols-7 gap-1 text-center text-[11px] font-medium uppercase tracking-wider text-mist/45">
        {WEEKDAYS.map((d) => (
          <div key={d} className="py-1">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((cell, i) => {
          if (!cell) {
            return <div key={`empty-${i}`} className="aspect-square" />
          }

          const marker = dayMarkers.get(cell.key)
          const count = marker?.count ?? 0
          const colors = marker?.colors ?? []
          const isSelected = cell.key === selectedKey
          const isToday = cell.key === todayKey

          return (
            <button
              key={cell.key}
              type="button"
              onClick={() => onSelectDay(cell.key)}
              aria-pressed={isSelected}
              aria-label={`${cell.day}${count ? `, ${count} evento${count > 1 ? 's' : ''}` : ''}`}
              className={[
                'relative flex aspect-square flex-col items-center justify-center rounded-xl text-sm transition',
                isSelected
                  ? 'bg-citrus font-semibold text-ink shadow-[0_0_0_1px_rgba(200,245,66,0.4)]'
                  : isToday
                    ? 'bg-panel text-foam ring-1 ring-sky/50 hover:bg-panel/80'
                    : 'text-mist/85 hover:bg-panel/70 hover:text-foam',
              ].join(' ')}
            >
              <span>{cell.day}</span>
              {count > 0 && (
                <span className="mt-0.5 flex gap-0.5" aria-hidden>
                  {Array.from({ length: Math.min(count, 3) }).map((_, dot) => (
                    <span
                      key={dot}
                      className="h-1.5 w-1.5 rounded-full"
                      style={{
                        backgroundColor: isSelected
                          ? 'rgba(11, 31, 36, 0.55)'
                          : colors[dot] ?? colors[0] ?? '#c8f542',
                      }}
                    />
                  ))}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

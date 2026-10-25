const rupiah = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
})

/** 49000 → "Rp 49.000" */
export function formatRupiah(amount: number): string {
  return rupiah.format(amount)
}

/** 1240 → "1.240" (use with the `tabular-nums` class in stats) */
export function formatNumber(value: number): string {
  return value.toLocaleString('id-ID')
}

/** "2026-10-06T..." → "6 Oktober 2026" */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '-'
  return new Date(iso).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

/** "2026-10-06T10:00:00+08:00" → "Selasa, 6 Oktober 2026 pukul 10.00" */
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '-'
  return new Date(iso).toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'short' })
}

const relative = new Intl.RelativeTimeFormat('id-ID', { numeric: 'auto' })
const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 31_536_000],
  ['month', 2_592_000],
  ['day', 86_400],
  ['hour', 3_600],
  ['minute', 60],
]

/** "3 jam yang lalu", "kemarin" */
export function relativeTime(iso: string | null | undefined): string {
  if (!iso) return '-'
  const seconds = (new Date(iso).getTime() - Date.now()) / 1000
  for (const [unit, size] of UNITS) {
    if (Math.abs(seconds) >= size) return relative.format(Math.round(seconds / size), unit)
  }
  return 'baru saja'
}

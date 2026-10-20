import { guestCode } from './code'

// INV-20261006-7K3QXM: date for humans, random suffix so parallel orders never collide on a counter.
export function invoiceNumber(date = new Date()) {
  const day = date.toISOString().slice(0, 10).replaceAll('-', '')
  return `INV-${day}-${guestCode(6)}`
}

// 32 symbols without 0/O and 1/I, so codes read cleanly when typed from a printed list.
// 256 is a multiple of 32, so taking each random byte modulo 32 keeps every symbol equally likely.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export function guestCode(length = 8) {
  const bytes = crypto.getRandomValues(new Uint8Array(length))
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join('')
}

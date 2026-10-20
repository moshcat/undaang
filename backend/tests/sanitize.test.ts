import { describe, expect, it } from 'bun:test'
import { stripHtml } from '../src/lib/sanitize'

describe('stripHtml', () => {
  it('removes tags and event handlers', () => {
    expect(stripHtml('<script>alert(1)</script>Selamat')).toBe('Selamat')
    expect(stripHtml('<img src=x onerror=alert(1)>Bahagia selalu')).toBe('Bahagia selalu')
    expect(stripHtml('<b>Raka</b> &amp; <i>Sinta</i>')).toBe('Raka & Sinta')
  })

  it('strips tags that arrive entity-encoded', () => {
    expect(stripHtml('&lt;script&gt;alert(1)&lt;/script&gt;hai')).toBe('hai')
  })

  it('keeps plain text characters as typed', () => {
    expect(stripHtml('Raka & Sinta <3')).toBe('Raka & Sinta <3')
    expect(stripHtml('"Semoga" langgeng ya')).toBe('"Semoga" langgeng ya')
  })
})

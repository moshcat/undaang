import sanitizeHtml from 'sanitize-html'

const ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  '#39': "'",
}

function decode(text: string) {
  return text.replace(/&(amp|lt|gt|quot|#39);/g, (_, name: string) => ENTITIES[name] ?? '')
}

// Removes every HTML tag but keeps the text as typed. The frontend renders it as text, so the
// escaping sanitize-html adds is reversed. Decoding first means &lt;script&gt; is stripped too.
export function stripHtml(input: string) {
  const clean = sanitizeHtml(decode(input), {
    allowedTags: [],
    allowedAttributes: {},
    disallowedTagsMode: 'discard',
  })
  return decode(clean).trim()
}

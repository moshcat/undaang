// SRS 4.2: public page and RSVP under 100 concurrent users, p95 below 500 ms.
//
//   k6 run -e BASE_URL=http://localhost:3000 -e SLUG=raka-dan-sinta tests/load/public.js
//
// SLUG must be a published invitation. Run it against a local server: there is no proxy in front,
// so the X-Forwarded-For set below gives every virtual user its own address and the RSVP rate
// limit applies per user, as it does for real guests behind Railway or Render.
import http from 'k6/http'
import { check, sleep } from 'k6'

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000'
const SLUG = __ENV.SLUG

export const options = {
  scenarios: {
    guests: {
      executor: 'ramping-vus',
      stages: [
        { duration: '30s', target: 100 },
        { duration: '1m', target: 100 },
        { duration: '15s', target: 0 },
      ],
    },
  },
  thresholds: {
    'http_req_duration{name:page}': ['p(95)<500'],
    'http_req_duration{name:rsvp}': ['p(95)<500'],
    http_req_failed: ['rate<0.01'],
  },
}

export function setup() {
  if (!SLUG) throw new Error('Pass the slug of a published invitation with -e SLUG=...')
  const res = http.get(`${BASE_URL}/api/v1/public/invitations/${SLUG}`)
  if (res.status !== 200) throw new Error(`Invitation ${SLUG} answered ${res.status}`)
}

export default function () {
  const headers = { 'X-Forwarded-For': `10.${__VU >> 8}.${__VU & 255}.${__ITER % 250}` }

  const page = http.get(`${BASE_URL}/api/v1/public/invitations/${SLUG}`, {
    headers,
    tags: { name: 'page' },
  })
  check(page, { 'page 200': (r) => r.status === 200 })
  sleep(1 + Math.random() * 2)

  const rsvp = http.post(
    `${BASE_URL}/api/v1/public/invitations/${SLUG}/rsvps`,
    JSON.stringify({
      name: `Tamu beban ${__VU}`,
      attendance: 'hadir',
      pax: 1,
      message: 'Uji beban k6',
    }),
    { headers: { ...headers, 'Content-Type': 'application/json' }, tags: { name: 'rsvp' } },
  )
  check(rsvp, { 'rsvp 201': (r) => r.status === 201 })
  sleep(1 + Math.random() * 2)
}

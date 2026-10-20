import { createHash, createHmac, timingSafeEqual } from 'node:crypto'
import { env, isDokuReady } from '../config/env'
import { badGateway, serviceUnavailable } from '../lib/errors'

const CHECKOUT_PATH = '/checkout/v1/payment'
const PAYMENT_DUE_MINUTES = 60

export type SignatureParts = {
  clientId: string
  requestId: string
  timestamp: string
  target: string
  // GET requests have no body and no Digest line.
  body?: string
}

export function digest(body: string) {
  return createHash('sha256').update(body, 'utf8').digest('base64')
}

// DOKU non-SNAP signature: HMAC-SHA256 over "Name:value" lines, no trailing newline.
export function signature(parts: SignatureParts, secretKey: string) {
  const lines = [
    `Client-Id:${parts.clientId}`,
    `Request-Id:${parts.requestId}`,
    `Request-Timestamp:${parts.timestamp}`,
    `Request-Target:${parts.target}`,
  ]
  if (parts.body !== undefined) lines.push(`Digest:${digest(parts.body)}`)
  const component = lines.join('\n')
  return `HMACSHA256=${createHmac('sha256', secretKey).update(component).digest('base64')}`
}

function dokuTimestamp(date = new Date()) {
  return date.toISOString().replace(/\.\d{3}Z$/, 'Z')
}

function credentials() {
  const config = env()
  if (!isDokuReady(config)) throw serviceUnavailable('Payment gateway is not configured yet')
  return {
    clientId: config.DOKU_CLIENT_ID as string,
    secretKey: config.DOKU_SECRET_KEY as string,
    baseUrl: config.DOKU_BASE_URL.replace(/\/$/, ''),
  }
}

export function assertDokuReady() {
  credentials()
}

type CheckoutInput = {
  invoiceNumber: string
  amount: number
  itemName: string
  callbackUrl: string
  customer: { id: string; name: string; email: string }
}

export async function createCheckout(input: CheckoutInput) {
  const { clientId, secretKey, baseUrl } = credentials()
  const body = JSON.stringify({
    order: {
      amount: input.amount,
      invoice_number: input.invoiceNumber,
      currency: 'IDR',
      callback_url: input.callbackUrl,
      line_items: [{ name: input.itemName, price: input.amount, quantity: 1 }],
    },
    payment: { payment_due_date: PAYMENT_DUE_MINUTES },
    customer: input.customer,
  })
  const requestId = crypto.randomUUID()
  const timestamp = dokuTimestamp()

  let res: Response
  try {
    res = await fetch(`${baseUrl}${CHECKOUT_PATH}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Client-Id': clientId,
        'Request-Id': requestId,
        'Request-Timestamp': timestamp,
        Signature: signature(
          { clientId, requestId, timestamp, target: CHECKOUT_PATH, body },
          secretKey,
        ),
      },
      body,
      signal: AbortSignal.timeout(15_000),
    })
  } catch (err) {
    console.error('DOKU checkout request failed', err)
    throw badGateway('Could not reach the payment gateway')
  }

  const payload = (await res.json().catch(() => null)) as {
    response?: { payment?: { url?: string } }
    error_messages?: string[]
  } | null
  const url = payload?.response?.payment?.url
  if (!res.ok || !url) {
    console.error('DOKU checkout rejected', res.status, payload?.error_messages)
    throw badGateway('The payment gateway did not return a payment page')
  }
  return { paymentUrl: url, requestId }
}

export function verifyNotification(headers: Headers, body: string, target: string) {
  const { clientId, secretKey } = credentials()
  const received = headers.get('signature')
  const requestId = headers.get('request-id')
  const timestamp = headers.get('request-timestamp')
  if (!received || !requestId || !timestamp || headers.get('client-id') !== clientId) return false
  const expected = signature({ clientId, requestId, timestamp, target, body }, secretKey)
  const a = Buffer.from(received)
  const b = Buffer.from(expected)
  return a.length === b.length && timingSafeEqual(a, b)
}

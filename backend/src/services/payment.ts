import mongoose from 'mongoose'
import { badRequest, notFound, unauthorized } from '../lib/errors'
import { InvitationModel, OrderModel, type OrderDoc } from '../models'
import type { Tier } from '../models/theme'
import { verifyNotification } from './doku'
import { extendExpiry, planRank } from './plan'

// Both the HTTP notification and the Check Status response carry these fields.
type DokuResult = {
  order?: { invoice_number?: string; amount?: number | string; status?: string }
  transaction?: { status?: string; date?: string }
  channel?: { id?: string }
}

export type PaymentSource = 'webhook' | 'status_check'
export type NotificationResult = 'activated' | 'already_paid' | 'expired' | 'ignored'

function transactionStatus(result: DokuResult) {
  const status = result.transaction?.status ?? 'UNKNOWN'
  // Check Status reports an abandoned checkout on the order, not on the transaction.
  if (status !== 'SUCCESS' && result.order?.status === 'ORDER_EXPIRED') return 'EXPIRED'
  return status
}

export async function applyDokuResult(
  order: OrderDoc,
  result: DokuResult,
  source: PaymentSource,
): Promise<NotificationResult> {
  const status = transactionStatus(result)
  const entry = { received_at: new Date(), status, source, raw: result }

  if (Math.round(Number(result.order?.amount)) !== order.amount) {
    await OrderModel.updateOne(
      { _id: order._id },
      { $push: { notifications: { ...entry, status: `${status}_AMOUNT_MISMATCH` } } },
    )
    throw badRequest('Amount does not match the order')
  }

  if (status === 'EXPIRED') {
    await OrderModel.updateOne(
      { _id: order._id, status: 'pending' },
      { status: 'expired', $push: { notifications: entry } },
    )
    return 'expired'
  }
  // Checkout lets the customer try another method after a FAILED attempt, so the order stays open.
  if (status !== 'SUCCESS') {
    // A status check runs on every poll of a pending order; logging each one adds nothing.
    if (source === 'webhook') {
      await OrderModel.updateOne({ _id: order._id }, { $push: { notifications: entry } })
    }
    return 'ignored'
  }

  let outcome: NotificationResult = 'already_paid'
  await mongoose.connection.transaction(async (session) => {
    outcome = 'already_paid'
    const paidAt = result.transaction?.date ? new Date(result.transaction.date) : new Date()
    // The status filter makes a repeated or concurrent notification a no-op.
    const paid = await OrderModel.findOneAndUpdate(
      { _id: order._id, status: { $ne: 'paid' } },
      {
        status: 'paid',
        paid_at: Number.isNaN(paidAt.getTime()) ? new Date() : paidAt,
        payment_method: result.channel?.id || null,
        $push: { notifications: entry },
      },
      { session, returnDocument: 'after' },
    )
    if (!paid) {
      await OrderModel.updateOne(
        { _id: order._id },
        { $push: { notifications: entry } },
        { session },
      )
      return
    }
    const invitation = await InvitationModel.findById(paid.invitation_id).session(session)
    if (!invitation) throw notFound('Invitation of the order no longer exists')
    const bought = paid.plan as Tier
    if (planRank(bought) > planRank(invitation.plan as Tier)) invitation.plan = bought
    invitation.plan_expires_at = extendExpiry(invitation.plan_expires_at, bought)
    await invitation.save({ session })
    outcome = 'activated'
  })
  return outcome
}

export async function handleDokuNotification(
  headers: Headers,
  rawBody: string,
  target: string,
): Promise<NotificationResult> {
  if (!verifyNotification(headers, rawBody, target)) throw unauthorized('Invalid signature')

  let payload: DokuResult
  try {
    payload = JSON.parse(rawBody) as DokuResult
  } catch {
    throw badRequest('Body is not valid JSON')
  }
  const invoice = payload.order?.invoice_number
  if (!invoice) throw badRequest('order.invoice_number is missing')

  const order = await OrderModel.findOne({ invoice_number: invoice })
  if (!order) throw notFound('Order not found')
  return applyDokuResult(order, payload, 'webhook')
}

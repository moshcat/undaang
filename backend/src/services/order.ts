import { env } from '../config/env'
import { PLANS } from '../config/plans'
import { badRequest } from '../lib/errors'
import { invoiceNumber } from '../lib/invoice'
import { OrderModel, UserModel, type InvitationDoc } from '../models'
import type { Tier } from '../models/theme'
import { assertDokuReady, createCheckout } from './doku'
import { isExpired, planRank } from './plan'

export async function placeOrder(
  userId: string,
  invitation: InvitationDoc,
  plan: 'basic' | 'premium',
) {
  const current = invitation.plan as Tier
  // Buying the same plan again renews it; a lower plan than an active one is never sold.
  if (planRank(plan) < planRank(current) && !isExpired(invitation.plan_expires_at)) {
    throw badRequest(`This invitation already has the ${current} plan`)
  }
  assertDokuReady()

  const user = await UserModel.findById(userId)
  if (!user) throw badRequest('Account not found')

  const order = await OrderModel.create({
    invoice_number: invoiceNumber(),
    user_id: user._id,
    invitation_id: invitation._id,
    plan,
    amount: PLANS[plan].price,
  })

  try {
    const { paymentUrl } = await createCheckout({
      invoiceNumber: order.invoice_number,
      amount: order.amount,
      itemName: `Paket ${plan === 'basic' ? 'Basic' : 'Premium'} undaang (${invitation.slug})`,
      callbackUrl: `${env().APP_BASE_URL.replace(/\/$/, '')}/orders/${order.invoice_number}`,
      customer: { id: user.id, name: user.name, email: user.email },
    })
    order.payment_url = paymentUrl
    await order.save()
    return order
  } catch (err) {
    order.status = 'failed'
    await order.save()
    throw err
  }
}

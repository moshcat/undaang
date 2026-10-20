import { type HydratedDocument, type InferSchemaType, Schema, model } from 'mongoose'

export const PAID_PLANS = ['basic', 'premium'] as const
export const ORDER_STATUSES = ['pending', 'paid', 'expired', 'failed'] as const

const orderSchema = new Schema(
  {
    invoice_number: { type: String, required: true, unique: true },
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    invitation_id: { type: Schema.Types.ObjectId, ref: 'Invitation', required: true },
    plan: { type: String, enum: PAID_PLANS, required: true },
    amount: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ORDER_STATUSES, default: 'pending', required: true },
    payment_url: { type: String, default: null },
    payment_method: { type: String, default: null },
    paid_at: { type: Date, default: null },
    notifications: {
      type: [
        new Schema(
          {
            received_at: { type: Date, required: true },
            status: { type: String, required: true },
            source: { type: String, enum: ['webhook', 'status_check'], default: 'webhook' },
            raw: { type: Schema.Types.Mixed },
          },
          { _id: false },
        ),
      ],
      default: [],
    },
  },
  { timestamps: true },
)

export type Order = InferSchemaType<typeof orderSchema>
export type OrderDoc = HydratedDocument<Order>
export const OrderModel = model('Order', orderSchema)

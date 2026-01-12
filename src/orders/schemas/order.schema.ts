import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type OrderDocument = HydratedDocument<Order>;

export type OrderStatus = 'pending' | 'paid' | 'shipped';

@Schema({ _id: false })
export class OrderItem {
  @Prop({ type: Types.ObjectId, ref: 'Product', required: true })
  productId!: Types.ObjectId;

  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ required: true, min: 0 })
  price!: number; // snapshot

  @Prop({ required: true, min: 1 })
  qty!: number;

  @Prop()
  imageUrl?: string;
}

const OrderItemSchema = SchemaFactory.createForClass(OrderItem);

@Schema({ timestamps: true, collection: 'orders' })
export class Order {
  // Public-facing short id (8 hex chars) used in the UI
  @Prop({ required: true, unique: true, index: true, trim: true })
  orderId!: string;

  @Prop({ type: Types.ObjectId, ref: 'Customer', required: true, index: true })
  customerId!: Types.ObjectId;

  @Prop({ type: [OrderItemSchema], default: [] })
  items!: OrderItem[];

  @Prop({ required: true, min: 0 })
  subtotal!: number;

  // Referral discount applied (if any). Total should reflect subtotal - discountAmount.
  @Prop({ required: true, min: 0, default: 0 })
  discountAmount!: number;

  @Prop({ required: true, min: 0 })
  total!: number;

  @Prop({ required: true, default: 'pending' })
  status!: OrderStatus;

  // Optional shipping/contact snapshot for MVP
  @Prop()
  shippingName?: string;

  @Prop()
  shippingAddress1?: string;

  @Prop()
  shippingCity?: string;

  @Prop()
  shippingState?: string;

  @Prop()
  shippingPostcode?: string;

  // Admin fulfillment fields
  @Prop({ trim: true })
  shippingCarrier?: string;

  @Prop({ trim: true })
  trackingNumber?: string;

  // Referral tracking (snapshot)
  @Prop({ trim: true, uppercase: true, index: true })
  referralCodeUsed?: string;

  @Prop({ type: Types.ObjectId, ref: 'Customer', required: false, index: true })
  referralOwnerCustomerId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Referral', required: false, index: true })
  referralProgramId?: Types.ObjectId;

  @Prop({ enum: ['percent', 'amount'], required: false })
  referralDiscountType?: 'percent' | 'amount';

  @Prop({ required: false, min: 0 })
  referralDiscountValue?: number;
}

export const OrderSchema = SchemaFactory.createForClass(Order);



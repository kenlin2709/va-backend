import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type OrderDocument = HydratedDocument<Order>;

export type OrderStatus = 'pending' | 'paid' | 'shipped' | 'cancelled';

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
}

export const OrderSchema = SchemaFactory.createForClass(Order);



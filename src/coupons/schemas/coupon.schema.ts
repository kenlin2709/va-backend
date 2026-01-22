import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type CouponDocument = HydratedDocument<Coupon>;

@Schema({ timestamps: true, collection: 'coupons' })
export class Coupon {
  @Prop({ required: true, unique: true, trim: true, uppercase: true, index: true })
  code!: string;

  @Prop({ type: Types.ObjectId, ref: 'Customer', required: true, index: true })
  customerId!: Types.ObjectId;

  @Prop({ required: true, min: 0 })
  value!: number;

  @Prop({ type: Boolean, default: false })
  isUsed!: boolean;

  @Prop({ type: Types.ObjectId, ref: 'Order', required: false })
  usedInOrderId?: Types.ObjectId;

  @Prop({ required: false })
  expiryDate?: Date;

  @Prop({ type: Boolean, default: true })
  active!: boolean;

  @Prop({ trim: true })
  description?: string;
}

export const CouponSchema = SchemaFactory.createForClass(Coupon);

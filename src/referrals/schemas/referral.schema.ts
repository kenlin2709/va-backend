import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ReferralDocument = HydratedDocument<Referral>;

export type ReferralDiscountType = 'percent' | 'amount';

@Schema({ timestamps: true, collection: 'referrals' })
export class Referral {
  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ required: true, enum: ['percent', 'amount'] })
  discountType!: ReferralDiscountType;

  @Prop({ required: true, min: 0 })
  discountValue!: number;

  @Prop({ type: Boolean, default: true })
  active!: boolean;
}

export const ReferralSchema = SchemaFactory.createForClass(Referral);






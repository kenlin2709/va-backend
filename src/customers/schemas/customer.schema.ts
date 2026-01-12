import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type CustomerDocument = HydratedDocument<Customer>;

@Schema({ _id: false })
export class ShippingAddress {
  @Prop({ trim: true })
  fullName?: string;

  @Prop({ trim: true })
  phone?: string;

  @Prop({ trim: true })
  address1?: string;

  @Prop({ trim: true })
  address2?: string;

  @Prop({ trim: true })
  city?: string;

  @Prop({ trim: true })
  state?: string;

  @Prop({ trim: true })
  postcode?: string;

  @Prop({ trim: true, default: 'Australia' })
  country?: string;
}

export const ShippingAddressSchema = SchemaFactory.createForClass(ShippingAddress);

@Schema({ timestamps: true, collection: 'customers' })
export class Customer {
  @Prop({ required: true, trim: true, lowercase: true, unique: true, index: true })
  email!: string;

  @Prop({ required: true })
  passwordHash!: string;

  @Prop({ trim: true })
  firstName?: string;

  @Prop({ trim: true })
  lastName?: string;

  @Prop({ trim: true })
  phone?: string;

  // Used to gate access to admin UI/APIs. Defaults to false.
  @Prop({ type: Boolean, default: false })
  isAdmin!: boolean;

  @Prop({ type: ShippingAddressSchema, required: false })
  shippingAddress?: ShippingAddress;

  // Admin-assigned referral program (discount rules) + user’s personal referral code
  @Prop({ type: Types.ObjectId, ref: 'Referral', required: false, index: true })
  referralProgramId?: Types.ObjectId;

  @Prop({ trim: true, uppercase: true, unique: true, sparse: true, index: true })
  referralCode?: string;
}

export const CustomerSchema = SchemaFactory.createForClass(Customer);



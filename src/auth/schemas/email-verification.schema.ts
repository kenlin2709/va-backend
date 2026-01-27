import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type EmailVerificationDocument = HydratedDocument<EmailVerification>;

@Schema({ timestamps: true, collection: 'email_verifications' })
export class EmailVerification {
  @Prop({ required: true, trim: true, lowercase: true, index: true })
  email!: string;

  @Prop({ required: true })
  code!: string; // bcrypt hashed

  @Prop({ required: true, index: true })
  expiresAt!: Date;

  @Prop({ default: 0 })
  attempts!: number;

  @Prop({ default: false })
  verified!: boolean;

  @Prop()
  verifiedAt?: Date;
}

export const EmailVerificationSchema = SchemaFactory.createForClass(EmailVerification);

// TTL index: auto-delete documents 10 minutes after expiresAt
EmailVerificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

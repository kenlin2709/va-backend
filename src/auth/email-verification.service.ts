import { BadRequestException, Injectable, Inject, forwardRef } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { JwtService } from '@nestjs/jwt';
import { Model } from 'mongoose';
import * as bcrypt from 'bcryptjs';

import { EmailVerification, EmailVerificationDocument } from './schemas/email-verification.schema';
import { CustomersService } from '../customers/customers.service';
import { EmailService } from '../email/email.service';

@Injectable()
export class EmailVerificationService {
  constructor(
    @InjectModel(EmailVerification.name)
    private readonly verificationModel: Model<EmailVerificationDocument>,
    @Inject(forwardRef(() => CustomersService))
    private readonly customers: CustomersService,
    private readonly email: EmailService,
    private readonly jwt: JwtService,
  ) {}

  async sendCode(email: string): Promise<{ message: string }> {
    const normalizedEmail = email.toLowerCase().trim();
    if (!normalizedEmail) {
      throw new BadRequestException('Email is required');
    }

    // Check if email is already registered
    const exists = await this.customers.emailExists(normalizedEmail);
    if (exists) {
      throw new BadRequestException('Email already registered');
    }

    // Rate limiting: max 3 requests per email in 10 minutes
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    const recentCount = await this.verificationModel.countDocuments({
      email: normalizedEmail,
      createdAt: { $gte: tenMinutesAgo },
    });
    if (recentCount >= 3) {
      throw new BadRequestException('Too many requests. Please try again later.');
    }

    // Generate 6-digit code
    const code = this.generateCode();
    const codeHash = await bcrypt.hash(code, 10);

    // Store verification record
    await this.verificationModel.create({
      email: normalizedEmail,
      code: codeHash,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
      attempts: 0,
      verified: false,
    });

    // Send email
    await this.email.sendVerificationEmail(normalizedEmail, code);

    return { message: 'Verification code sent' };
  }

  async verifyCode(email: string, code: string): Promise<{ verificationToken: string }> {
    const normalizedEmail = email.toLowerCase().trim();

    // Find latest non-expired, non-verified record
    const record = await this.verificationModel
      .findOne({
        email: normalizedEmail,
        verified: false,
        expiresAt: { $gt: new Date() },
      })
      .sort({ createdAt: -1 });

    if (!record) {
      throw new BadRequestException('No pending verification found. Please request a new code.');
    }

    // Check attempts (max 5)
    if (record.attempts >= 5) {
      throw new BadRequestException('Too many failed attempts. Please request a new code.');
    }

    // Verify code
    const isValid = await bcrypt.compare(code, record.code);
    if (!isValid) {
      await this.verificationModel.updateOne({ _id: record._id }, { $inc: { attempts: 1 } });
      throw new BadRequestException('Invalid verification code');
    }

    // Mark as verified
    await this.verificationModel.updateOne(
      { _id: record._id },
      { verified: true, verifiedAt: new Date() },
    );

    // Generate short-lived JWT token (15 minutes) for registration completion
    const verificationToken = await this.jwt.signAsync(
      { email: normalizedEmail, purpose: 'email-verification' },
      { expiresIn: '15m' },
    );

    return { verificationToken };
  }

  async validateToken(email: string, token: string): Promise<boolean> {
    try {
      const payload = await this.jwt.verifyAsync(token);
      return (
        payload.email === email.toLowerCase().trim() && payload.purpose === 'email-verification'
      );
    } catch {
      return false;
    }
  }

  private generateCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }
}

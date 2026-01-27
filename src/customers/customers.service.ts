import { BadRequestException, Inject, Injectable, NotFoundException, forwardRef } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { randomBytes } from 'crypto';

import { Customer, CustomerDocument } from './schemas/customer.schema';
import { CouponsService } from '../coupons/coupons.service';

type CreateCustomerInput = {
  email: string;
  passwordHash: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  referredByCode?: string;
  shippingAddress?: {
    fullName?: string;
    phone?: string;
    address1?: string;
    address2?: string;
    city?: string;
    state?: string;
    postcode?: string;
    country?: string;
  };
};

@Injectable()
export class CustomersService {
  constructor(
    @InjectModel(Customer.name) private readonly customerModel: Model<CustomerDocument>,
    @Inject(forwardRef(() => CouponsService))
    private readonly couponsService: CouponsService,
  ) {}

  async findById(id: string) {
    const doc = await this.customerModel.findById(id).lean();
    if (!doc) throw new NotFoundException('Customer not found');
    return doc;
  }

  async findByEmail(email: string) {
    return this.customerModel.findOne({ email: email.toLowerCase().trim() }).lean();
  }

  async findByReferralCode(code: string) {
    const normalized = String(code ?? '').trim().toUpperCase();
    if (!normalized) return null;
    return this.customerModel.findOne({ referralCode: normalized }).lean();
  }

  async emailExists(email: string): Promise<boolean> {
    const normalized = email.toLowerCase().trim();
    if (!normalized) return false;
    const exists = await this.customerModel.exists({ email: normalized });
    return !!exists;
  }

  async count(): Promise<number> {
    return this.customerModel.countDocuments();
  }

  private async generateUniqueReferralCode(): Promise<string> {
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = randomBytes(4).toString('hex').toUpperCase();
      const exists = await this.customerModel.exists({ referralCode: code });
      if (!exists) return code;
    }
    throw new BadRequestException('Failed to generate unique referral code');
  }

  async create(input: CreateCustomerInput) {
    const email = input.email.toLowerCase().trim();
    const exists = await this.customerModel.exists({ email });
    if (exists) throw new BadRequestException('Email already registered');

    // Generate unique referral code for this customer
    const referralCode = await this.generateUniqueReferralCode();

    // Check if referred by another customer
    let referrer: (Customer & { _id: any }) | null = null;
    if (input.referredByCode) {
      referrer = await this.findByReferralCode(input.referredByCode);
    }

    const customer = await this.customerModel.create({
      email,
      passwordHash: input.passwordHash,
      firstName: input.firstName,
      lastName: input.lastName,
      phone: input.phone,
      referralCode,
      shippingAddress: input.shippingAddress,
    });

    const oneYearFromNow = new Date();
    oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

    // Create welcome coupon ($5, expires in 1 year)
    try {
      await this.couponsService.create({
        customerId: String(customer._id),
        value: 5,
        description: 'Welcome bonus',
        expiryDate: oneYearFromNow.toISOString(),
      });
    } catch (error) {
      console.error('Failed to create welcome coupon:', error);
    }

    // If referred, create $2 coupons for both users
    if (referrer) {
      try {
        // Coupon for the new user (referred)
        await this.couponsService.create({
          customerId: String(customer._id),
          value: 2,
          description: 'Referral bonus',
          expiryDate: oneYearFromNow.toISOString(),
        });

        // Coupon for the referrer
        await this.couponsService.create({
          customerId: String(referrer._id),
          value: 2,
          description: `Referral bonus - referred ${email}`,
          expiryDate: oneYearFromNow.toISOString(),
        });
      } catch (error) {
        console.error('Failed to create referral coupons:', error);
      }
    }

    return customer;
  }

  async updateProfile(customerId: string, update: Partial<Customer>) {
    // Never allow password changes here.
    delete (update as any).passwordHash;
    delete (update as any).isAdmin;
    delete (update as any).email;

    const doc = await this.customerModel
      .findByIdAndUpdate(customerId, update, { new: true, runValidators: true })
      .lean();
    if (!doc) throw new NotFoundException('Customer not found');
    return doc;
  }

  async updatePasswordHash(customerId: string, passwordHash: string) {
    const doc = await this.customerModel
      .findByIdAndUpdate(customerId, { passwordHash }, { new: true, runValidators: true })
      .lean();
    if (!doc) throw new NotFoundException('Customer not found');
    return doc;
  }
}



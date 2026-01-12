import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { Customer, CustomerDocument } from './schemas/customer.schema';

type CreateCustomerInput = {
  email: string;
  passwordHash: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
};

@Injectable()
export class CustomersService {
  constructor(
    @InjectModel(Customer.name) private readonly customerModel: Model<CustomerDocument>,
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

  async create(input: CreateCustomerInput) {
    const email = input.email.toLowerCase().trim();
    const exists = await this.customerModel.exists({ email });
    if (exists) throw new BadRequestException('Email already registered');

    return this.customerModel.create({
      email,
      passwordHash: input.passwordHash,
      firstName: input.firstName,
      lastName: input.lastName,
      phone: input.phone,
    });
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



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
}



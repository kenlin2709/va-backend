import { Body, Controller, ForbiddenException, Get, NotFoundException, Param, Patch, UseGuards } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { randomBytes } from 'crypto';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentCustomer, CurrentCustomer as CurrentCustomerDecorator } from '../auth/decorators/current-customer.decorator';
import { Customer, CustomerDocument } from './schemas/customer.schema';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { CustomersService } from './customers.service';

function sanitizeCustomer(c: any) {
  if (!c) return c;
  const { passwordHash, ...rest } = c;
  return rest;
}

@Controller('customers')
@UseGuards(JwtAuthGuard)
export class CustomersController {
  constructor(
    @InjectModel(Customer.name) private readonly customerModel: Model<CustomerDocument>,
    private readonly customers: CustomersService,
  ) {}

  private async assertAdmin(customerId: string): Promise<void> {
    const c = await this.customers.findById(customerId);
    if (!c.isAdmin) throw new ForbiddenException('Admin only');
  }

  @Get()
  async list(@CurrentCustomerDecorator() customer: CurrentCustomer) {
    await this.assertAdmin(customer.customerId);
    const docs = await this.customerModel.find().sort({ createdAt: -1 }).lean();
    return docs.map(sanitizeCustomer);
  }

  @Get(':id')
  async get(@CurrentCustomerDecorator() customer: CurrentCustomer, @Param('id') id: string) {
    await this.assertAdmin(customer.customerId);
    const doc = await this.customerModel.findById(id).lean();
    return sanitizeCustomer(doc);
  }

  @Patch(':id')
  async update(
    @CurrentCustomerDecorator() customer: CurrentCustomer,
    @Param('id') id: string,
    @Body() dto: UpdateCustomerDto,
  ) {
    await this.assertAdmin(customer.customerId);
    const existing = await this.customerModel.findById(id).lean();
    if (!existing) throw new NotFoundException('Customer not found');

    const update: any = { ...dto };
    if (update.email) update.email = String(update.email).trim().toLowerCase();
    if (update.referralProgramId) {
      update.referralProgramId = new Types.ObjectId(String(update.referralProgramId));
    }

    // If assigning a referral program and customer doesn't have a referral code yet, generate one.
    if (update.referralProgramId && !existing.referralCode) {
      let code = '';
      for (let attempt = 0; attempt < 5; attempt++) {
        code = randomBytes(4).toString('hex').toUpperCase();
        const exists = await this.customerModel.exists({ referralCode: code });
        if (!exists) break;
        if (attempt === 4) throw new Error('Failed to generate unique referral code');
      }
      update.referralCode = code;
    }

    const doc = await this.customerModel
      .findByIdAndUpdate(id, update, { new: true, runValidators: true })
      .lean();
    return sanitizeCustomer(doc);
  }
}



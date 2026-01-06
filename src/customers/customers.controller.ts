import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { AdminGuard } from '../auth/guards/admin.guard';
import { Customer, CustomerDocument } from './schemas/customer.schema';
import { UpdateCustomerDto } from './dto/update-customer.dto';

function sanitizeCustomer(c: any) {
  if (!c) return c;
  const { passwordHash, ...rest } = c;
  return rest;
}

@Controller('customers')
@UseGuards(AdminGuard)
export class CustomersController {
  constructor(@InjectModel(Customer.name) private readonly customerModel: Model<CustomerDocument>) {}

  @Get()
  async list() {
    const docs = await this.customerModel.find().sort({ createdAt: -1 }).lean();
    return docs.map(sanitizeCustomer);
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    const doc = await this.customerModel.findById(id).lean();
    return sanitizeCustomer(doc);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateCustomerDto) {
    const update: any = { ...dto };
    if (update.email) update.email = String(update.email).trim().toLowerCase();

    const doc = await this.customerModel
      .findByIdAndUpdate(id, update, { new: true, runValidators: true })
      .lean();
    return sanitizeCustomer(doc);
  }
}



import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  CurrentCustomer,
  CurrentCustomer as CurrentCustomerDecorator,
} from '../auth/decorators/current-customer.decorator';
import { CustomersService } from '../customers/customers.service';
import { CouponsService } from './coupons.service';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';

@Controller('coupons')
@UseGuards(JwtAuthGuard)
export class CouponsController {
  constructor(
    private readonly coupons: CouponsService,
    private readonly customers: CustomersService,
  ) {}

  private async assertAdmin(customerId: string): Promise<void> {
    const c = await this.customers.findById(customerId);
    if (!c.isAdmin) throw new ForbiddenException('Admin only');
  }

  // Customer: Get my available coupons
  @Get('my')
  async listMyCoupons(@CurrentCustomerDecorator() customer: CurrentCustomer) {
    return this.coupons.listByCustomer(customer.customerId);
  }

  // Customer: Validate a coupon code
  @Get('validate/:code')
  async validateCoupon(
    @CurrentCustomerDecorator() customer: CurrentCustomer,
    @Param('code') code: string,
  ) {
    const coupon = await this.coupons.validateCoupon(code, customer.customerId);
    return {
      code: coupon.code,
      value: coupon.value,
      description: coupon.description,
    };
  }

  // Admin: List all coupons
  @Get()
  async listAll(@CurrentCustomerDecorator() customer: CurrentCustomer) {
    await this.assertAdmin(customer.customerId);
    return this.coupons.listAll();
  }

  // Admin: Create a coupon for a customer
  @Post()
  async create(
    @CurrentCustomerDecorator() customer: CurrentCustomer,
    @Body() dto: CreateCouponDto,
  ) {
    await this.assertAdmin(customer.customerId);
    return this.coupons.create(dto);
  }

  // Admin: Get coupon by ID
  @Get(':id')
  async getById(
    @CurrentCustomerDecorator() customer: CurrentCustomer,
    @Param('id') id: string,
  ) {
    await this.assertAdmin(customer.customerId);
    return this.coupons.getById(id);
  }

  // Admin: Update a coupon
  @Patch(':id')
  async update(
    @CurrentCustomerDecorator() customer: CurrentCustomer,
    @Param('id') id: string,
    @Body() dto: UpdateCouponDto,
  ) {
    await this.assertAdmin(customer.customerId);
    return this.coupons.update(id, dto);
  }

  // Admin: Delete a coupon
  @Delete(':id')
  async delete(
    @CurrentCustomerDecorator() customer: CurrentCustomer,
    @Param('id') id: string,
  ) {
    await this.assertAdmin(customer.customerId);
    await this.coupons.delete(id);
    return { success: true };
  }
}

import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';

import { OrdersService } from './orders.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentCustomer, CurrentCustomer as CurrentCustomerDecorator } from '../auth/decorators/current-customer.decorator';
import { CreateOrderDto } from './dto/create-order.dto';
import { CustomersService } from '../customers/customers.service';
import { ReferralsService } from '../referrals/referrals.service';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { UpdateOrderShipmentDto } from './dto/update-order-shipment.dto';

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(
    private readonly orders: OrdersService,
    private readonly customers: CustomersService,
    private readonly referrals: ReferralsService,
  ) {}

  @Get()
  async listAll(@CurrentCustomerDecorator() customer: CurrentCustomer) {
    const c = await this.customers.findById(customer.customerId);
    if (!c.isAdmin) throw new ForbiddenException('Admin only');
    return this.orders.listAll();
  }

  @Get('sales')
  async getSalesAnalytics(@CurrentCustomerDecorator() customer: CurrentCustomer) {
    const c = await this.customers.findById(customer.customerId);
    if (!c.isAdmin) throw new ForbiddenException('Admin only');
    return this.orders.getSalesAnalytics();
  }

  @Get('dashboard')
  async getDashboardStats(@CurrentCustomerDecorator() customer: CurrentCustomer) {
    const c = await this.customers.findById(customer.customerId);
    if (!c.isAdmin) throw new ForbiddenException('Admin only');
    return this.orders.getDashboardStats();
  }

  @Get('referral/:code')
  async listByReferral(
    @CurrentCustomerDecorator() customer: CurrentCustomer,
    @Param('code') code: string,
  ) {
    const c = await this.customers.findById(customer.customerId);
    if (!c.isAdmin) throw new ForbiddenException('Admin only');
    return this.orders.listByReferralCode(code);
  }

  @Get('validate-referral/:code')
  async validateReferral(@Param('code') code: string) {
    if (!code?.trim()) {
      throw new BadRequestException('Referral code is required');
    }

    const normalizedCode = code.trim().toUpperCase();
    const owner = await this.customers.findByReferralCode(normalizedCode);

    if (!owner) {
      throw new BadRequestException('Invalid referral code');
    }

    if (!owner.referralProgramId) {
      throw new BadRequestException('Invalid referral code');
    }

    const program = await this.referrals.getActiveById(owner.referralProgramId);
    if (!program) {
      throw new BadRequestException('Invalid referral code');
    }

    return {
      code: normalizedCode,
      discountType: program.discountType,
      discountValue: program.discountValue,
      programName: program.name,
    };
  }

  @Post()
  create(@CurrentCustomerDecorator() customer: CurrentCustomer, @Body() dto: CreateOrderDto) {
    return this.orders.create(customer.customerId, dto);
  }

  @Patch(':id/status')
  async updateStatus(
    @CurrentCustomerDecorator() customer: CurrentCustomer,
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    const c = await this.customers.findById(customer.customerId);
    if (!c.isAdmin) throw new ForbiddenException('Admin only');
    return this.orders.updateStatus(id, dto.status);
  }

  @Patch(':id/shipment')
  async updateShipment(
    @CurrentCustomerDecorator() customer: CurrentCustomer,
    @Param('id') id: string,
    @Body() dto: UpdateOrderShipmentDto,
  ) {
    const c = await this.customers.findById(customer.customerId);
    if (!c.isAdmin) throw new ForbiddenException('Admin only');
    return this.orders.updateShipment(id, {
      shippingCarrier: dto.shippingCarrier,
      trackingNumber: dto.trackingNumber,
    });
  }

  @Get('my')
  listMine(@CurrentCustomerDecorator() customer: CurrentCustomer) {
    return this.orders.listMine(customer.customerId);
  }

  @Get('my/:id')
  getMine(@CurrentCustomerDecorator() customer: CurrentCustomer, @Param('id') id: string) {
    return this.orders.getMine(customer.customerId, id);
  }

  @Patch('my/:id/cancel')
  cancelMine(@CurrentCustomerDecorator() customer: CurrentCustomer, @Param('id') id: string) {
    return this.orders.cancelMine(customer.customerId, id);
  }
}



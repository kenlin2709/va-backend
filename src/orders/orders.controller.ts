import { Body, Controller, ForbiddenException, Get, Param, Post, UseGuards } from '@nestjs/common';

import { OrdersService } from './orders.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentCustomer, CurrentCustomer as CurrentCustomerDecorator } from '../auth/decorators/current-customer.decorator';
import { CreateOrderDto } from './dto/create-order.dto';
import { CustomersService } from '../customers/customers.service';

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(
    private readonly orders: OrdersService,
    private readonly customers: CustomersService,
  ) {}

  @Get()
  async listAll(@CurrentCustomerDecorator() customer: CurrentCustomer) {
    const c = await this.customers.findById(customer.customerId);
    if (!c.isAdmin) throw new ForbiddenException('Admin only');
    return this.orders.listAll();
  }

  @Post()
  create(@CurrentCustomerDecorator() customer: CurrentCustomer, @Body() dto: CreateOrderDto) {
    return this.orders.create(customer.customerId, dto);
  }

  @Get('my')
  listMine(@CurrentCustomerDecorator() customer: CurrentCustomer) {
    return this.orders.listMine(customer.customerId);
  }

  @Get('my/:id')
  getMine(@CurrentCustomerDecorator() customer: CurrentCustomer, @Param('id') id: string) {
    return this.orders.getMine(customer.customerId, id);
  }
}



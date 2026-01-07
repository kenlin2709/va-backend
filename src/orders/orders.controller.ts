import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';

import { OrdersService } from './orders.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { CurrentCustomer, CurrentCustomer as CurrentCustomerDecorator } from '../auth/decorators/current-customer.decorator';
import { CreateOrderDto } from './dto/create-order.dto';

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Get()
  @UseGuards(AdminGuard)
  listAll() {
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



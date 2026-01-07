import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';

import { OrdersService } from './orders.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentCustomer, CurrentCustomer as CurrentCustomerDecorator } from '../auth/decorators/current-customer.decorator';
import { CreateOrderDto } from './dto/create-order.dto';
import { CustomersService } from '../customers/customers.service';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { UpdateOrderShipmentDto } from './dto/update-order-shipment.dto';

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
}



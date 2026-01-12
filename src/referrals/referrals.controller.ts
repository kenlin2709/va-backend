import { Body, Controller, ForbiddenException, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentCustomer, CurrentCustomer as CurrentCustomerDecorator } from '../auth/decorators/current-customer.decorator';
import { CustomersService } from '../customers/customers.service';
import { ReferralsService } from './referrals.service';
import { CreateReferralDto } from './dto/create-referral.dto';
import { UpdateReferralDto } from './dto/update-referral.dto';

@Controller('referrals')
@UseGuards(JwtAuthGuard)
export class ReferralsController {
  constructor(
    private readonly referrals: ReferralsService,
    private readonly customers: CustomersService,
  ) {}

  private async assertAdmin(customerId: string): Promise<void> {
    const c = await this.customers.findById(customerId);
    if (!c.isAdmin) throw new ForbiddenException('Admin only');
  }

  @Get()
  async list(@CurrentCustomerDecorator() customer: CurrentCustomer) {
    await this.assertAdmin(customer.customerId);
    return this.referrals.list();
  }

  @Post()
  async create(@CurrentCustomerDecorator() customer: CurrentCustomer, @Body() dto: CreateReferralDto) {
    await this.assertAdmin(customer.customerId);
    return this.referrals.create(dto);
  }

  @Get(':id')
  async get(@CurrentCustomerDecorator() customer: CurrentCustomer, @Param('id') id: string) {
    await this.assertAdmin(customer.customerId);
    return this.referrals.get(id);
  }

  @Patch(':id')
  async update(
    @CurrentCustomerDecorator() customer: CurrentCustomer,
    @Param('id') id: string,
    @Body() dto: UpdateReferralDto,
  ) {
    await this.assertAdmin(customer.customerId);
    return this.referrals.update(id, dto);
  }
}



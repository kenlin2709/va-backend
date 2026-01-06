import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { Customer, CustomerSchema } from './schemas/customer.schema';
import { CustomersService } from './customers.service';

@Module({
  imports: [MongooseModule.forFeature([{ name: Customer.name, schema: CustomerSchema }])],
  providers: [CustomersService],
  exports: [CustomersService, MongooseModule],
})
export class CustomersModule {}



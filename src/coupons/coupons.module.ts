import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { Coupon, CouponSchema } from './schemas/coupon.schema';
import { CouponsService } from './coupons.service';
import { CouponsController } from './coupons.controller';
import { AuthModule } from '../auth/auth.module';
import { CustomersModule } from '../customers/customers.module';

@Module({
  imports: [
    forwardRef(() => AuthModule),
    forwardRef(() => CustomersModule),
    MongooseModule.forFeature([{ name: Coupon.name, schema: CouponSchema }]),
  ],
  providers: [CouponsService],
  controllers: [CouponsController],
  exports: [MongooseModule, CouponsService],
})
export class CouponsModule {}

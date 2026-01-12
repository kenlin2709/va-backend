import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { Referral, ReferralSchema } from './schemas/referral.schema';
import { ReferralsService } from './referrals.service';
import { ReferralsController } from './referrals.controller';
import { AuthModule } from '../auth/auth.module';
import { CustomersModule } from '../customers/customers.module';

@Module({
  imports: [AuthModule, CustomersModule, MongooseModule.forFeature([{ name: Referral.name, schema: ReferralSchema }])],
  providers: [ReferralsService],
  controllers: [ReferralsController],
  exports: [MongooseModule, ReferralsService],
})
export class ReferralsModule {}



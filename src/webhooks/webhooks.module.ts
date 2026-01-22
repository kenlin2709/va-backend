import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { WebhooksController } from './webhooks.controller';
import { EmailModule } from '../email/email.module';
import { Order, OrderSchema } from '../orders/schemas/order.schema';

@Module({
  imports: [
    EmailModule,
    MongooseModule.forFeature([{ name: Order.name, schema: OrderSchema }]),
  ],
  controllers: [WebhooksController],
})
export class WebhooksModule {}

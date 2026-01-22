import {
  Controller,
  Post,
  Body,
  Headers,
  Logger,
  UnauthorizedException,
  Req,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Receiver } from '@upstash/qstash';
import { Request } from 'express';
import { EmailService } from '../email/email.service';
import { Order, OrderDocument } from '../orders/schemas/order.schema';
import type { ScheduleEmailPayload } from '../qstash/qstash.service';

@Controller('webhooks')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);
  private receiver: Receiver | null = null;

  constructor(
    private configService: ConfigService,
    private emailService: EmailService,
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
  ) {
    const currentSigningKey = this.configService.get<string>('QSTASH_CURRENT_SIGNING_KEY');
    const nextSigningKey = this.configService.get<string>('QSTASH_NEXT_SIGNING_KEY');

    if (currentSigningKey && nextSigningKey) {
      this.receiver = new Receiver({
        currentSigningKey,
        nextSigningKey,
      });
      this.logger.log('QStash webhook receiver initialized');
    } else {
      this.logger.warn('QStash signing keys not configured - webhook verification disabled');
    }
  }

  @Post('qstash/email')
  async handleQstashEmail(
    @Req() req: RawBodyRequest<Request>,
    @Headers('upstash-signature') signature: string,
    @Body() payload: ScheduleEmailPayload,
  ) {
    // Verify the request is from QStash
    if (this.receiver) {
      try {
        const rawBody = req.rawBody?.toString() || JSON.stringify(payload);
        const isValid = await this.receiver.verify({
          signature,
          body: rawBody,
        });

        if (!isValid) {
          this.logger.warn('Invalid QStash signature');
          throw new UnauthorizedException('Invalid signature');
        }
      } catch (error: any) {
        this.logger.error(`QStash signature verification failed: ${error.message}`);
        throw new UnauthorizedException('Invalid signature');
      }
    }

    this.logger.log(`Received QStash webhook: ${payload.type} for order ${payload.orderDetails.id}`);

    if (payload.type === 'payment_reminder') {
      // Check if order is still pending before sending reminder
      const order = await this.orderModel.findOne({ orderId: payload.orderDetails.id }).lean();

      if (!order) {
        this.logger.warn(`Order ${payload.orderDetails.id} not found, skipping reminder`);
        return { success: true, skipped: true, reason: 'order_not_found' };
      }

      if (order.status !== 'pending') {
        this.logger.log(
          `Order ${payload.orderDetails.id} is already ${order.status}, skipping reminder #${payload.orderDetails.reminderNumber}`,
        );
        return { success: true, skipped: true, reason: 'order_not_pending' };
      }

      try {
        await this.emailService.sendPaymentReminderEmail(payload.email, payload.orderDetails);
        this.logger.log(
          `Payment reminder #${payload.orderDetails.reminderNumber} sent for order ${payload.orderDetails.id}`,
        );
        return { success: true };
      } catch (error: any) {
        this.logger.error(`Failed to send payment reminder: ${error.message}`);
        // Return 500 so QStash will retry
        throw error;
      }
    }

    return { success: true };
  }
}

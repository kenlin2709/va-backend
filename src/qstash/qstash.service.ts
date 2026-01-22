import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from '@upstash/qstash';

export interface ScheduleEmailPayload {
  type: 'payment_reminder';
  email: string;
  orderDetails: {
    id: string;
    total: number;
    subtotal: number;
    couponDiscount: number;
    customerName: string;
    items: Array<{ name: string; quantity: number; price: number }>;
    reminderNumber: number;
  };
}

@Injectable()
export class QstashService {
  private readonly logger = new Logger(QstashService.name);
  private client: Client | null = null;

  constructor(private configService: ConfigService) {
    const token = this.configService.get<string>('QSTASH_TOKEN');
    if (token) {
      this.client = new Client({ token });
      this.logger.log('QStash client initialized');
    } else {
      this.logger.warn('QSTASH_TOKEN not configured - scheduled emails will not work');
    }
  }

  async scheduleEmail(payload: ScheduleEmailPayload, delaySeconds: number): Promise<void> {
    if (!this.client) {
      this.logger.warn('QStash not configured, skipping scheduled email');
      return;
    }

    const baseUrl = this.configService.get<string>('APP_BASE_URL');
    if (!baseUrl) {
      this.logger.error('APP_BASE_URL not configured, cannot schedule email');
      return;
    }

    const webhookUrl = `${baseUrl}/webhooks/qstash/email`;

    try {
      await this.client.publishJSON({
        url: webhookUrl,
        body: payload,
        delay: delaySeconds,
      });

      this.logger.log(
        `Scheduled payment reminder #${payload.orderDetails.reminderNumber} for order ${payload.orderDetails.id} in ${delaySeconds}s`,
      );
    } catch (error: any) {
      this.logger.error(`Failed to schedule email via QStash: ${error.message}`);
      throw error;
    }
  }
}

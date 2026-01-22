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
  private isLocalDev = false;

  constructor(private configService: ConfigService) {
    const token = this.configService.get<string>('QSTASH_TOKEN');
    const baseUrl = this.configService.get<string>('APP_BASE_URL') || '';

    // Detect local development (localhost URLs can't be reached by QStash)
    this.isLocalDev = baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1');

    if (token && !this.isLocalDev) {
      this.client = new Client({ token });
      this.logger.log('QStash client initialized');
    } else if (this.isLocalDev) {
      this.logger.warn('Local development detected - QStash scheduling disabled (emails will be skipped)');
    } else {
      this.logger.warn('QSTASH_TOKEN not configured - scheduled emails will not work');
    }
  }

  /**
   * Schedule an email to be sent after a delay.
   * Returns the QStash message ID (for cancellation), or null if in local dev mode.
   */
  async scheduleEmail(payload: ScheduleEmailPayload, delaySeconds: number): Promise<string | null> {
    // Skip in local development
    if (this.isLocalDev) {
      this.logger.log(
        `[Local Dev] Would schedule reminder #${payload.orderDetails.reminderNumber} for order ${payload.orderDetails.id} in ${delaySeconds}s`,
      );
      return null;
    }

    if (!this.client) {
      this.logger.warn('QStash not configured, skipping scheduled email');
      return null;
    }

    const baseUrl = this.configService.get<string>('APP_BASE_URL');
    if (!baseUrl) {
      this.logger.error('APP_BASE_URL not configured, cannot schedule email');
      return null;
    }

    const webhookUrl = `${baseUrl}/webhooks/qstash/email`;

    try {
      const result = await this.client.publishJSON({
        url: webhookUrl,
        body: payload,
        delay: delaySeconds,
      });

      this.logger.log(
        `Scheduled payment reminder #${payload.orderDetails.reminderNumber} for order ${payload.orderDetails.id} in ${delaySeconds}s (messageId: ${result.messageId})`,
      );

      return result.messageId;
    } catch (error: any) {
      this.logger.error(`Failed to schedule email via QStash: ${error.message}`);
      throw error;
    }
  }

  /**
   * Cancel scheduled messages by their IDs.
   */
  async cancelMessages(messageIds: string[]): Promise<void> {
    if (!this.client || this.isLocalDev || !messageIds.length) {
      return;
    }

    for (const messageId of messageIds) {
      try {
        await this.client.messages.delete(messageId);
        this.logger.log(`Cancelled QStash message: ${messageId}`);
      } catch (error: any) {
        // Message may have already been delivered or expired - that's okay
        this.logger.warn(`Failed to cancel QStash message ${messageId}: ${error.message}`);
      }
    }
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly emailJSUrl = 'https://api.emailjs.com/api/v1.0/email/send';

  constructor(private configService: ConfigService) {
    const serviceId = this.configService.get<string>('EMAILJS_SERVICE_ID');
    const publicKey = this.configService.get<string>('EMAILJS_PUBLIC_KEY');

    if (serviceId && publicKey) {
      this.logger.log('EmailJS initialized successfully');
    } else {
      this.logger.warn(
        'EMAILJS_SERVICE_ID or EMAILJS_PUBLIC_KEY not configured',
      );
    }
  }

  async sendOrderConfirmationEmail(
    to: string,
    orderDetails: {
      id: string;
      total: number;
      items: Array<{ name: string; quantity: number; price: number }>;
      customerName: string;
      customerEmail: string;
      customerPhone?: string;
      shippingAddress?: {
        address1: string;
        address2?: string;
        city: string;
        state: string;
        postcode: string;
        country: string;
      };
      subtotal: number;
      discount: number;
      shipping: number;
    },
  ): Promise<void> {
    try {
    console.log('sendOrderConfirmationEmail', to, orderDetails);
      const serviceId = this.configService.get<string>('EMAILJS_SERVICE_ID');
      const publicKey = this.configService.get<string>('EMAILJS_PUBLIC_KEY');

      if (!serviceId || !publicKey) {
        this.logger.warn('EmailJS not configured, skipping email send');
        return;
      }

      // Split customer name
      const nameParts = orderDetails.customerName.split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      const itemsHtml = orderDetails.items
        .map((item, index) => {
          const isLast = index === orderDetails.items.length - 1;
          const border = isLast ? 'border-bottom:0;' : 'border-bottom:1px solid #e5e7eb;';

          return `
      <tr>
        <td valign="top" style="padding:14px 14px;${border}vertical-align:top;">
          <div style="font-size:14px;color:#111827;font-weight:600;line-height:1.25;">
            ${escapeHtml(item.name)}
          </div>
          <div style="margin-top:4px;font-size:12px;color:#6b7280;line-height:1.25;">
            Quantity: ${item.quantity}
          </div>
        </td>

        <td valign="top" align="right"
            style="padding:14px 14px;${border}vertical-align:top;
                  font-size:14px;color:#111827;font-weight:600;white-space:nowrap;">
          $${item.price.toFixed(2)}
        </td>
      </tr>`;
        })
        .join('');

      // Get current date
      const orderDate = new Date().toLocaleDateString('en-AU', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      const templateParams = {
        to_email: to,
        first_name: firstName,
        last_name: lastName,
        order_number: orderDetails.id,
        order_date: orderDate,
        currency: 'AUD',
        total: orderDetails.total.toFixed(2),
        subtotal: orderDetails.subtotal.toFixed(2),
        discount: orderDetails.discount.toFixed(2),
        shipping: orderDetails.shipping.toFixed(2),
        item_count: orderDetails.items.reduce(
          (sum, item) => sum + item.quantity,
          0,
        ),
        items_html: itemsHtml,
        customer_email: orderDetails.customerEmail,
        customer_phone: orderDetails.customerPhone || '',
        address1: orderDetails.shippingAddress?.address1 || '',
        address2: orderDetails.shippingAddress?.address2 || '',
        city: orderDetails.shippingAddress?.city || '',
        state: orderDetails.shippingAddress?.state || '',
        postcode: orderDetails.shippingAddress?.postcode || '',
        country: orderDetails.shippingAddress?.country || 'Australia',
        refund_policy_url: 'https://va-ecru.vercel.app/refund-policy',
        shipping_policy_url: '#',
        privacy_policy_url: '#',
        terms_url: '#',
        year: new Date().getFullYear().toString(),
        subject: `Order Confirmation - Order #${orderDetails.id}`
      };

      this.logger.log(
        `Sending order confirmation email to ${to} for order ${orderDetails.id}`,
      );

      const response = await fetch(this.emailJSUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          service_id: serviceId,
          template_id: this.configService.get<string>('EMAILJS_TEMPLATE_ID') || 'template_order_confirmation',
          accessToken: this.configService.get<string>('EMAILJS_ACCESS_TOKEN') || '',
          user_id: publicKey,
          template_params: templateParams,
        }),
      });

      if (response.ok) {
        const responseData = await response.text();
        if (responseData === 'OK') {
          this.logger.log(
            `Order confirmation email sent successfully to ${to}`,
          );
        } else {
          throw new Error(`EmailJS returned unexpected response: ${responseData}`);
        }
      } else {
        throw new Error(`EmailJS returned status ${response.status}`);
      }
    } catch (error: any) {
      this.logger.error(
        `Failed to send order confirmation email to ${to}:`,
        error.message,
      );
      // Don't throw error - we don't want email failures to break checkout
    }
  }
}
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
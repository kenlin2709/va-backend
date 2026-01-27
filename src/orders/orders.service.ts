import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { randomBytes } from 'crypto';

import { Order, OrderDocument } from './schemas/order.schema';
import { CreateOrderDto } from './dto/create-order.dto';
import { Product, ProductDocument } from '../products/schemas/product.schema';
import { Category, CategoryDocument } from '../categories/schemas/category.schema';
import type { OrderStatus } from './schemas/order.schema';
import { CustomersService } from '../customers/customers.service';
import { ReferralsService } from '../referrals/referrals.service';
import { EmailService } from '../email/email.service';
import { CouponsService } from '../coupons/coupons.service';
import { QstashService } from '../qstash/qstash.service';

@Injectable()
export class OrdersService {
  constructor(
    @InjectModel(Order.name)
    private readonly orderModel: Model<OrderDocument>,
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
    @InjectModel(Category.name)
    private readonly categoryModel: Model<CategoryDocument>,
    private readonly customers: CustomersService,
    private readonly referrals: ReferralsService,
    private readonly emailService: EmailService,
    private readonly couponsService: CouponsService,
    private readonly qstashService: QstashService,
  ) {}

  async create(customerId: string, dto: CreateOrderDto) {
    if (!dto.items?.length) {
      throw new BadRequestException('Order must include at least 1 item');
    }

    // merge duplicates
    const qtyByProductId = new Map<string, number>();
    for (const i of dto.items) {
      const pid = String(i.productId);
      qtyByProductId.set(pid, (qtyByProductId.get(pid) ?? 0) + Number(i.qty));
    }

    const productIds = [...qtyByProductId.keys()].map(
      (id) => new Types.ObjectId(id),
    );
    const products = await this.productModel
      .find({ _id: { $in: productIds } })
      .lean();

    if (products.length !== productIds.length) {
      throw new BadRequestException('One or more products do not exist');
    }

    const items = products.map((p) => {
      const qty = qtyByProductId.get(String(p._id)) ?? 0;
      if (qty <= 0) throw new BadRequestException('Invalid qty');
      if ((p.stockQty ?? 0) < qty) {
        throw new BadRequestException(`Not enough stock for ${p.name}`);
      }
      return {
        productId: p._id,
        name: p.name,
        price: p.price,
        qty,
        imageUrl: p.productImageUrl,
      };
    });

    const subtotal = items.reduce((sum, it) => sum + it.price * it.qty, 0);

    let discountAmount = 0;
    let referralCodeUsed: string | undefined;
    let referralOwnerCustomerId: Types.ObjectId | undefined;
    let referralProgramId: Types.ObjectId | undefined;
    let referralDiscountType: 'percent' | 'amount' | undefined;
    let referralDiscountValue: number | undefined;

    const rawCode = String(dto.referralCode ?? '').trim();
    if (rawCode) {
      const code = rawCode.toUpperCase();
      const owner = await this.customers.findByReferralCode(code);
      if (!owner) throw new BadRequestException('Invalid referral code');
      if (!owner.referralProgramId) throw new BadRequestException('Invalid referral code');

      const program = await this.referrals.getActiveById(owner.referralProgramId);
      if (!program) throw new BadRequestException('Invalid referral code');

      referralCodeUsed = code;
      referralOwnerCustomerId = new Types.ObjectId(String(owner._id));
      referralProgramId = owner.referralProgramId;
      referralDiscountType = program.discountType;
      referralDiscountValue = program.discountValue;

      if (program.discountType === 'percent') {
        const pct = Math.max(0, Math.min(100, Number(program.discountValue)));
        discountAmount = (subtotal * pct) / 100;
      } else {
        discountAmount = Math.max(0, Number(program.discountValue));
      }
      discountAmount = Math.min(subtotal, Math.round(discountAmount * 100) / 100);
    }

    // Coupon discounts (up to 3)
    const couponCodesUsed: string[] = [];
    const couponIds: Types.ObjectId[] = [];
    const couponDiscountValues: number[] = [];
    let totalCouponDiscount = 0;

    const couponCodes = (dto.couponCodes ?? []).slice(0, 3); // Limit to 3 coupons
    for (const rawCode of couponCodes) {
      const code = String(rawCode ?? '').trim();
      if (!code) continue;

      const coupon = await this.couponsService.validateCoupon(code, customerId);

      couponCodesUsed.push(coupon.code);
      couponIds.push(new Types.ObjectId(String(coupon._id)));
      couponDiscountValues.push(coupon.value);

      // Add coupon discount (fixed amount)
      const remaining = subtotal - discountAmount;
      const thisDiscount = Math.min(remaining, coupon.value);
      totalCouponDiscount += thisDiscount;
      discountAmount += thisDiscount;
      discountAmount = Math.round(discountAmount * 100) / 100;
    }

    const total = Math.max(0, Math.round((subtotal - discountAmount) * 100) / 100);

    // Generate an 8-hex public order id (retry on extremely rare collisions)
    let orderId = '';
    for (let attempt = 0; attempt < 5; attempt++) {
      orderId = randomBytes(4).toString('hex'); // 8 chars
      const exists = await this.orderModel.exists({ orderId });
      if (!exists) break;
      if (attempt === 4) {
        throw new BadRequestException('Failed to generate unique order id');
      }
    }

    // Decrement stock (best-effort, not transactional for MVP)
    for (const it of items) {
      const res = await this.productModel.updateOne(
        { _id: it.productId, stockQty: { $gte: it.qty } },
        { $inc: { stockQty: -it.qty } },
      );
      if (res.modifiedCount !== 1) {
        throw new BadRequestException(`Not enough stock for ${it.name}`);
      }
    }

    const order = await this.orderModel.create({
      orderId,
      customerId: new Types.ObjectId(customerId),
      items,
      subtotal,
      discountAmount,
      total,
      status: 'pending',
      shippingName: dto.shippingName,
      shippingAddress1: dto.shippingAddress1,
      shippingCity: dto.shippingCity,
      shippingState: dto.shippingState,
      shippingPostcode: dto.shippingPostcode,
      referralCodeUsed,
      referralOwnerCustomerId,
      referralProgramId,
      referralDiscountType,
      referralDiscountValue,
      couponCodesUsed,
      couponIds,
      couponDiscountValues,
      totalCouponDiscount,
    });
    console.log('order created', order);

    // Mark all coupons as used
    for (const cId of couponIds) {
      await this.couponsService.markAsUsed(cId, order._id as Types.ObjectId);
    }

    // Send payment reminder emails (instant, 1 min, 2 min)
    this.sendPaymentReminderEmails(
      order._id as Types.ObjectId,
      customerId,
      orderId,
      total,
      subtotal,
      totalCouponDiscount,
      items,
    ).catch((error) => {
      console.error('Failed to send payment reminder emails:', error);
    });

    return order;
  }

  private async sendPaymentReminderEmails(
    mongoId: Types.ObjectId,
    customerId: string,
    orderId: string,
    total: number,
    subtotal: number,
    couponDiscount: number,
    items: Array<{ name: string; qty: number; price: number }>,
  ): Promise<void> {
    const customer = await this.customers.findById(customerId);
    if (!customer?.email) return;

    const customerName =
      `${customer.firstName} ${customer.lastName}`.trim() || 'Valued Customer';

    const emailData = {
      id: orderId,
      total,
      subtotal,
      couponDiscount,
      customerName,
      items: items.map((item) => ({
        name: item.name,
        quantity: item.qty,
        price: item.price,
      })),
    };

    // Send first email immediately
    void this.emailService.sendPaymentReminderEmail(customer.email, {
      ...emailData,
      reminderNumber: 1,
    });

    // Schedule second and third emails via QStash and collect message IDs
    const qstashMessageIds: string[] = [];

    const messageId2 = await this.qstashService.scheduleEmail(
      {
        type: 'payment_reminder',
        email: customer.email,
        orderDetails: { ...emailData, reminderNumber: 2 },
      },
      60, // 1 minute in seconds
    );
    if (messageId2) qstashMessageIds.push(messageId2);

    const messageId3 = await this.qstashService.scheduleEmail(
      {
        type: 'payment_reminder',
        email: customer.email,
        orderDetails: { ...emailData, reminderNumber: 3 },
      },
      120, // 2 minutes in seconds
    );
    if (messageId3) qstashMessageIds.push(messageId3);

    // Store message IDs in the order for later cancellation
    if (qstashMessageIds.length > 0) {
      await this.orderModel.updateOne(
        { _id: mongoId },
        { $set: { qstashMessageIds } },
      );
    }
  }

  async listMine(customerId: string) {
    return this.orderModel
      .find({ customerId: new Types.ObjectId(customerId) })
      .sort({ createdAt: -1 })
      .lean();
  }

  async getMine(customerId: string, orderId: string) {
    const doc = await this.orderModel
      .findOne({
        _id: new Types.ObjectId(orderId),
        customerId: new Types.ObjectId(customerId),
      })
      .lean();
    if (!doc) throw new NotFoundException('Order not found');
    return doc;
  }

  async cancelMine(customerId: string, orderId: string) {
    const _id = new Types.ObjectId(orderId);
    const order = await this.orderModel
      .findOne({
        _id,
        customerId: new Types.ObjectId(customerId),
      })
      .lean();

    if (!order) throw new NotFoundException('Order not found');

    if (order.status !== 'pending') {
      throw new BadRequestException('Only pending orders can be canceled');
    }

    await this.orderModel.updateOne({ _id }, { $set: { status: 'canceled' } });

    // Cancel scheduled email reminders
    if (order.qstashMessageIds?.length) {
      await this.qstashService.cancelMessages(order.qstashMessageIds);
      await this.orderModel.updateOne({ _id }, { $set: { qstashMessageIds: [] } });
    }

    // Restore stock for canceled items
    for (const item of order.items) {
      await this.productModel.updateOne(
        { _id: item.productId },
        { $inc: { stockQty: item.qty } },
      );
    }

    return this.orderModel.findById(_id).lean();
  }

  async listAll() {
    return this.orderModel
      .aggregate([
        { $sort: { createdAt: -1 } },
        {
          $lookup: {
            from: 'customers',
            localField: 'customerId',
            foreignField: '_id',
            as: 'customer',
          },
        },
        { $unwind: { path: '$customer', preserveNullAndEmptyArrays: true } },
        {
          $addFields: {
            customerEmail: '$customer.email',
            customerInfo: {
              _id: '$customer._id',
              email: '$customer.email',
              firstName: '$customer.firstName',
              lastName: '$customer.lastName',
              phone: '$customer.phone',
              shippingAddress: '$customer.shippingAddress',
            },
          },
        },
        { $project: { customer: 0 } },
      ])
      .exec();
  }

  async listByReferralCode(code: string) {
    const normalized = String(code ?? '').trim().toUpperCase();
    if (!normalized) return [];
    return this.orderModel
      .find({ referralCodeUsed: normalized })
      .sort({ createdAt: -1 })
      .lean();
  }

  private async getEnrichedById(_id: Types.ObjectId): Promise<unknown> {
    const docs = (await this.orderModel
      .aggregate([
        { $match: { _id } },
        {
          $lookup: {
            from: 'customers',
            localField: 'customerId',
            foreignField: '_id',
            as: 'customer',
          },
        },
        { $unwind: { path: '$customer', preserveNullAndEmptyArrays: true } },
        {
          $addFields: {
            customerEmail: '$customer.email',
            customerInfo: {
              _id: '$customer._id',
              email: '$customer.email',
              firstName: '$customer.firstName',
              lastName: '$customer.lastName',
              phone: '$customer.phone',
              shippingAddress: '$customer.shippingAddress',
            },
          },
        },
        { $project: { customer: 0 } },
      ])
      .exec()) as unknown[];

    return docs?.[0];
  }

  async updateStatus(id: string, status: OrderStatus): Promise<unknown> {
    const _id = new Types.ObjectId(id);

    const order = await this.orderModel.findById(_id).lean();
    if (!order) throw new NotFoundException('Order not found');

    await this.orderModel.updateOne({ _id }, { $set: { status } });

    // Cancel scheduled email reminders if order is paid or shipped
    if (
      (status === 'paid' || status === 'shipped') &&
      order.qstashMessageIds?.length
    ) {
      await this.qstashService.cancelMessages(order.qstashMessageIds);
      // Clear the message IDs from the order
      await this.orderModel.updateOne(
        { _id },
        { $set: { qstashMessageIds: [] } },
      );
    }

    const doc = await this.getEnrichedById(_id);
    if (!doc) throw new NotFoundException('Order not found');
    return doc;
  }

  async getSalesAnalytics() {
    // Monthly sales aggregation
    const monthlyStats = await this.orderModel.aggregate([
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
          },
          totalSalesValue: {
            $sum: {
              $cond: [{ $in: ['$status', ['paid', 'shipped']] }, '$subtotal', 0],
            },
          },
          totalCouponUsed: {
            $sum: {
              $cond: [
                { $in: ['$status', ['paid', 'shipped']] },
                { $ifNull: ['$totalCouponDiscount', 0] },
                0,
              ],
            },
          },
          totalMoneyReceived: {
            $sum: {
              $cond: [{ $in: ['$status', ['paid', 'shipped']] }, '$total', 0],
            },
          },
          canceledValue: {
            $sum: {
              $cond: [{ $eq: ['$status', 'canceled'] }, '$total', 0],
            },
          },
          refundValue: {
            $sum: {
              $cond: [{ $eq: ['$status', 'refunded'] }, '$total', 0],
            },
          },
          orderCount: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': -1, '_id.month': -1 } },
      {
        $project: {
          _id: 0,
          year: '$_id.year',
          month: '$_id.month',
          totalSalesValue: { $round: ['$totalSalesValue', 2] },
          totalCouponUsed: { $round: ['$totalCouponUsed', 2] },
          totalMoneyReceived: { $round: ['$totalMoneyReceived', 2] },
          canceledValue: { $round: ['$canceledValue', 2] },
          refundValue: { $round: ['$refundValue', 2] },
          orderCount: 1,
        },
      },
    ]);

    // Category sales aggregation
    const categoryStats = await this.orderModel.aggregate([
      // Only include paid/shipped/canceled/refunded orders for category stats
      { $match: { status: { $in: ['paid', 'shipped', 'canceled', 'refunded'] } } },
      // Unwind order items
      { $unwind: '$items' },
      // Lookup product to get categoryIds
      {
        $lookup: {
          from: 'products',
          localField: 'items.productId',
          foreignField: '_id',
          as: 'product',
        },
      },
      { $unwind: { path: '$product', preserveNullAndEmptyArrays: true } },
      // Get categoryIds (use legacy categoryId if categoryIds is empty)
      {
        $addFields: {
          categoryIdList: {
            $cond: {
              if: { $gt: [{ $size: { $ifNull: ['$product.categoryIds', []] } }, 0] },
              then: '$product.categoryIds',
              else: {
                $cond: {
                  if: { $ne: ['$product.categoryId', null] },
                  then: ['$product.categoryId'],
                  else: [],
                },
              },
            },
          },
          itemTotal: { $multiply: ['$items.price', '$items.qty'] },
          itemCouponShare: {
            $multiply: [
              { $divide: [{ $multiply: ['$items.price', '$items.qty'] }, { $max: ['$subtotal', 1] }] },
              { $ifNull: ['$totalCouponDiscount', 0] },
            ],
          },
        },
      },
      // Unwind categoryIds to create a row per category
      { $unwind: { path: '$categoryIdList', preserveNullAndEmptyArrays: true } },
      // Lookup category name
      {
        $lookup: {
          from: 'categories',
          localField: 'categoryIdList',
          foreignField: '_id',
          as: 'category',
        },
      },
      { $unwind: { path: '$category', preserveNullAndEmptyArrays: true } },
      // Group by category
      {
        $group: {
          _id: {
            categoryId: '$categoryIdList',
            categoryName: { $ifNull: ['$category.name', 'Uncategorized'] },
          },
          totalSalesValue: {
            $sum: {
              $cond: [{ $in: ['$status', ['paid', 'shipped']] }, '$itemTotal', 0],
            },
          },
          totalCouponUsed: {
            $sum: {
              $cond: [{ $in: ['$status', ['paid', 'shipped']] }, '$itemCouponShare', 0],
            },
          },
          totalMoneyReceived: {
            $sum: {
              $cond: [
                { $in: ['$status', ['paid', 'shipped']] },
                { $subtract: ['$itemTotal', '$itemCouponShare'] },
                0,
              ],
            },
          },
          canceledValue: {
            $sum: {
              $cond: [{ $eq: ['$status', 'canceled'] }, '$itemTotal', 0],
            },
          },
          refundValue: {
            $sum: {
              $cond: [{ $eq: ['$status', 'refunded'] }, '$itemTotal', 0],
            },
          },
        },
      },
      { $sort: { totalSalesValue: -1 } },
      {
        $project: {
          _id: 0,
          categoryId: '$_id.categoryId',
          categoryName: '$_id.categoryName',
          totalSalesValue: { $round: ['$totalSalesValue', 2] },
          totalCouponUsed: { $round: ['$totalCouponUsed', 2] },
          totalMoneyReceived: { $round: ['$totalMoneyReceived', 2] },
          canceledValue: { $round: ['$canceledValue', 2] },
          refundValue: { $round: ['$refundValue', 2] },
        },
      },
    ]);

    return { monthlyStats, categoryStats };
  }

  async getDashboardStats() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Product stats
    const productCount = await this.productModel.countDocuments();
    const lowStockCount = await this.productModel.countDocuments({ stockQty: { $gt: 0, $lt: 10 } });
    const outOfStockCount = await this.productModel.countDocuments({ stockQty: 0 });

    // Category stats
    const categoryCount = await this.categoryModel.countDocuments();

    // Customer stats
    const customerCount = await this.customers.count();

    // Order stats
    const orderStats = await this.orderModel.aggregate([
      {
        $facet: {
          total: [{ $count: 'count' }],
          thisMonth: [
            { $match: { createdAt: { $gte: startOfMonth } } },
            { $count: 'count' },
          ],
          pending: [
            { $match: { status: 'pending' } },
            { $count: 'count' },
          ],
          revenue: [
            { $match: { status: { $in: ['paid', 'shipped'] } } },
            { $group: { _id: null, total: { $sum: '$total' } } },
          ],
          revenueThisMonth: [
            { $match: { status: { $in: ['paid', 'shipped'] }, createdAt: { $gte: startOfMonth } } },
            { $group: { _id: null, total: { $sum: '$total' } } },
          ],
        },
      },
    ]);

    const stats = orderStats[0];

    return {
      products: {
        total: productCount,
        lowStock: lowStockCount,
        outOfStock: outOfStockCount,
      },
      categories: {
        total: categoryCount,
      },
      customers: {
        total: customerCount,
      },
      orders: {
        total: stats.total[0]?.count ?? 0,
        thisMonth: stats.thisMonth[0]?.count ?? 0,
        pending: stats.pending[0]?.count ?? 0,
      },
      revenue: {
        total: Math.round((stats.revenue[0]?.total ?? 0) * 100) / 100,
        thisMonth: Math.round((stats.revenueThisMonth[0]?.total ?? 0) * 100) / 100,
      },
    };
  }

  async updateShipment(
    id: string,
    input: { shippingCarrier?: string; trackingNumber?: string },
  ): Promise<unknown> {
    const _id = new Types.ObjectId(id);
    const exists = await this.orderModel.exists({ _id });
    if (!exists) throw new NotFoundException('Order not found');

    const $set: Record<string, unknown> = {};
    if (input.shippingCarrier !== undefined) {
      $set.shippingCarrier = input.shippingCarrier;
    }
    if (input.trackingNumber !== undefined) {
      $set.trackingNumber = input.trackingNumber;
    }

    await this.orderModel.updateOne({ _id }, { $set });

    const doc = await this.getEnrichedById(_id);
    if (!doc) throw new NotFoundException('Order not found');
    return doc;
  }
}

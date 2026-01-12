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
import type { OrderStatus } from './schemas/order.schema';
import { CustomersService } from '../customers/customers.service';
import { ReferralsService } from '../referrals/referrals.service';

@Injectable()
export class OrdersService {
  constructor(
    @InjectModel(Order.name)
    private readonly orderModel: Model<OrderDocument>,
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
    private readonly customers: CustomersService,
    private readonly referrals: ReferralsService,
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

    return this.orderModel.create({
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
    });
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

    const exists = await this.orderModel.exists({ _id });
    if (!exists) throw new NotFoundException('Order not found');

    await this.orderModel.updateOne({ _id }, { $set: { status } });

    const doc = await this.getEnrichedById(_id);
    if (!doc) throw new NotFoundException('Order not found');
    return doc;
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

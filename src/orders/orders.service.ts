import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { Order, OrderDocument } from './schemas/order.schema';
import { CreateOrderDto } from './dto/create-order.dto';
import { Product, ProductDocument } from '../products/schemas/product.schema';

@Injectable()
export class OrdersService {
  constructor(
    @InjectModel(Order.name) private readonly orderModel: Model<OrderDocument>,
    @InjectModel(Product.name) private readonly productModel: Model<ProductDocument>,
  ) {}

  async create(customerId: string, dto: CreateOrderDto) {
    if (!dto.items?.length) throw new BadRequestException('Order must include at least 1 item');

    // merge duplicates
    const qtyByProductId = new Map<string, number>();
    for (const i of dto.items) {
      const pid = String(i.productId);
      qtyByProductId.set(pid, (qtyByProductId.get(pid) ?? 0) + Number(i.qty));
    }

    const productIds = [...qtyByProductId.keys()].map((id) => new Types.ObjectId(id));
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
    const total = subtotal; // placeholder for shipping/tax later

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
      customerId: new Types.ObjectId(customerId),
      items,
      subtotal,
      total,
      status: 'pending',
      shippingName: dto.shippingName,
      shippingAddress1: dto.shippingAddress1,
      shippingCity: dto.shippingCity,
      shippingState: dto.shippingState,
      shippingPostcode: dto.shippingPostcode,
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
      .findOne({ _id: new Types.ObjectId(orderId), customerId: new Types.ObjectId(customerId) })
      .lean();
    if (!doc) throw new NotFoundException('Order not found');
    return doc;
  }
}



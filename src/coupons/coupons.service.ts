import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { randomBytes } from 'crypto';

import { Coupon, CouponDocument } from './schemas/coupon.schema';

// Type for lean coupon documents that include _id
type CouponWithId = Coupon & { _id: Types.ObjectId };
import { CreateCouponDto } from './dto/create-coupon.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';

@Injectable()
export class CouponsService {
  constructor(
    @InjectModel(Coupon.name)
    private readonly couponModel: Model<CouponDocument>,
  ) {}

  async create(dto: CreateCouponDto): Promise<Coupon> {
    // Generate unique coupon code
    let code = '';
    for (let attempt = 0; attempt < 5; attempt++) {
      code = randomBytes(4).toString('hex').toUpperCase();
      const exists = await this.couponModel.exists({ code });
      if (!exists) break;
      if (attempt === 4) {
        throw new BadRequestException('Failed to generate unique coupon code');
      }
    }

    const coupon = await this.couponModel.create({
      code,
      customerId: new Types.ObjectId(dto.customerId),
      value: dto.value,
      expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : undefined,
      description: dto.description,
      isUsed: false,
      active: true,
    });

    return coupon;
  }

  async listAll(): Promise<Coupon[]> {
    return this.couponModel
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
            customerName: {
              $concat: [
                { $ifNull: ['$customer.firstName', ''] },
                ' ',
                { $ifNull: ['$customer.lastName', ''] },
              ],
            },
          },
        },
        { $project: { customer: 0 } },
      ])
      .exec();
  }

  async listByCustomer(customerId: string): Promise<Coupon[]> {
    return this.couponModel
      .find({
        customerId: new Types.ObjectId(customerId),
        isUsed: false,
        active: true,
      })
      .sort({ createdAt: -1 })
      .lean();
  }

  async getById(id: string): Promise<Coupon> {
    const coupon = await this.couponModel.findById(id).lean();
    if (!coupon) throw new NotFoundException('Coupon not found');
    return coupon;
  }

  async getByCode(code: string): Promise<Coupon | null> {
    const normalized = code.trim().toUpperCase();
    return this.couponModel.findOne({ code: normalized }).lean();
  }

  async validateCoupon(code: string, customerId: string): Promise<CouponWithId> {
    const normalized = code.trim().toUpperCase();
    const coupon = await this.couponModel.findOne({ code: normalized }).lean();

    if (!coupon) {
      throw new BadRequestException('Invalid coupon code');
    }

    if (!coupon.active) {
      throw new BadRequestException('This coupon is no longer active');
    }

    if (coupon.isUsed) {
      throw new BadRequestException('This coupon has already been used');
    }

    if (coupon.customerId.toString() !== customerId) {
      throw new BadRequestException('This coupon does not belong to you');
    }

    if (coupon.expiryDate && new Date(coupon.expiryDate) < new Date()) {
      throw new BadRequestException('This coupon has expired');
    }

    return coupon;
  }

  async markAsUsed(couponId: Types.ObjectId, orderId: Types.ObjectId): Promise<void> {
    await this.couponModel.updateOne(
      { _id: couponId },
      {
        $set: {
          isUsed: true,
          usedInOrderId: orderId,
        },
      },
    );
  }

  async update(id: string, dto: UpdateCouponDto): Promise<Coupon> {
    const coupon = await this.couponModel.findById(id);
    if (!coupon) throw new NotFoundException('Coupon not found');

    if (dto.value !== undefined) coupon.value = dto.value;
    if (dto.active !== undefined) coupon.active = dto.active;
    if (dto.expiryDate !== undefined) coupon.expiryDate = new Date(dto.expiryDate);
    if (dto.description !== undefined) coupon.description = dto.description;

    await coupon.save();
    return coupon;
  }

  async delete(id: string): Promise<void> {
    const result = await this.couponModel.deleteOne({ _id: new Types.ObjectId(id) });
    if (result.deletedCount === 0) {
      throw new NotFoundException('Coupon not found');
    }
  }
}

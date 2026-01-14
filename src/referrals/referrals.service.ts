import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { Referral, ReferralDocument } from './schemas/referral.schema';
import { CreateReferralDto } from './dto/create-referral.dto';
import { UpdateReferralDto } from './dto/update-referral.dto';

@Injectable()
export class ReferralsService {
  constructor(@InjectModel(Referral.name) private readonly referralModel: Model<ReferralDocument>) {}

  list() {
    return this.referralModel.find().sort({ createdAt: -1 }).lean();
  }

  async get(id: string) {
    const doc = await this.referralModel.findById(id).lean();
    if (!doc) throw new NotFoundException('Referral not found');
    return doc;
  }

  create(dto: CreateReferralDto) {
    return this.referralModel.create({
      name: dto.name,
      discountType: dto.discountType,
      discountValue: dto.discountValue,
      active: dto.active ?? true,
    });
  }

  async update(id: string, dto: UpdateReferralDto) {
    const doc = await this.referralModel
      .findByIdAndUpdate(
        new Types.ObjectId(id),
        { $set: dto },
        { new: true, runValidators: true },
      )
      .lean();
    if (!doc) throw new NotFoundException('Referral not found');
    return doc;
  }

  async getActiveById(id: Types.ObjectId) {
    return this.referralModel.findOne({ _id: id, active: true }).lean();
  }
}





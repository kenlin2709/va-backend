import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { Category, CategoryDocument } from './schemas/category.schema';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { UploadsService } from '../uploads/uploads.service';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectModel(Category.name) private readonly categoryModel: Model<CategoryDocument>,
    private readonly uploadsService: UploadsService,
  ) {}

  async ensureDefaultCategories() {
    const defaults = ['All Products', 'Desserts', 'Fruit', 'Energy', 'Tobacco', 'Party Mix'];
    for (let i = 0; i < defaults.length; i++) {
      const name = defaults[i];
      await this.categoryModel.updateOne(
        { name },
        { $setOnInsert: { name, order: i } },
        { upsert: true },
      );
    }

    // Backfill `order` for any pre-existing categories that don't have it set yet.
    const missing = await this.categoryModel
      .find({ order: { $exists: false } })
      .sort({ name: 1 })
      .lean();
    if (missing.length) {
      const last = await this.categoryModel
        .findOne({ order: { $exists: true } })
        .sort({ order: -1 })
        .lean();
      let next = (last?.order ?? -1) + 1;
      for (const cat of missing) {
        await this.categoryModel.updateOne({ _id: cat._id }, { $set: { order: next++ } });
      }
    }
  }

  async findAll() {
    return this.categoryModel.find().sort({ order: 1, name: 1 }).lean();
  }

  async findOne(id: string) {
    const doc = await this.categoryModel.findById(id).lean();
    if (!doc) throw new NotFoundException('Category not found');
    return doc;
  }

  async create(dto: CreateCategoryDto, image?: Express.Multer.File) {
    try {
      let categoryImageUrl = dto.categoryImageUrl;
      if (image) {
        const uploaded = await this.uploadsService.uploadImage({
          fileBuffer: image.buffer,
          fileName: image.originalname,
          contentType: image.mimetype,
          folder: 'categories',
        });
        categoryImageUrl = uploaded.fileUrl;
      }

      let order = dto.order;
      if (typeof order !== 'number') {
        const last = await this.categoryModel.findOne().sort({ order: -1 }).lean();
        order = (last?.order ?? -1) + 1;
      }

      return await this.categoryModel.create({
        name: dto.name,
        description: dto.description,
        categoryImageUrl,
        order,
      });
    } catch (e: any) {
      // Handle duplicate unique `name`
      if (e?.code === 11000) {
        throw new BadRequestException('Category name already exists');
      }
      throw e;
    }
  }

  async update(id: string, dto: UpdateCategoryDto, image?: Express.Multer.File) {
    try {
      const update: any = { ...dto };
      if (image) {
        const uploaded = await this.uploadsService.uploadImage({
          fileBuffer: image.buffer,
          fileName: image.originalname,
          contentType: image.mimetype,
          folder: 'categories',
        });
        update.categoryImageUrl = uploaded.fileUrl;
      }

      const doc = await this.categoryModel
        .findByIdAndUpdate(id, update, { new: true, runValidators: true })
        .lean();
      if (!doc) throw new NotFoundException('Category not found');
      return doc;
    } catch (e: any) {
      if (e?.code === 11000) {
        throw new BadRequestException('Category name already exists');
      }
      throw e;
    }
  }

  async remove(id: string) {
    const doc = await this.categoryModel.findByIdAndDelete(id).lean();
    if (!doc) throw new NotFoundException('Category not found');
    return { deleted: true };
  }
}

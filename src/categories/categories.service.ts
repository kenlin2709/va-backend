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
    console.log('ensureDefaultCategories');
    const defaults = ['Desserts', 'Fruit', 'Energy', 'Tobacco', 'Party Mix', 'All Products'];
    for (const name of defaults) {
      await this.categoryModel.updateOne({ name }, { $setOnInsert: { name } }, { upsert: true });
    }
  }

  async findAll() {
    return this.categoryModel.find().sort({ name: 1 }).lean();
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

      return await this.categoryModel.create({
        name: dto.name,
        description: dto.description,
        categoryImageUrl,
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

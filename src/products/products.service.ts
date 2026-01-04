import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { Product, ProductDocument } from './schemas/product.schema';
import { Category, CategoryDocument } from '../categories/schemas/category.schema';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ListProductsDto } from './dto/list-products.dto';
import { UploadsService } from '../uploads/uploads.service';

@Injectable()
export class ProductsService {
  constructor(
    @InjectModel(Product.name) private readonly productModel: Model<ProductDocument>,
    @InjectModel(Category.name) private readonly categoryModel: Model<CategoryDocument>,
    private readonly uploadsService: UploadsService,
  ) {}

  async create(dto: CreateProductDto, image?: Express.Multer.File) {
    const doc: any = {
      name: dto.name,
      price: dto.price,
      productImageUrl: dto.productImageUrl,
      description: dto.description,
      disclaimer: dto.disclaimer,
      stockQty: dto.stockQty ?? 0,
    };

    if (dto.categoryId) {
      const categoryExists = await this.categoryModel.exists({ _id: dto.categoryId });
      if (!categoryExists) {
        throw new BadRequestException('categoryId does not exist');
      }
      doc.categoryId = new Types.ObjectId(dto.categoryId);
    }

    if (image) {
      const uploaded = await this.uploadsService.uploadImage({
        fileBuffer: image.buffer,
        fileName: image.originalname,
        contentType: image.mimetype,
        folder: 'products',
      });
      doc.productImageUrl = uploaded.fileUrl;
    }

    return this.productModel.create(doc);
  }

  async findAll(query: ListProductsDto) {
    const filter: Record<string, any> = {};

    if (query.categoryId) {
      filter.categoryId = new Types.ObjectId(query.categoryId);
    }

    if (query.q) {
      filter.$text = { $search: query.q };
    }

    const limit = query.limit ?? 24;
    const page = query.page ?? 1;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.productModel
        .find(filter)
        .sort(query.q ? { score: { $meta: 'textScore' } } : { createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.productModel.countDocuments(filter),
    ]);

    return { items, page, limit, total };
  }

  async findOne(id: string) {
    const doc = await this.productModel.findById(id).lean();
    if (!doc) throw new NotFoundException('Product not found');
    return doc;
  }

  async update(id: string, dto: UpdateProductDto, image?: Express.Multer.File) {
    if (dto.categoryId) {
      const categoryExists = await this.categoryModel.exists({ _id: dto.categoryId });
      if (!categoryExists) {
        throw new BadRequestException('categoryId does not exist');
      }
    }

    const update: any = { ...dto };
    if (dto.categoryId) update.categoryId = new Types.ObjectId(dto.categoryId);

    if (image) {
      const uploaded = await this.uploadsService.uploadImage({
        fileBuffer: image.buffer,
        fileName: image.originalname,
        contentType: image.mimetype,
        folder: 'products',
      });
      update.productImageUrl = uploaded.fileUrl;
    }

    const doc = await this.productModel
      .findByIdAndUpdate(id, update, { new: true, runValidators: true })
      .lean();

    if (!doc) throw new NotFoundException('Product not found');
    return doc;
  }

  async remove(id: string) {
    const doc = await this.productModel.findByIdAndDelete(id).lean();
    if (!doc) throw new NotFoundException('Product not found');
    return { deleted: true };
  }
}

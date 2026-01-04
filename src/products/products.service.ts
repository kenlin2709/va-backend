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

    const ids = new Set<string>();
    if (dto.categoryId) ids.add(dto.categoryId);
    for (const id of dto.categoryIds ?? []) ids.add(id);

    if (ids.size) {
      const objectIds = [...ids].map((id) => new Types.ObjectId(id));
      const found = await this.categoryModel
        .find({ _id: { $in: objectIds } }, { _id: 1 })
        .lean();
      if (found.length !== objectIds.length) {
        throw new BadRequestException('One or more categoryIds do not exist');
      }
      doc.categoryIds = objectIds;
      // Backward-compatible single field
      doc.categoryId = objectIds[0];
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
      const oid = new Types.ObjectId(query.categoryId);
      filter.$or = [{ categoryId: oid }, { categoryIds: oid }];
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
    const update: any = { ...dto };

    // Multi-category semantics:
    // - if categoryIds provided => replace list
    // - else if categoryId provided => replace list with single id
    // - else => leave unchanged
    const nextIds =
      dto.categoryIds !== undefined ? dto.categoryIds : dto.categoryId ? [dto.categoryId] : undefined;

    if (nextIds !== undefined) {
      const unique = [...new Set(nextIds)].filter(Boolean);
      if (unique.length) {
        const objectIds = unique.map((x) => new Types.ObjectId(x));
        const found = await this.categoryModel
          .find({ _id: { $in: objectIds } }, { _id: 1 })
          .lean();
        if (found.length !== objectIds.length) {
          throw new BadRequestException('One or more categoryIds do not exist');
        }
        update.categoryIds = objectIds;
        update.categoryId = objectIds[0];
      } else {
        update.categoryIds = [];
        update.categoryId = undefined;
      }
    }

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

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type ProductDocument = HydratedDocument<Product>;

@Schema({ timestamps: true, collection: 'products' })
export class Product {
  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ required: true, min: 0 })
  price!: number;

  // FK → Categories.id (Mongo ObjectId)
  @Prop({ type: Types.ObjectId, ref: 'Category', index: true, required: false })
  categoryId?: Types.ObjectId;

  // New: multi-category support
  @Prop({ type: [Types.ObjectId], ref: 'Category', index: true, required: false, default: [] })
  categoryIds!: Types.ObjectId[];

  @Prop({ trim: true })
  productImageUrl?: string;

  @Prop()
  description?: string;

  @Prop()
  disclaimer?: string;

  @Prop({ min: 0, default: 0 })
  stockQty!: number;
}

export const ProductSchema = SchemaFactory.createForClass(Product);

ProductSchema.index({ name: 'text' });

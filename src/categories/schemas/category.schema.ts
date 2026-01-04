import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type CategoryDocument = HydratedDocument<Category>;

@Schema({ timestamps: true, collection: 'categories' })
export class Category {
  @Prop({ required: true, trim: true, unique: true })
  name!: string;

  @Prop({ trim: true })
  description?: string;

  @Prop({ trim: true })
  categoryImageUrl?: string;
}

export const CategorySchema = SchemaFactory.createForClass(Category);

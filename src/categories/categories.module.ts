import { Module, OnModuleInit } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { Category, CategorySchema } from './schemas/category.schema';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';
import { UploadsModule } from '../uploads/uploads.module';

@Module({
  imports: [MongooseModule.forFeature([{ name: Category.name, schema: CategorySchema }]), UploadsModule],
  controllers: [CategoriesController],
  providers: [CategoriesService],
  exports: [CategoriesService],
})
export class CategoriesModule implements OnModuleInit {
  constructor(private readonly categoriesService: CategoriesService) {}

  async onModuleInit() {
    await this.categoriesService.ensureDefaultCategories();
  }
}

import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';

import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ListProductsDto } from './dto/list-products.dto';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @UseInterceptors(FileInterceptor('image'))
  create(@Body() dto: CreateProductDto, @UploadedFile() image?: Express.Multer.File) {
    if (image && !image.mimetype?.startsWith('image/')) {
      throw new BadRequestException('Only image uploads are allowed');
    }
    return this.productsService.create(dto, image);
  }

  @Get()
  findAll(@Query() query: ListProductsDto) {
    return this.productsService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productsService.findOne(id);
  }

  @Patch(':id')
  @UseInterceptors(FileInterceptor('image'))
  update(@Param('id') id: string, @Body() dto: UpdateProductDto, @UploadedFile() image?: Express.Multer.File) {
    if (image && !image.mimetype?.startsWith('image/')) {
      throw new BadRequestException('Only image uploads are allowed');
    }
    return this.productsService.update(id, dto, image);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.productsService.remove(id);
  }
}

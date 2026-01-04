import {
  BadRequestException,
  Body,
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';

import { PresignUploadDto } from './dto/presign-upload.dto';
import { UploadsService } from './uploads.service';

@Controller('uploads')
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Post('s3/presign')
  presign(@Body() dto: PresignUploadDto) {
    return this.uploadsService.presignPutObject({
      fileName: dto.fileName,
      contentType: dto.contentType,
      folder: dto.folder,
    });
  }

  // Backend-managed upload (no browser-to-S3 CORS)
  @Post('s3/image')
  @UseInterceptors(FileInterceptor('file'))
  async uploadImage(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body('folder') folder?: string,
  ) {
    if (!file) throw new BadRequestException('Missing file');
    if (!file.mimetype?.startsWith('image/')) {
      throw new BadRequestException('Only image uploads are allowed');
    }
    // basic size guard (10MB)
    if (file.size > 10 * 1024 * 1024) {
      throw new BadRequestException('File too large (max 10MB)');
    }

    return this.uploadsService.uploadImage({
      fileBuffer: file.buffer,
      fileName: file.originalname,
      contentType: file.mimetype,
      folder,
    });
  }
}



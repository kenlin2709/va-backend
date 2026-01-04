import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';

@Injectable()
export class UploadsService {
  private readonly s3: S3Client;

  constructor(private readonly config: ConfigService) {
    const region = this.config.get<string>('AWS_REGION') ?? 'ap-southeast-2';
    this.s3 = new S3Client({ region });
  }

  private getPublicBaseUrl(bucket: string, region: string) {
    const configured = (this.config.get<string>('AWS_S3_PUBLIC_BASE_URL') ?? '').trim();
    const base = configured || `https://${bucket}.s3.${region}.amazonaws.com`;
    return base.replace(/\/+$/g, '');
  }

  async presignPutObject(opts: { fileName: string; contentType: string; folder?: string }) {
    const bucket = this.config.get<string>('AWS_S3_BUCKET');
    if (!bucket) throw new Error('AWS_S3_BUCKET is not set');

    const region = this.config.get<string>('AWS_REGION') ?? 'ap-southeast-2';
    const publicBaseUrl = this.getPublicBaseUrl(bucket, region);

    const cleanName = (opts.fileName ?? '').split('/').pop() ?? 'file';
    const ext = cleanName.includes('.') ? cleanName.slice(cleanName.lastIndexOf('.')) : '';
    const folder = (opts.folder ?? 'products').replace(/^\/+|\/+$/g, '');
    const key = `${folder}/${randomUUID()}${ext}`;

    const cmd = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: opts.contentType,
    });

    const uploadUrl = await getSignedUrl(this.s3, cmd, { expiresIn: 60 });
    const fileUrl = `${publicBaseUrl}/${key}`;

    return { uploadUrl, fileUrl, key };
  }

  async uploadImage(opts: {
    fileBuffer: Buffer;
    fileName: string;
    contentType: string;
    folder?: string;
  }) {
    const bucket = this.config.get<string>('AWS_S3_BUCKET');
    if (!bucket) throw new Error('AWS_S3_BUCKET is not set');

    const region = this.config.get<string>('AWS_REGION') ?? 'ap-southeast-2';
    const publicBaseUrl = this.getPublicBaseUrl(bucket, region);

    const cleanName = (opts.fileName ?? '').split('/').pop() ?? 'file';
    const ext = cleanName.includes('.') ? cleanName.slice(cleanName.lastIndexOf('.')) : '';
    const folder = (opts.folder ?? 'products').replace(/^\/+|\/+$/g, '');
    const key = `${folder}/${randomUUID()}${ext}`;

    const acl = this.config.get<string>('AWS_S3_OBJECT_ACL') || undefined; // e.g. "public-read"

    const cmd = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: opts.fileBuffer,
      ContentType: opts.contentType,
      ...(acl ? { ACL: acl as any } : {}),
    });

    try {
      await this.s3.send(cmd);
    } catch (e: any) {
      // Common when bucket has Object Ownership = Bucket owner enforced (ACLs disabled)
      if (e?.name === 'AccessControlListNotSupported') {
        throw new Error(
          'S3 bucket does not allow ACLs (Object Ownership: Bucket owner enforced). Remove AWS_S3_OBJECT_ACL and use a bucket policy (public read) or CloudFront to serve images.',
        );
      }
      throw e;
    }

    const fileUrl = `${publicBaseUrl}/${key}`;
    return { fileUrl, key };
  }
}



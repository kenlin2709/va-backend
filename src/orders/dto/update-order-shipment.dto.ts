import { IsOptional, IsString } from 'class-validator';

export class UpdateOrderShipmentDto {
  @IsOptional()
  @IsString()
  shippingCarrier?: string;

  @IsOptional()
  @IsString()
  trackingNumber?: string;
}







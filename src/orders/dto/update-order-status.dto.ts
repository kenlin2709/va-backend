import { IsIn } from 'class-validator';

import type { OrderStatus } from '../schemas/order.schema';

export class UpdateOrderStatusDto {
  @IsIn(['pending', 'paid', 'shipped', 'canceled', 'refunded'])
  status!: OrderStatus;
}







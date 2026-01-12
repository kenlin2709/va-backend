import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export type CurrentCustomer = { customerId: string; email: string };

export const CurrentCustomer = createParamDecorator((_data: unknown, ctx: ExecutionContext) => {
  const req = ctx.switchToHttp().getRequest();
  return req.user as CurrentCustomer;
});




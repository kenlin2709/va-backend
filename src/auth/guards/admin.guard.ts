import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';

import { JwtAuthGuard } from './jwt-auth.guard';
import { CustomersService } from '../../customers/customers.service';

@Injectable()
export class AdminGuard extends JwtAuthGuard implements CanActivate {
  constructor(private readonly customers: CustomersService) {
    super();
  }

  override async canActivate(context: ExecutionContext): Promise<boolean> {
    const ok = (await super.canActivate(context)) as boolean;
    if (!ok) return false;

    const req = context.switchToHttp().getRequest();
    const customerId: string | undefined = req.user?.customerId;
    if (!customerId) return false;

    const customer = await this.customers.findById(customerId);
    return !!customer.isAdmin;
  }
}







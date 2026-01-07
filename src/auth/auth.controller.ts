import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common';

import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentCustomer, CurrentCustomer as CurrentCustomerDecorator } from './decorators/current-customer.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentCustomerDecorator() customer: CurrentCustomer) {
    return this.auth.me(customer.customerId);
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  updateMe(@CurrentCustomerDecorator() customer: CurrentCustomer, @Body() dto: UpdateProfileDto) {
    return this.auth.updateMe(customer.customerId, dto);
  }

  @Patch('me/password')
  @UseGuards(JwtAuthGuard)
  changePassword(@CurrentCustomerDecorator() customer: CurrentCustomer, @Body() dto: ChangePasswordDto) {
    return this.auth.changePassword(customer.customerId, dto);
  }
}



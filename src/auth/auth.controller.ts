import { Body, Controller, Get, Patch, Post, Query, UseGuards } from '@nestjs/common';

import { AuthService } from './auth.service';
import { EmailVerificationService } from './email-verification.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { SendVerificationDto } from './dto/send-verification.dto';
import { VerifyCodeDto } from './dto/verify-code.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentCustomer, CurrentCustomer as CurrentCustomerDecorator } from './decorators/current-customer.decorator';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly emailVerification: EmailVerificationService,
  ) {}

  @Post('send-verification')
  sendVerification(@Body() dto: SendVerificationDto) {
    return this.emailVerification.sendCode(dto.email);
  }

  @Post('verify-code')
  verifyCode(@Body() dto: VerifyCodeDto) {
    return this.emailVerification.verifyCode(dto.email, dto.code);
  }

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @Get('email-exists')
  emailExists(@Query('email') email: string) {
    return this.auth.emailExists(email);
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



import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';

import { CustomersService } from '../customers/customers.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

function sanitizeCustomer(c: any) {
  if (!c) return c;
  const { passwordHash, ...rest } = c;
  return rest;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly customers: CustomersService,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const email = dto.email.toLowerCase().trim();
    if (!email) throw new BadRequestException('Email is required');

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const created = await this.customers.create({
      email,
      passwordHash,
      firstName: dto.firstName,
      lastName: dto.lastName,
      phone: dto.phone,
    });

    const token = await this.jwt.signAsync({ sub: String(created._id), email });

    // created is a mongoose doc - convert to plain object
    const customer = sanitizeCustomer(created.toObject ? created.toObject() : created);
    return { customer, accessToken: token };
  }

  async login(dto: LoginDto) {
    const email = dto.email.toLowerCase().trim();
    const customer = await this.customers.findByEmail(email);
    if (!customer) throw new UnauthorizedException('Invalid email or password');

    const ok = await bcrypt.compare(dto.password, customer.passwordHash);
    if (!ok) throw new UnauthorizedException('Invalid email or password');

    const token = await this.jwt.signAsync({ sub: String(customer._id), email });
    return { customer: sanitizeCustomer(customer), accessToken: token };
  }

  async me(customerId: string) {
    const customer = await this.customers.findById(customerId);
    return { customer: sanitizeCustomer(customer) };
  }

  async updateMe(customerId: string, dto: UpdateProfileDto) {
    const update: any = {};
    if (dto.firstName !== undefined) update.firstName = dto.firstName;
    if (dto.lastName !== undefined) update.lastName = dto.lastName;
    if (dto.phone !== undefined) update.phone = dto.phone;
    if (dto.shippingAddress !== undefined) update.shippingAddress = dto.shippingAddress;

    const customer = await this.customers.updateProfile(customerId, update);
    return { customer: sanitizeCustomer(customer) };
  }

  async changePassword(customerId: string, dto: ChangePasswordDto) {
    const customer = await this.customers.findById(customerId);
    if (!customer?.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const ok = await bcrypt.compare(dto.currentPassword, customer.passwordHash);
    if (!ok) throw new UnauthorizedException('Current password is incorrect');

    const nextHash = await bcrypt.hash(dto.newPassword, 12);
    await this.customers.updatePasswordHash(customerId, nextHash);
    return { updated: true };
  }
}



import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';

import { CustomersModule } from '../customers/customers.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';
import { AdminGuard } from './guards/admin.guard';

@Module({
  imports: [
    forwardRef(() => CustomersModule),
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET')!,
        // JwtModule's typing expects `expiresIn` as number | StringValue (from `ms`),
        // but env vars are strings. Cast to keep config ergonomic.
        signOptions: { expiresIn: (config.get<string>('JWT_EXPIRES_IN') ?? '7d') as any },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, AdminGuard],
  exports: [JwtModule, AdminGuard],
})
export class AuthModule {}



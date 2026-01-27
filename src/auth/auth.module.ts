import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';

import { CustomersModule } from '../customers/customers.module';
import { EmailModule } from '../email/email.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { EmailVerificationService } from './email-verification.service';
import { JwtStrategy } from './jwt.strategy';
import { AdminGuard } from './guards/admin.guard';
import { EmailVerification, EmailVerificationSchema } from './schemas/email-verification.schema';

@Module({
  imports: [
    forwardRef(() => CustomersModule),
    EmailModule,
    PassportModule,
    MongooseModule.forFeature([
      { name: EmailVerification.name, schema: EmailVerificationSchema },
    ]),
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
  providers: [AuthService, EmailVerificationService, JwtStrategy, AdminGuard],
  exports: [JwtModule, AdminGuard],
})
export class AuthModule {}



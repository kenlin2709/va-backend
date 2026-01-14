import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CategoriesModule } from './categories/categories.module';
import { ProductsModule } from './products/products.module';
import { UploadsModule } from './uploads/uploads.module';
import { CustomersModule } from './customers/customers.module';
import { AuthModule } from './auth/auth.module';
import { OrdersModule } from './orders/orders.module';
import { ReferralsModule } from './referrals/referrals.module';
import { EmailModule } from './email/email.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      expandVariables: true,
      load: [
        () => ({
          // Default values for development
          MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/vape-lab',
          JWT_SECRET: process.env.JWT_SECRET || 'dev-jwt-secret-change-in-production',
          EMAILJS_SERVICE_ID: process.env.EMAILJS_SERVICE_ID || '',
          EMAILJS_TEMPLATE_ID: process.env.EMAILJS_TEMPLATE_ID || 'template_order_confirmation',
          EMAILJS_PUBLIC_KEY: process.env.EMAILJS_PUBLIC_KEY || '',
        }),
      ],
      validate: (config) => {
        // Only validate in production, use defaults in development
        if (process.env.NODE_ENV === 'production') {
          if (!config.MONGODB_URI) {
            throw new Error('Missing MONGODB_URI in production');
          }
          if (!config.JWT_SECRET) {
            throw new Error('Missing JWT_SECRET in production');
          }
        }
        return config;
      },
    }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>('MONGODB_URI')!,
      }),
    }),

    CategoriesModule,
    ProductsModule,
    UploadsModule,
    CustomersModule,
    AuthModule,
    OrdersModule,
    ReferralsModule,
    EmailModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

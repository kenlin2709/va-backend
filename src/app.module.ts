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

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      expandVariables: true,
      validate: (config) => {
        if (!config.MONGODB_URI) {
          throw new Error(
            'Missing MONGODB_URI. Create a .env file (see .env.example) and set MONGODB_URI=...'
          );
        }
        if (!config.JWT_SECRET) {
          throw new Error('Missing JWT_SECRET. Set JWT_SECRET=... in your .env file');
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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { RolesGuard } from './auth/roles.guard';
import { CarsModule } from './cars/cars.module';
import { LanguagesModule } from './languages/languages.module';
import { SettingsModule } from './settings/settings.module';
import { TranslationsModule } from './translations/translations.module';
import { CloudinaryModule } from './cloudinary/cloudinary.module';
import { RentalsModule } from './rentals/rentals.module';
import { RentalLeadsModule } from './rental-leads/rental-leads.module';
import { PartnershipRequestsModule } from './partnership-requests/partnership-requests.module';
import { ReviewsModule } from './reviews/reviews.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'localhost', // ВАЖНО: Мы запускаем Node локально, поэтому для нас база на localhost
      port: 5434,
      username: 'root', // Как в docker-compose
      password: 'root', // Как в docker-compose
      database: 'car4rent', // Имя базы
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      autoLoadEntities: true,
      synchronize: true,
    }),
    UsersModule,
    AuthModule,
    CarsModule,
    LanguagesModule,
    SettingsModule,
    TranslationsModule,
    CloudinaryModule,
    RentalsModule,
    RentalLeadsModule,
    PartnershipRequestsModule,
    ReviewsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
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
import { UserDocumentsModule } from './user-documents/user-documents.module';
import { CarDamagesModule } from './car-damages/car-damages.module';
import { FeaturesModule } from './features/features.module';
import { LocationsModule } from './locations/locations.module';
import { EmailModule } from './email/email.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'localhost', // IMPORTANT: we are running Node locally, so for us the database is on localhost.
      port: 5434,
      username: 'root', // As in docker-compose
      password: 'root', // As in docker-compose
      database: 'car4rent', // Database name
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
    UserDocumentsModule,
    CarDamagesModule,
    FeaturesModule,
    LocationsModule,
    EmailModule,
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

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FeaturesService } from './features.service';
import { FeaturesController } from './features.controller';
import { Feature } from 'src/entities/feature.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Feature])], // 👈 Регистрируем репозиторий
  controllers: [FeaturesController],
  providers: [FeaturesService],
  exports: [FeaturesService], // Экспортируем, если понадобится в CarsService
})
export class FeaturesModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'localhost', // ВАЖНО: Мы запускаем Node локально, поэтому для нас база на localhost
      port: 5434,
      username: 'root', // Как в docker-compose
      password: 'root', // Как в docker-compose
      database: 'car4rent', // Имя базы
      entities: [], // Сюда будем добавлять наши сущности (User, Car...)
      synchronize: true, // ВНИМАНИЕ: true только для разработки! Это автоматически создает таблицы.
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

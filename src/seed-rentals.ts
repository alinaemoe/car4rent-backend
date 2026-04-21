import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Rental, RentalStatus } from './entities/rental.entity';
import { User } from './entities/user.entity';
import { Car } from './entities/car.entity';

// Хелперы для дат и рандома
const randomInt = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;
const randomElement = <T>(arr: T[]): T => arr[randomInt(0, arr.length - 1)];

const addDays = (date: Date, days: number) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

async function bootstrap() {
  console.log('🚀 Поднимаем Nest-контекст для Сидера...');
  const app = await NestFactory.createApplicationContext(AppModule);

  const rentalRepo = app.get<Repository<Rental>>(getRepositoryToken(Rental));
  const userRepo = app.get<Repository<User>>(getRepositoryToken(User));
  const carRepo = app.get<Repository<Car>>(getRepositoryToken(Car));

  console.log('📡 Вытягиваем существующих юзеров и машины...');
  const users = await userRepo.find();
  const cars = await carRepo.find();

  if (users.length === 0 || cars.length === 0) {
    console.error('❌ Ошибка: В базе нет юзеров или машин! Сначала создай их.');
    process.exit(1);
  }

  console.log(
    `✅ Найдено ${users.length} юзеров и ${cars.length} машин. Генерируем 1000 бронирований...`,
  );

  const rentalsToInsert: Partial<Rental>[] = [];
  const now = new Date();

  for (let i = 0; i < 1000; i++) {
    const user = randomElement(users);
    const car = randomElement(cars);

    // Определяем статус (вероятности: 60% COMPLETED, 15% ACTIVE, 15% APPROVED, 5% CREATED, 5% OVERDUE)
    const rand = Math.random();
    let status: RentalStatus;
    let startDate: Date;
    let endDate: Date;
    let actualReturnDate: Date | null = null;
    const startMileage = car.current_mileage - randomInt(100, 5000); // Имитируем, что пробег был меньше
    let endMileage: number | null = null;

    if (rand < 0.6) {
      // ИСТОРИЯ (COMPLETED) - от 6 месяцев назад до вчера
      status = RentalStatus.COMPLETED;
      startDate = addDays(now, -randomInt(3, 180));
      endDate = addDays(startDate, randomInt(1, 14));
      actualReturnDate = addDays(endDate, randomInt(-1, 0)); // Вернули вовремя или на день раньше
      endMileage = startMileage + randomInt(50, 1000);
    } else if (rand < 0.75) {
      // СЕЙЧАС КАТАЮТСЯ (ACTIVE)
      status = RentalStatus.ACTIVE;
      startDate = addDays(now, -randomInt(1, 5)); // Начали пару дней назад
      endDate = addDays(now, randomInt(1, 10)); // Закончат в будущем
    } else if (rand < 0.9) {
      // ЗАБРОНИРОВАНЫ (APPROVED)
      status = RentalStatus.APPROVED;
      startDate = addDays(now, randomInt(1, 30));
      endDate = addDays(startDate, randomInt(1, 14));
    } else if (rand < 0.95) {
      // ТОЛЬКО ЧТО УПАЛИ (CREATED)
      status = RentalStatus.CREATED;
      startDate = addDays(now, randomInt(5, 40));
      endDate = addDays(startDate, randomInt(1, 7));
    } else {
      // ПРОСРОЧЕНО (OVERDUE)
      status = RentalStatus.OVERDUE;
      startDate = addDays(now, -randomInt(5, 10)); // Начали давно
      endDate = addDays(now, -randomInt(1, 3)); // Должны были вернуть вчера-позавчера
    }

    // Считаем дни
    const days = Math.ceil(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
    );

    // Считаем цену со скидками
    const basePriceCalc = days * car.price_per_day;
    let discountPercent = 0;

    if (car.discount_tiers) {
      const tiers = Object.keys(car.discount_tiers)
        .map(Number)
        .sort((a, b) => b - a);
      for (const tier of tiers) {
        if (days >= tier) {
          // TypeORM достает jsonb как объект
          discountPercent = (car.discount_tiers as any)[tier];
          break;
        }
      }
    }

    const discountAmount = Math.floor((basePriceCalc * discountPercent) / 100);
    const finalBasePrice = basePriceCalc - discountAmount;

    // Для завершенных считаем Total
    let penalty = 0;
    if (
      status === RentalStatus.COMPLETED &&
      actualReturnDate &&
      actualReturnDate > endDate
    ) {
      penalty = 1500; // Условный штраф за просрочку в прошлом
    }
    const totalPrice =
      status === RentalStatus.COMPLETED ? finalBasePrice + penalty : null;

    rentalsToInsert.push({
      user,
      car,
      status,
      start_date: startDate,
      end_date: endDate,
      actual_return_date: actualReturnDate,
      start_fuel: 100,
      end_fuel: status === RentalStatus.COMPLETED ? randomInt(20, 100) : null,
      start_mileage:
        status !== RentalStatus.CREATED && status !== RentalStatus.APPROVED
          ? startMileage
          : null,
      end_mileage: endMileage,
      base_price: finalBasePrice,
      penalty_price: penalty,
      total_price: totalPrice,
      // location_id можно не заполнять, если они nullable
    });
  }

  console.log('💾 Сохраняем в базу данных (это может занять пару секунд)...');

  // Сохраняем чанками (кусочками), чтобы не убить память
  const chunkSize = 100;
  for (let i = 0; i < rentalsToInsert.length; i += chunkSize) {
    const chunk = rentalsToInsert.slice(i, i + chunkSize);
    await rentalRepo.save(chunk);
    process.stdout.write('.'); // Прогресс-бар точечками
  }

  console.log('\n🎉 Готово! 1000 поездок успешно добавлены.');
  await app.close();
  process.exit(0);
}

bootstrap().catch((err) => {
  console.error('Fatal error during seeding:', err);
  process.exit(1);
});

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

// Импорты сущностей (проверь пути!)
import { Rental, RentalStatus } from './entities/rental.entity';
import { User, UserRole } from './entities/user.entity';
import { Car } from './entities/car.entity';
import {
  Transaction,
  PayoutStatus,
  TransactionType,
} from './entities/transaction.entity';
import {
  PartnershipRequest,
  RequestStatus,
} from './entities/partnership-request.entity';

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
  const txRepo = app.get<Repository<Transaction>>(
    getRepositoryToken(Transaction),
  );
  const requestRepo = app.get<Repository<PartnershipRequest>>(
    getRepositoryToken(PartnershipRequest),
  );
  console.log('🧹 Очищаем старые данные...');

  // Порядок важен из-за Foreign Keys: сначала транзакции и аренды, потом заявки
  await txRepo.query('TRUNCATE TABLE "transactions" CASCADE');
  await rentalRepo.query('TRUNCATE TABLE "rentals" CASCADE');
  await requestRepo.query('TRUNCATE TABLE "partnership_requests" CASCADE');

  // Или, если хочешь через TypeORM напрямую (но query с TRUNCATE надежнее при связях):
  // await txRepo.clear();
  // await rentalRepo.clear();
  // await requestRepo.clear();

  console.log('📡 Вытягиваем существующих юзеров и машины...');
  const users = await userRepo.find();
  const cars = await carRepo.find();

  if (users.length === 0 || cars.length === 0) {
    console.error('❌ Ошибка: В базе нет юзеров или машин! Сначала создай их.');
    process.exit(1);
  }

  // ==========================================
  // ЭТАП 1: Создаем Партнеров (Раздаем машины)
  // ==========================================
  console.log('👔 Назначаем владельцев автомобилям (создаем LESSOR-ов)...');
  let lessorsCount = 0;
  const usersToUpdate = new Set<User>();

  for (const car of cars) {
    // 30% машин будут принадлежать партнерам, остальные 70% — автопарк компании
    if (Math.random() < 0.3) {
      const owner = randomElement(users);
      car.owner = owner;

      // Выдаем роль LESSOR, если ее еще нет
      if (!owner.roles.includes(UserRole.LESSOR)) {
        owner.roles.push(UserRole.LESSOR);
        usersToUpdate.add(owner);
        lessorsCount++;
      }
    } else {
      car.owner = null;
    }
  }

  await userRepo.save(Array.from(usersToUpdate));
  await carRepo.save(cars);
  console.log(`✅ Выдано ролей LESSOR: ${lessorsCount}. Машины привязаны.`);

  // ==========================================
  // ЭТАП 2: Заявки на партнерство
  // ==========================================
  console.log('📝 Генерируем заявки на партнерство...');
  const requestsToInsert: Partial<PartnershipRequest>[] = [];
  const fakeBrands = [
    'Toyota',
    'BMW',
    'Audi',
    'Mercedes',
    'Kia',
    'Hyundai',
    'Porsche',
    'Tesla',
  ];
  const fakeModels = [
    'Camry',
    'X5',
    'A6',
    'E-Class',
    'Rio',
    'Solaris',
    'Macan',
    'Model 3',
  ];
  const fakeNames = [
    'Иван Иванов',
    'Алексей Петров',
    'Дмитрий Соколов',
    'Мария Сидорова',
    'Анна Кузнецова',
  ];

  for (let i = 0; i < 50; i++) {
    const statusRand = Math.random();
    let status = RequestStatus.NEW;
    if (statusRand > 0.4 && statusRand <= 0.7) status = RequestStatus.REJECTED;
    if (statusRand > 0.7) status = RequestStatus.APPROVED;

    const user = randomElement(users);

    requestsToInsert.push({
      user: user,
      // 👇 ДОБАВЛЯЕМ ЭТИ ПОЛЯ
      owner_name: randomElement(fakeNames),
      owner_phone: `+7999${randomInt(1000000, 9999999)}`,
      // -----------------------
      car_brand: randomElement(fakeBrands),
      car_model: randomElement(fakeModels),
      car_year: randomInt(2015, 2024),
      status: status,
      created_at: addDays(new Date(), -randomInt(1, 60)),
    });
  }
  await requestRepo.save(requestsToInsert);
  console.log('✅ 50 Заявок успешно создано.');

  // ==========================================
  // ЭТАП 3: Генерация Аренд
  // ==========================================
  console.log(`🚗 Генерируем 1000 бронирований...`);
  const rentalsToInsert: Partial<Rental>[] = [];
  const now = new Date();

  for (let i = 0; i < 1000; i++) {
    const user = randomElement(users);
    const car = randomElement(cars);

    // Вероятности: 60% COMPLETED, 15% ACTIVE, 15% APPROVED, 5% CREATED, 5% OVERDUE
    const rand = Math.random();
    let status: RentalStatus;
    let startDate: Date;
    let endDate: Date;
    let actualReturnDate: Date | null = null;
    const startMileage = car.current_mileage - randomInt(100, 5000);
    let endMileage: number | null = null;

    if (rand < 0.6) {
      status = RentalStatus.COMPLETED;
      startDate = addDays(now, -randomInt(3, 180));
      endDate = addDays(startDate, randomInt(1, 14));
      actualReturnDate = addDays(endDate, randomInt(-1, 0));
      endMileage = startMileage + randomInt(50, 1000);
    } else if (rand < 0.75) {
      status = RentalStatus.ACTIVE;
      startDate = addDays(now, -randomInt(1, 5));
      endDate = addDays(now, randomInt(1, 10));
    } else if (rand < 0.9) {
      status = RentalStatus.APPROVED;
      startDate = addDays(now, randomInt(1, 30));
      endDate = addDays(startDate, randomInt(1, 14));
    } else if (rand < 0.95) {
      status = RentalStatus.CREATED;
      startDate = addDays(now, randomInt(5, 40));
      endDate = addDays(startDate, randomInt(1, 7));
    } else {
      status = RentalStatus.OVERDUE;
      startDate = addDays(now, -randomInt(5, 10));
      endDate = addDays(now, -randomInt(1, 3));
    }

    const days = Math.ceil(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
    );
    const basePriceCalc = days * car.price_per_day;
    let discountPercent = 0;

    if (car.discount_tiers) {
      const tiers = Object.keys(car.discount_tiers)
        .map(Number)
        .sort((a, b) => b - a);
      for (const tier of tiers) {
        if (days >= tier) {
          discountPercent = (car.discount_tiers as any)[tier];
          break;
        }
      }
    }

    const discountAmount = Math.floor((basePriceCalc * discountPercent) / 100);
    const finalBasePrice = basePriceCalc - discountAmount;

    let penalty = 0;
    if (
      status === RentalStatus.COMPLETED &&
      actualReturnDate &&
      actualReturnDate > endDate
    ) {
      penalty = randomInt(1000, 5000); // Штраф за просрочку или перепробег
    }

    // В активных и завершенных цена фиксируется
    const totalPrice =
      status === RentalStatus.COMPLETED || status === RentalStatus.ACTIVE
        ? finalBasePrice + penalty
        : null;

    rentalsToInsert.push({
      user,
      car, // ВАЖНО: тут car уже содержит owner (партнера), если он есть!
      status,
      start_date: startDate,
      end_date: endDate,
      actual_return_date: actualReturnDate,
      start_fuel: 100,
      end_fuel: status === RentalStatus.COMPLETED ? randomInt(20, 100) : null,
      start_mileage: [RentalStatus.CREATED, RentalStatus.APPROVED].includes(
        status,
      )
        ? null
        : startMileage,
      end_mileage: endMileage,
      base_price: finalBasePrice,
      penalty_price: penalty,
      total_price: totalPrice,
    });
  }

  // Сохраняем аренды в БД (чанками)
  console.log('💾 Сохраняем аренды...');
  const chunkSize = 100;
  const savedRentals: Rental[] = [];
  for (let i = 0; i < rentalsToInsert.length; i += chunkSize) {
    const chunk = rentalsToInsert.slice(i, i + chunkSize);
    const savedChunk = await rentalRepo.save(chunk);
    savedRentals.push(...savedChunk);
    process.stdout.write('.');
  }
  console.log('\n✅ Аренды сохранены.');

  // ==========================================
  // ЭТАП 4: Генерация Транзакций (Финансы)
  // ==========================================
  console.log('💸 Генерируем транзакции для партнеров...');
  const transactionsToInsert: Partial<Transaction>[] = [];

  for (const rental of savedRentals) {
    // Транзакции создаем ТОЛЬКО для завершенных или активных (оплаченных) аренд
    // И ТОЛЬКО если у машины есть владелец-партнер!
    if (![RentalStatus.COMPLETED, RentalStatus.ACTIVE].includes(rental.status))
      continue;
    if (!rental.car.owner) continue;

    const amount = rental.total_price || rental.base_price;
    // Доля партнера (80%) и комиссия сервиса (20%)
    const lessorIncome = Math.floor(amount * 0.8);
    const serviceFee = amount - lessorIncome;

    // Имитируем выплаты: если аренда была больше 15 дней назад — статус PAID
    const daysSinceStart =
      (now.getTime() - rental.start_date.getTime()) / (1000 * 60 * 60 * 24);
    const payoutStatus =
      daysSinceStart > 15 ? PayoutStatus.PAID : PayoutStatus.PENDING;

    transactionsToInsert.push({
      type: TransactionType.RENTAL_PAYMENT, // 👈 Было 'RENTAL_PAYMENT', стал ENUM
      total_amount: amount, // 👈 Проверь: в энтити поле total_amount, а в сидере было amount
      lessor_income: lessorIncome,
      system_fee: serviceFee, // 👈 Проверь: в энтити system_fee, а в сидере было service_fee
      payout_status: payoutStatus,
      car: rental.car,
      rental: rental,
      lessor: rental.car.owner,
      created_at: rental.start_date,
    });
  }

  // Сохраняем транзакции чанками
  for (let i = 0; i < transactionsToInsert.length; i += chunkSize) {
    const chunk = transactionsToInsert.slice(i, i + chunkSize);
    await txRepo.save(chunk);
  }

  console.log(
    `✅ Создано ${transactionsToInsert.length} финансовых транзакций.`,
  );

  console.log(
    '🎉 СИДЕР УСПЕШНО ЗАВЕРШИЛ РАБОТУ! Твоя база данных теперь шедевр.',
  );
  await app.close();
  process.exit(0);
}

bootstrap().catch((err) => {
  console.error('Fatal error during seeding:', err);
  process.exit(1);
});

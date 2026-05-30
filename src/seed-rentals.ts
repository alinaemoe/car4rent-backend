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
  DepositStatus,
  PaymentStatus,
} from './entities/transaction.entity';
import {
  PartnershipRequest,
  RequestStatus,
} from './entities/partnership-request.entity';
// 👇 ДОБАВЛЯЕМ ИМПОРТ ОТЗЫВОВ
import { Review } from './entities/review.entity';

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
  // 👇 ДОБАВЛЯЕМ РЕПОЗИТОРИЙ ОТЗЫВОВ
  const reviewRepo = app.get<Repository<Review>>(getRepositoryToken(Review));

  console.log('🧹 Очищаем старые данные...');

  // Порядок важен из-за Foreign Keys
  await txRepo.query('TRUNCATE TABLE "transactions" CASCADE');
  await rentalRepo.query('TRUNCATE TABLE "rentals" CASCADE');
  await requestRepo.query('TRUNCATE TABLE "partnership_requests" CASCADE');
  // 👇 ЧИСТИМ ТАБЛИЦУ ОТЗЫВОВ
  await reviewRepo.query('TRUNCATE TABLE "reviews" CASCADE');

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
    if (Math.random() < 0.3) {
      const owner = randomElement(users);
      car.owner = owner;
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

    requestsToInsert.push({
      user: randomElement(users),
      owner_name: randomElement(fakeNames),
      owner_phone: `+7999${randomInt(1000000, 9999999)}`,
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
      penalty = randomInt(30, 150);
    }

    const totalPrice =
      status === RentalStatus.COMPLETED || status === RentalStatus.ACTIVE
        ? finalBasePrice + penalty
        : null;

    rentalsToInsert.push({
      user,
      car,
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
  console.log('💸 Генерируем транзакции для аренд...');
  const transactionsToInsert: Partial<Transaction>[] = [];

  for (const rental of savedRentals) {
    if (![RentalStatus.COMPLETED, RentalStatus.ACTIVE].includes(rental.status))
      continue;
    if (!rental.car.owner) continue;

    const baseAmount = Number(rental.base_price);
    const penaltyAmount = Math.max(0, Number(rental.penalty_price || 0));
    const totalAmount = baseAmount + penaltyAmount;

    const lessorIncome = Math.floor(baseAmount * 0.8);
    let systemFee = baseAmount - lessorIncome;
    systemFee += penaltyAmount;

    const depositAmount = Number(rental.car.deposit_amount || 0);
    let depositStatus = DepositStatus.NOT_APPLICABLE;
    if (depositAmount > 0) {
      const actualEnd = rental.actual_return_date || rental.end_date;
      const daysSinceEnd =
        (now.getTime() - actualEnd.getTime()) / (1000 * 60 * 60 * 24);
      if (rental.status === RentalStatus.COMPLETED && daysSinceEnd > 30) {
        depositStatus = DepositStatus.RETURNED;
      } else {
        depositStatus = DepositStatus.HELD;
      }
    }

    const daysSinceStart =
      (now.getTime() - rental.start_date.getTime()) / (1000 * 60 * 60 * 24);
    const payoutRand = Math.random();
    let payoutStatus: PayoutStatus;
    if (rental.status === RentalStatus.ACTIVE || payoutRand < 0.08) {
      payoutStatus = PayoutStatus.NOT_APPLICABLE;
    } else if (
      daysSinceStart > 30 ||
      (daysSinceStart > 15 && payoutRand < 0.7)
    ) {
      payoutStatus = PayoutStatus.PAID;
    } else {
      payoutStatus = PayoutStatus.PENDING;
    }

    const paymentRand = Math.random();
    let paymentStatus: PaymentStatus;
    if (rental.status === RentalStatus.ACTIVE) {
      paymentStatus = PaymentStatus.PENDING;
    } else if (paymentRand < 0.04) {
      paymentStatus = PaymentStatus.REFUNDED;
    } else {
      paymentStatus = PaymentStatus.PAID;
    }

    transactionsToInsert.push({
      type: TransactionType.RENTAL_PAYMENT,
      total_amount: totalAmount,
      lessor_income: lessorIncome,
      system_fee: systemFee,
      payout_status: payoutStatus,
      car: rental.car,
      rental: rental,
      lessor: rental.car.owner,
      created_at: rental.start_date,
      base_rental_amount: baseAmount,
      penalty_amount: penaltyAmount,
      deposit_amount: depositAmount,
      deposit_status: depositStatus,
      payment_status: paymentStatus,
      customer_total: totalAmount + depositAmount,
    });
  }

  // --- дополнительные PENALTY / DAMAGE_COMPENSATION транзакции ---
  const extraTypes: {
    type: TransactionType;
    minAmount: number;
    maxAmount: number;
  }[] = [
    { type: TransactionType.PENALTY, minAmount: 20, maxAmount: 200 },
    {
      type: TransactionType.DAMAGE_COMPENSATION,
      minAmount: 100,
      maxAmount: 800,
    },
  ];
  const rentalsWithOwner = savedRentals.filter(
    (r) => r.car.owner && [RentalStatus.COMPLETED].includes(r.status),
  );
  for (const extra of extraTypes) {
    const count = Math.min(15, rentalsWithOwner.length);
    const shuffled = [...rentalsWithOwner].sort(() => Math.random() - 0.5);
    for (let i = 0; i < count; i++) {
      const rental = shuffled[i];
      const extraAmount = randomInt(extra.minAmount, extra.maxAmount);
      transactionsToInsert.push({
        type: extra.type,
        total_amount: extraAmount,
        lessor_income: 0,
        system_fee: extraAmount,
        payout_status:
          Math.random() < 0.5 ? PayoutStatus.PAID : PayoutStatus.PENDING,
        car: rental.car,
        rental: rental,
        lessor: rental.car.owner,
        created_at: addDays(rental.end_date, randomInt(1, 10)),
        base_rental_amount: 0,
        penalty_amount:
          extra.type === TransactionType.PENALTY ? extraAmount : 0,
        deposit_amount: 0,
        deposit_status: DepositStatus.NOT_APPLICABLE,
        payment_status: PaymentStatus.PAID,
        customer_total: extraAmount,
      });
    }
  }

  for (let i = 0; i < transactionsToInsert.length; i += chunkSize) {
    const chunk = transactionsToInsert.slice(i, i + chunkSize);
    await txRepo.save(chunk);
  }
  console.log(
    `✅ Создано ${transactionsToInsert.length} финансовых транзакций.`,
  );

  // ==========================================
  // 🔥 ЭТАП 5: МЕГА-ГЕНЕРАЦИЯ ОТЗЫВОВ 🔥
  // ==========================================
  console.log('⭐️ Насыпаем 3000 отзывов для красоты карточек...');

  const reviewsToInsert: Partial<Review>[] = [];

  const goodComments = [
    'Отличная машина, все понравилось!',
    'Чистый салон, едет бодро. Рекомендую.',
    'Взял на выходные, никаких проблем.',
    'Топовая тачка, владелец супер адекватный.',
    'Машина огонь! Вернусь еще.',
    'Все прошло гладко. Рекомендую этого арендодателя.',
    'Состояние идеальное, пахнет новьем.',
    'Очень комфортный автомобиль для дальних поездок.',
  ];
  const neutralComments = [
    'Нормально, но можно было бы помыть перед сдачей.',
    'Едет ок, но расход великоват.',
    'Обычная машина за свои деньги.',
    'В целом пойдет, но кондиционер слабоват.',
  ];
  const badComments = [
    'Гремит подвеска, не советую.',
    'Салон прокурен, хотя было заявлено обратное.',
    'Машина глохла на светофорах.',
    'Не очень приятный опыт, машина уставшая.',
  ];

  for (let i = 0; i < 3000; i++) {
    const car = randomElement(cars);
    const user = randomElement(users);

    // Генерируем реалистичный рейтинг (в основном хорошие отзывы)
    const ratingChance = Math.random();
    let rating: number;
    let comment: string;

    if (ratingChance < 0.75) {
      // 75% отличных отзывов
      rating = randomInt(4, 5);
      comment = randomElement(goodComments);
    } else if (ratingChance < 0.9) {
      // 15% средних
      rating = 3;
      comment = randomElement(neutralComments);
    } else {
      // 10% негатива для реалистичности
      rating = randomInt(1, 2);
      comment = randomElement(badComments);
    }

    reviewsToInsert.push({
      user,
      car,
      rating,
      comment,
      // Дата отзыва за последний год
      created_at: addDays(now, -randomInt(1, 365)),
    });
  }

  // Сохраняем чанками
  for (let i = 0; i < reviewsToInsert.length; i += chunkSize) {
    const chunk = reviewsToInsert.slice(i, i + chunkSize);
    await reviewRepo.save(chunk);
    process.stdout.write('*'); // Звездочки вместо точек для отзывов
  }
  console.log(
    `\n✅ Успешно добавлено ${reviewsToInsert.length} отзывов! Карточки авто теперь оживут.`,
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

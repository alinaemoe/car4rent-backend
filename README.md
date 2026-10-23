# Car4Rent API

**The backend of a full car-rental platform: roles, bookings, a financial ledger, document verification and 3D damage records.**

## The Car4Rent system

| Repo | Role | Stack |
|---|---|---|
| **car4rent-backend** | REST API, auth, bookings, payments ledger, media | NestJS 11, TypeORM, PostgreSQL |
| **car4rent-mobile** | Customer and car-owner app (Android / iOS) | Expo / React Native, Redux Toolkit, TanStack Query |
| **car4rent-admin** | Back-office for managers | Refine 5, MUI 6, React Three Fiber |
| **car4rent-landing** | Public marketing site and lead capture | React 19, Vite, i18next, Framer Motion |

Car4Rent is a peer-to-peer and fleet **car rental platform** built as a diploma project: clients search
and book cars, owners publish and manage theirs, and managers run the whole thing from the admin panel.

## What the API does

- **Auth with real-world details.** Email + OTP verification (6 digits, hashed, 15-minute expiry,
  attempt limit), JWT access token (15 min) with a **rotating refresh token** (60 days), password
  reset by OTP, bcrypt hashes. Global `JwtAuthGuard` and `RolesGuard` with `@Public()` / `@Roles()`
  decorators; a user can hold several roles at once (`CLIENT`, `LESSOR`, `ADMIN`, `MANAGER`).
- **Catalogue.** Cars with multilingual descriptions (`jsonb`), feature sets, images on Cloudinary,
  pick-up locations, tiered discounts, visibility toggles and reviews.
- **Rental lifecycle.** `CREATED -> APPROVED -> ACTIVE -> COMPLETED / CANCELED / OVERDUE` with fuel
  levels, penalties and a scheduled job (`@nestjs/schedule`) that moves rentals through statuses.
- **Damage records in 3D.** Each damage stores its type, repair cost, payment state, photo and the
  **x / y / z coordinates on the car model**, rendered as pins in the admin panel.
- **Financial ledger.** Transactions for rental payments, penalties and damage compensation with
  system fee, lessor income, payout and deposit status; dashboard endpoints for stats.
- **Document verification.** Passport and driver-licence uploads with `PENDING / VERIFIED / REJECTED`
  and a rejection reason.
- **Partnerships and leads.** Owner partnership requests and rental leads from the landing page.
- **CMS-style content.** News, FAQ, translations, languages and settings, all multilingual.
- **Safe defaults.** Global `ValidationPipe` (whitelist, forbid unknown fields, transform), Swagger
  docs at `/api/docs`, 17 TypeORM entities, 20 unit-test files.

## Stack

NestJS 11, TypeORM, PostgreSQL, Passport-JWT, class-validator, Multer + Cloudinary, Nodemailer,
`@nestjs/schedule`, Swagger, Docker Compose.

## Run

```bash
cp .env.example .env     # fill in DB, JWT, Cloudinary and mail settings
npm install
npm run start:dev        # http://localhost:3000, Swagger at /api/docs
```

All secrets come from environment variables (see `.env.example`). `DEMO_MASTER_OTP` is an
optional demo-only OTP that is accepted instead of the emailed code - leave it empty in production.

## Project layout

`src/auth`, `users`, `cars`, `rentals` (+ cron), `car-damages`, `transactions`,
`user-documents`, `locations`, `features`, `reviews`, `news`, `faq`, `languages`,
`translations`, `settings`, `partnership-requests`, `rental-leads`, `dashboard`,
`cloudinary`, `email`, `entities`, `migrations`.
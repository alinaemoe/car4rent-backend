import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module'; // Import UsersModule
import { EmailModule } from 'src/email/email.module';
import { jwtConstants } from './constants';
import { JwtStrategy } from './jwt.strategy';

@Module({
  imports: [
    UsersModule, // We need access to UsersService
    PassportModule,
    EmailModule,
    JwtModule.register({
      secret: jwtConstants.secret,
      signOptions: { expiresIn: '24h' }, // Token lives for 24 hours
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy], // Register Strategy here!
  exports: [AuthService],
})
export class AuthModule {}

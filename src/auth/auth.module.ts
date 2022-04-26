import Config from './../config';

import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';

import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { JWTStrategy } from './jwt.strategy';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
	imports: [
		TypeOrmModule.forFeature(),
		PassportModule.register({ defaultStrategy: 'jwt' }),
		JwtModule.register({
			secret: Config.Auth.JWTSecret,
			signOptions: {
				expiresIn: "3d"
			}
		})
	],
	controllers: [AuthController],
	providers: [AuthService, JWTStrategy],
	exports: [
		JWTStrategy,
		PassportModule,
		JwtModule
	]
})

export class AuthModule {}

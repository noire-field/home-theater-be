import Config from './config';

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

import cookieParser from 'cookie-parser';

async function bootstrap() {
	const app = await NestFactory.create(AppModule);

	app.use(cookieParser());
	app.enableCors({ credentials: true, origin: Config.General.ClientDomain });

	await app.listen(Config.General.MainPort);
}

bootstrap();

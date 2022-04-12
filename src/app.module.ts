import config from './config';
import * as ormconfig from './ormconfig';

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { ShowModule } from './show/show.module';

@Module({
	imports: [
		TypeOrmModule.forRoot(ormconfig),
		AuthModule,
		ShowModule
	],
	controllers: [],
	providers: [],
})

export class AppModule {}

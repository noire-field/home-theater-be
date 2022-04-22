import config from './config';
import * as ormconfig from './ormconfig';

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule'
import { AuthModule } from './auth/auth.module';
import { ShowModule } from './show/show.module';
import { WatchModule } from './watch/watch.module';

@Module({
	imports: [
		TypeOrmModule.forRoot(ormconfig),
		ScheduleModule.forRoot(),
		AuthModule,
		ShowModule,
		WatchModule
	],
	controllers: [],
	providers: [],
})

export class AppModule {}

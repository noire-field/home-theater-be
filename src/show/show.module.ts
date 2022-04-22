import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from 'src/auth/auth.module';
import { WatchModule } from 'src/watch/watch.module';
import { ShowController } from './show.controller';
import { ShowRepository } from './show.repository';
import { ShowService } from './show.service';

@Module({
	imports: [
		AuthModule,
		WatchModule,
		TypeOrmModule.forFeature([ShowRepository]),
	],
	controllers: [ShowController],
	providers: [ShowService],
	exports: [ShowService]
})
export class ShowModule {}

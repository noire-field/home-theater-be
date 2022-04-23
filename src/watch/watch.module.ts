import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from 'src/auth/auth.module';
import { ShowRepository } from 'src/show/show.repository';
import { WatchController } from './watch.controller';
import { WatchGateway } from './watch.gateway';
import { WatchService } from './watch.service';

@Module({	
	imports: [
		AuthModule,
		TypeOrmModule.forFeature([ShowRepository]),
	],
	controllers: [WatchController],
	providers: [WatchService, WatchGateway],
	exports: [WatchService]
})

export class WatchModule {}

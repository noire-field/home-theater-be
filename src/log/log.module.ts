import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from 'src/auth/auth.module';
import { LogController } from './log.controller';
import { LogRepository } from './log.repository';
import { LogService } from './log.service';

@Module({
	imports: [
		AuthModule,
		TypeOrmModule.forFeature([LogRepository])
	],
	controllers: [LogController],
	providers: [LogService],
	exports: []
})
export class LogModule {}

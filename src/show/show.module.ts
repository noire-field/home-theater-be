import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from 'src/auth/auth.module';
import { ShowController } from './show.controller';
import { ShowRepository } from './show.repository';
import { ShowService } from './show.service';

@Module({
	imports: [
		AuthModule,
		TypeOrmModule.forFeature([ShowRepository]),
	],
	controllers: [ShowController],
	providers: [ShowService],
	exports: [ShowService]
})
export class ShowModule {}

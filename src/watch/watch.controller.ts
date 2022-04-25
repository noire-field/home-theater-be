import { Controller, Get, Param, Post } from '@nestjs/common';
import { IRoomFound } from './@types/Watch.interface';
import { WatchService } from './watch.service';

@Controller('watch')
export class WatchController {
    constructor(private readonly watchService: WatchService) { }

    @Get('/find-room/:passCode')
    async FindRoom(@Param('passCode') passCode: string): Promise<IRoomFound> {
        return this.watchService.FindRoom(passCode);
    }

    @Get()
    async GetWatchList(): Promise<any> {
        return this.watchService.GetWatchList();
    }


}

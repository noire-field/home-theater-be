import { Controller, Get } from '@nestjs/common';
import { IWatchShow } from './@types/Watch.interface';
import { WatchService } from './watch.service';

@Controller('watch')
export class WatchController {
    constructor(private readonly watchService: WatchService) { }

    @Get()
    async GetWatchList(): Promise<any> {
        return this.watchService.GetWatchList();
    }
}

import { Controller, Get, Post } from '@nestjs/common';
import { IWatchShow } from './@types/Watch.interface';
import { WatchService } from './watch.service';

@Controller('watch')
export class WatchController {
    constructor(private readonly watchService: WatchService) { }

    /*
    @Post('/request-socket-token')
    async RequestToken(): Promise<string> {
        return this.watchService.RequestSocketToken();
    }*/

    @Get()
    async GetWatchList(): Promise<any> {
        return this.watchService.GetWatchList();
    }


}

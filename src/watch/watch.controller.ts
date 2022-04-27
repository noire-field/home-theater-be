import { Body, Controller, Get, HttpCode, Param, ParseIntPipe, Patch, Post, Req, UseGuards, ValidationPipe } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Response, Request } from 'express';

import { IJoinRoom, IRoomFound } from './@types/Watch.interface';
import { JoinRoomDTO } from './dto/JoinRoom.dto';
import { WatchService } from './watch.service';

@Controller('watch')
export class WatchController {
    constructor(private readonly watchService: WatchService) { }

    @Get('/find-room/:passCode')
    async FindRoom(@Param('passCode') passCode: string): Promise<IRoomFound> {
        return this.watchService.FindRoom(passCode);
    }

    @Post('/room/:passCode/join')
    @HttpCode(200)
    async JoinRoom(
        @Param('passCode') passCode: string,
        @Body(ValidationPipe) joinRoomDTO: JoinRoomDTO,
        @Req() req: Request
    ): Promise<IJoinRoom> {
        return this.watchService.JoinRoom(req, passCode, joinRoomDTO);
    }

    @UseGuards(AuthGuard())
    @Patch('/room/:passCode/add-wait-time')
    async AddWaitTime(
        @Param('passCode') passCode: string,
        @Body('minuteAmount', ParseIntPipe) minuteAmount: number
    ): Promise<string> {
        return this.watchService.AddWaitTime(passCode, minuteAmount);
    }

    @UseGuards(AuthGuard())
    @Patch('/room/:passCode/start-now')
    async StartNow(
        @Param('passCode') passCode: string
    ): Promise<string> {
        return this.watchService.StartNow(passCode);
    }

    @Get()
    async GetWatchList(): Promise<any> {
        return this.watchService.GetWatchList();
    }


}

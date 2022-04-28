import Config from './../config';

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { JwtService } from '@nestjs/jwt';
import {  Request } from 'express';
import axios from 'axios';
const { default: srtParser2 } = require("srt-parser-2")

import { Show } from 'src/show/show.entity';
import { ShowRepository } from 'src/show/show.repository';

import { IJoinRoom, IRoomFound, IWatchShow } from './@types/Watch.interface';
import { WatchGateway } from './watch.gateway';
import { WatchStatus } from './watchStatus.enum';
import { JoinRoomDTO } from './dto/JoinRoom.dto';
import { JWTPayload } from 'src/auth/jwt-payload.interface';
import { ShowStatus } from 'src/show/showStatus.enum';

@Injectable()
export class WatchService {
    // Different Key but same Reference Value
    private watchList: Map<number, IWatchShow>;
    private watchListByCode: Map<string, IWatchShow>;

    constructor(
        @InjectRepository(ShowRepository) private showRepo: ShowRepository,
        private jwtService: JwtService,
        private watchGateway: WatchGateway
    ) {
        this.watchList = new Map(); 
        this.watchListByCode = new Map();
    }

    GetRoom(passCode: string): IWatchShow {
        return this.watchListByCode.get(passCode);
    }

    async FindRoom(passCode: string): Promise<IRoomFound> {
        if(!this.watchListByCode.has(passCode))
            throw new NotFoundException({ message: 'This room can not be found.', langCode: 'Error:Watch.RoomNotFound' });

        const watch = this.watchListByCode.get(passCode);
        return { showTitle: watch.show.title, realStartTime: watch.realStartTime } 
    }

    async JoinRoom(req: Request, passCode: string, joinRoomDTO: JoinRoomDTO): Promise<IJoinRoom> {
        if(!this.watchListByCode.has(passCode))
            throw new NotFoundException({ message: 'This room can not be found.', langCode: 'Error:Watch.RoomNotFound' });
        
        // Check for admin
        const auth = await this.ManuallyCheckAuth(req);

        if(await this.watchGateway.JoinRoom(passCode, joinRoomDTO, auth) !== true) 
            throw new BadRequestException({ message: 'Unable to join this room. (Socket Not Found)', langCode: 'Error:Watch.UnableToJoinRoomSocketNotFound' });

        const watch = this.watchListByCode.get(passCode);
        
        return { 
            showTitle: watch.show.title, 
            realStartTime: watch.realStartTime, 
            subtitles: joinRoomDTO.withSubtitle && watch.subtitle.on ? watch.subtitle.list : null 
        }
    }

    async AddWaitTime(passCode: string, minuteAmount: number): Promise<string> {
        if(!this.watchListByCode.has(passCode))
            throw new NotFoundException({ message: 'This room can not be found.', langCode: 'Error:Watch.RoomNotFound' });
        
        const watch = this.watchListByCode.get(passCode);
        if(watch.status != WatchStatus.WATCH_WAITING) // Not in Waiting Mode anymore, can not add more time
            throw new BadRequestException({ message: 'The movie has already started.', langCode: 'Error:Watch.MovieAlreadyStarted' });

        var newStartTime = new Date(watch.realStartTime.getTime() + (minuteAmount * 60 * 1000));

        watch.realStartTime = newStartTime;
        watch.show.startTime = newStartTime;

        await watch.show.save();
        await this.watchGateway.SetStartTime(passCode, newStartTime);

        return 'OK';
    }

    async StartNow(passCode: string): Promise<string> {
        if(!this.watchListByCode.has(passCode))
            throw new NotFoundException({ message: 'This room can not be found.', langCode: 'Error:Watch.RoomNotFound' });
        
        const watch = this.watchListByCode.get(passCode);
        if(watch.status != WatchStatus.WATCH_WAITING) // Not in Waiting Mode anymore, can not start
            throw new BadRequestException({ message: 'The movie has already started.', langCode: 'Error:Watch.MovieAlreadyStarted' });

        // We don't actually start right away, but set the countdown to 5s
        var newStartTime = new Date(new Date().getTime() + (5 * 1000));

        watch.realStartTime = newStartTime;
        await this.watchGateway.SetStartTime(passCode, newStartTime);

        return 'OK';
    }

    private async StartShow(watch: IWatchShow): Promise<boolean> {
        if(watch.status !== WatchStatus.WATCH_WAITING)
            return false;

        watch.status = WatchStatus.WATCH_INIT;

        watch.show.status = ShowStatus.Watching;
        //await watch.show.save(); // Not yet

        await this.watchGateway.StartShow(watch);

        return true;
    }

    async GetWatchList(): Promise<any> {
        return Array.from(this.watchList);
    }

    async PushToList(show: Show, initPush: boolean = false) {
        // Is the show already in map?
        if(this.watchList.has(show.id)) {
            // Just delete it
            this.watchList.delete(show.id);
        }

        // Process it
        const watchShow: IWatchShow = {
            show,
            status: WatchStatus.WATCH_WAITING,
            realStartTime: show.startTime,
            subtitle: {
                on: false,
                list: []
            }
        }

        if(show.subtitleUrl && show.subtitleUrl.length > 0) {
            try {
                const { data } = await axios.get(show.subtitleUrl);
                const subContent = (new srtParser2).fromSrt(data);

                if(subContent.length <= 0) throw new Error('Unable to parse this subtitle (no line).');
                watchShow.subtitle.list = subContent;
                watchShow.subtitle.on = true;
            } catch(e) {
                throw new Error('Unable to parse this subtitle.');
            }
        }

        // Add new show
        this.watchList.set(show.id, watchShow)
        this.watchListByCode.set(show.passCode, watchShow);
        this.watchGateway.CreateRoom(show.passCode);
    }

    async ManuallyCheckAuth(req: Request) {
        const defaultReturn = { auth: false, level: 0 };

        if(!req || !req.cookies || !req.cookies['access_token'])
            return defaultReturn;

        var accessToken = req.cookies['access_token'];
        try {
            if(!this.jwtService.verify(accessToken, { secret: Config.Auth.JWTSecret }))
                return defaultReturn;
        } catch(e) {
            return defaultReturn;
        }

        const jwtData: JWTPayload = this.jwtService.decode(accessToken) as JWTPayload;
        return { auth: jwtData.loggedIn, level: jwtData.level };
    }

    @Cron(CronExpression.EVERY_SECOND)
    async ProcessWatch() {
        var currentTime = new Date();
        this.watchList.forEach(async (watch: IWatchShow, key: number) => {
            if(watch.status == WatchStatus.WATCH_WAITING) { // Wait to start
                if(currentTime.getTime() >= watch.realStartTime.getTime()) { // Start Time!
                    this.StartShow(watch);
                }
            } else if(watch.status == WatchStatus.WATCH_ONLINE) { // Watching
                console.log(`Show ${watch.show.title} is online!`);
            }
        });
    }
}

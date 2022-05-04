import Config from './../config';

import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
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
    private readonly logger = new Logger(WatchService.name);

    constructor(
        @InjectRepository(ShowRepository) private showRepo: ShowRepository,
        private jwtService: JwtService,
        private watchGateway: WatchGateway
    ) {
        this.watchList = new Map(); 
        this.watchListByCode = new Map();
        setInterval(this.ProcessWatch, 250);
    }

    GetRoom(passCode: string): IWatchShow {
        return this.watchListByCode.get(passCode);
    }

    async GetPreview(passCode: string): Promise<any> {
        if(!this.watchListByCode.has(passCode))
            throw new NotFoundException({ message: 'This room can not be found.', langCode: 'Error:Watch.RoomNotFound' });

        const watch = this.watchListByCode.get(passCode);
        if(watch.status !== WatchStatus.WATCH_WAITING)
            throw new NotFoundException({ message: 'This room has already started.', langCode: 'Error:Watch.RoomAlreadyStarted' });

        return { 
            showTitle: watch.show.title, 
            movieUrl: watch.show.movieUrl,
            duration: watch.show.duration,
            subtitles: watch.subtitle.on ? watch.subtitle.list : null 
        } 
    }

    async FindRoom(passCode: string): Promise<IRoomFound> {
        if(!this.watchListByCode.has(passCode))
            throw new NotFoundException({ message: 'This room can not be found.', langCode: 'Error:Watch.RoomNotFound' });

        const watch = this.watchListByCode.get(passCode);
        if(watch.status === WatchStatus.WATCH_FINISHED)
            throw new NotFoundException({ message: 'This room has already finished', langCode: 'Error:Watch.RoomAlreadyFinished' });

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
        if(watch.status === WatchStatus.WATCH_FINISHED)
            throw new NotFoundException({ message: 'This room has already finished', langCode: 'Error:Watch.RoomAlreadyFinished' });

        return { 
            showTitle: watch.show.title, 
            realStartTime: watch.realStartTime, 
            subtitles: joinRoomDTO.withSubtitle && watch.subtitle.on ? watch.subtitle.list : null,
            smartSync: watch.show.smartSync
        }
    }

    async AddWaitTime(passCode: string, minuteAmount: number): Promise<string> {
        if(!this.watchListByCode.has(passCode))
            throw new NotFoundException({ message: 'This room can not be found.', langCode: 'Error:Watch.RoomNotFound' });
        
        const watch = this.watchListByCode.get(passCode);
        if(watch.status != WatchStatus.WATCH_WAITING) // Not in Waiting Mode anymore, can not add more time
            throw new BadRequestException({ message: 'This room has already started.', langCode: 'Error:Watch.RoomAlreadyStarted' });

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
            throw new BadRequestException({ message: 'The room has already started.', langCode: 'Error:Watch.RoomAlreadyStarted' });

        // We don't actually start right away, but set the countdown to 5s
        var newStartTime = new Date(new Date().getTime() + (5 * 1000));

        watch.realStartTime = newStartTime;
        await this.watchGateway.SetStartTime(passCode, newStartTime);

        return 'OK';
    }

    private async PrepareShow(watch: IWatchShow): Promise<boolean> {
        if(watch.status !== WatchStatus.WATCH_WAITING)
            return false;

        watch.status = WatchStatus.WATCH_INIT;
        await this.watchGateway.PrepareShow(watch);

        return true;
    }

    private async StartShow(watch: IWatchShow): Promise<boolean> {
        if(watch.status !== WatchStatus.WATCH_INIT)
            return false;

        watch.status = WatchStatus.WATCH_ONLINE;
        watch.playing = true;

        watch.show.status = ShowStatus.Watching;
        //watch.show.save();

        await this.watchGateway.StartShow(watch);

        return true;
    }

    private async EndShow(watch: IWatchShow, endTime: Date): Promise<boolean> {
        if(watch.status !== WatchStatus.WATCH_ONLINE)
            return false;

        watch.status = WatchStatus.WATCH_FINISHED;
        watch.playing = false;
        watch.progress = watch.show.duration;

        watch.show.status = ShowStatus.Finished;
        watch.show.finishedAt = endTime;

        //watch.show.save();

        await this.watchGateway.EndShow(watch);

        return true;
    }

    private async RemoveShow(watch: IWatchShow): Promise<boolean> {
        if(watch.status !== WatchStatus.WATCH_FINISHED)
            return false;

        this.watchList.delete(watch.show.id);
        this.watchListByCode.delete(watch.show.passCode);
        this.watchGateway.RemoveRoom(watch.show.passCode);

        return true;
    }

    PauseShow(watch: IWatchShow): boolean {
        if(!watch.playing) return false;

        watch.playing = false;
        watch.progress = (new Date().getTime() - watch.realStartTime.getTime()) / 1000;

        return true;
    }

    ResumeShow(watch: IWatchShow): boolean {
        if(watch.playing) return false;

        watch.playing = true;
        watch.realStartTime = new Date(new Date().getTime() - (watch.progress * 1000));

        return true;
    }

    SlideShow(watch: IWatchShow, to: number): boolean {
        if(watch.status != WatchStatus.WATCH_ONLINE) return false;

        watch.progress = to;
        watch.realStartTime = new Date(new Date().getTime() - (watch.progress * 1000));

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
            playing: false,
            progress: 0.0,
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

        // Write Later

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

    //@Cron(CronExpression.EVERY_SECOND)
    private ProcessWatch = async () => {
        var currentTime = new Date();
        this.watchList.forEach(async (watch: IWatchShow, key: number) => {
            if(watch.status == WatchStatus.WATCH_WAITING) { // Wait to start
                if(currentTime.getTime() >= (watch.realStartTime.getTime() - (5 * 1000))) { // Prepare Time
                    this.PrepareShow(watch);
                }
            } else if(watch.status == WatchStatus.WATCH_INIT) { // Init
                if(currentTime.getTime() >= watch.realStartTime.getTime()) { // Start Time
                    this.StartShow(watch);
                }
            } else if(watch.status == WatchStatus.WATCH_ONLINE) { // Wait to end
                const showEndTime = watch.realStartTime.getTime() + (watch.show.duration * 1000)
                if(currentTime.getTime() >= showEndTime && watch.playing) { // End Time
                    this.EndShow(watch, new Date(showEndTime));
                }
            } else if(watch.status == WatchStatus.WATCH_FINISHED) { // Wait to delete
                const showRemoveTime = watch.realStartTime.getTime() + (watch.show.duration * 1000) + (10 * 1000)
                if(currentTime.getTime() >= showRemoveTime) { // End Time
                    this.RemoveShow(watch);
                }
            }
        });
    }
}

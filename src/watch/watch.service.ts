import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import axios from 'axios';
const { default: srtParser2 } = require("srt-parser-2")

import { Show } from 'src/show/show.entity';
import { ShowRepository } from 'src/show/show.repository';

import { IRoomFound, IWatchShow } from './@types/Watch.interface';
import { WatchGateway } from './watch.gateway';
import { WatchStatus } from './watchStatus.enum';

@Injectable()
export class WatchService {
    // Different Key but same Reference Value
    private watchList: Map<number, IWatchShow>;
    private watchListByCode: Map<string, IWatchShow>;

    constructor(
        @InjectRepository(ShowRepository) private showRepo: ShowRepository,
        private watchGateway: WatchGateway
    ) {
        this.watchList = new Map(); 
        this.watchListByCode = new Map();
    }

    async FindRoom(passCode: string): Promise<IRoomFound> {
        if(!this.watchListByCode.has(passCode))
            throw new NotFoundException({ message: 'This room can not be found.', langCode: 'Error:Watch.RoomNotFound' });

        const watch = this.watchListByCode.get(passCode);
        return { showTitle: watch.show.title, realStartTime: watch.realStartTime } 
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
            } catch(e) {
                throw new Error('Unable to parse this subtitle.');
            }
        }

        // Add new show
        this.watchList.set(show.id, watchShow)
        this.watchListByCode.set(show.passCode, watchShow);
    }

    @Cron(CronExpression.EVERY_SECOND)
    async ProcessWatch() {
        var currentTime = new Date();
        this.watchList.forEach(async (watch: IWatchShow, key: number) => {
            if(watch.status == WatchStatus.WATCH_WAITING) { // Wait to start
                if(currentTime.getTime() >= watch.realStartTime.getTime()) { // Start Time!

                }
            } else if(watch.status == WatchStatus.WATCH_ONLINE) { // Watching
                
            }
        });
    }
}

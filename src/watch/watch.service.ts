import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
const { default: srtParser2 } = require("srt-parser-2")
import axios from 'axios';

import { Show } from 'src/show/show.entity';
import { ShowRepository } from 'src/show/show.repository';

import { IWatchShow } from './@types/Watch.interface';
import { WatchStatus } from './watchStatus.enum';

@Injectable()
export class WatchService {
    private watchList: Map<number, IWatchShow>;

    constructor(@InjectRepository(ShowRepository) private showRepo: ShowRepository) {
        this.watchList = new Map(); 
    }

    async GetWatchList(): Promise<any> {
        return Array.from(this.watchList);
    }

    async PushToList(show: Show) {
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
    }
}

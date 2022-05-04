import Config from './../config';
import { BadRequestException, Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { In } from 'typeorm';
import axios from 'axios';
import { getVideoDurationInSeconds } from 'get-video-duration';
const { default: srtParser2 } = require("srt-parser-2")

import { Show } from './show.entity';
import { ShowRepository } from './show.repository';

import { CreateShowDTO } from './dto/createShow.dto';
import { UpdateShowDTO } from './dto/updateShow.dto';
import { ShowStatus } from './showStatus.enum';
import { WatchService } from 'src/watch/watch.service';

@Injectable()
export class ShowService {
    private processorBusy: boolean = false;
    private readonly logger = new Logger(ShowService.name);

    constructor(
        @InjectRepository(ShowRepository) private showRepo: ShowRepository,
        private watchService: WatchService
    ) {
        setTimeout(this.FetchShows, 5000); // Startup
    }

    // 'this' does not work with setTimeout
    FetchShows = async () => {
        try {
            var pendingShows: Show[] = await this.showRepo.find({ status: In([ShowStatus.Scheduled, ShowStatus.Watching ]) });
            if(pendingShows.length > 0) {
                pendingShows.forEach(async (s: Show) => {
                    try {
                        await this.watchService.PushToList(s, true);
                    } catch(e: any) {
                        s.status = ShowStatus.Error;
                        await s.save();

                        this.logger.error('Unable to push show for startup');
                        this.logger.error(e);
                    }
                })
            }

            this.logger.log(`Fetched ${pendingShows.length} show(s) for startup.`);
        } catch(e: any) {
            setTimeout(this.FetchShows, 5000); // Error fetching? Repeat
            this.logger.error('Unable to fetch shows for startup.');
        }
    }

    async Create(createShowDTO: CreateShowDTO): Promise<Show | string> {
        // Verify Start Time
        const currentTime = new Date();
        const startTime = new Date(Number(createShowDTO.startTime));
        const diffTime = (startTime.getTime() - currentTime.getTime())

        if(diffTime < 5 * 60 * 1000) 
            throw new BadRequestException({ message: 'Start time is too early, it needs to be at least 5 minutes later than current time.', langCode: 'Error:Show.StartTimeTooEarly' })

        // Verify PassCode (for duplication)
        const samePassShow = await this.showRepo.findOne({ passCode: createShowDTO.passCode, status: In([ShowStatus.Processing, ShowStatus.Scheduled, ShowStatus.Watching ]) });
        if(samePassShow)  throw new BadRequestException({ message: 'This pass code is being used by other show.', langCode: 'Error:Show.PassCodeIsBeingUsed' });

        // Verify Subtitle
        if(createShowDTO.subtitleUrl && createShowDTO.subtitleUrl.length > 0) {
            try {
                const { data } = await axios.get(createShowDTO.subtitleUrl);
                const subContent = (new srtParser2).fromSrt(data);

                if(subContent.length <= 0) throw new Error();
            } catch(e) {
                throw new BadRequestException({ message: 'Unable to parse this subtitle url.', langCode: 'Error:Show.UnableToParseSubtitle' });
            }
        }

        // Verify Video File
        try {
            var duration = await getVideoDurationInSeconds(createShowDTO.movieUrl);
        } catch(e) {
            throw new BadRequestException({ message: 'Unable to verify this video url.', langCode: 'Error:Show.UnableToVerifyVideoUrl' });
        }

        // Create Show
        const show = await this.showRepo.CreateShow(createShowDTO, duration);

        // Log
        //const logData = createEpisodeDTO;
        //await this.logService.InsertActionLog(LogType.Episode, LogAction.Create, 1, episode.id, JSON.stringify(logData));

        return show;
    }

    async GetList(): Promise<Show[]> {
        const shows = await this.showRepo.find({ order: {
            id: 'DESC'
        }, take: 25 });
        
        return shows;
    }

    async Update(id: number, updateShowDTO: UpdateShowDTO): Promise<Show> {
        const show = await this.showRepo.findOne({ id });
        if(!show) throw new NotFoundException({ message: 'Show not found.', langCode: 'Error:Show.NotFound'});

        if([ShowStatus.Scheduled, ShowStatus.Error].indexOf(show.status) === -1)
            throw new NotFoundException({ message: 'This show can not be edited at this time.', langCode: 'Error:Show.CantEditAnymore'});
        
        show.title = updateShowDTO.title;
        
        if(show.passCode != updateShowDTO.passCode) {
            const samePassShow = await this.showRepo.findOne({ passCode: updateShowDTO.passCode, status: In([ShowStatus.Processing, ShowStatus.Scheduled, ShowStatus.Watching ]) });
            if(samePassShow)  throw new BadRequestException({ message: 'This pass code is being used by other show.', langCode: 'Error:Show.PassCodeIsBeingUsed' });
    
            show.passCode = updateShowDTO.passCode;
        }

        if(show.movieUrl != updateShowDTO.movieUrl) {
            show.movieUrl = updateShowDTO.movieUrl;

            try {
                show.duration = await getVideoDurationInSeconds(updateShowDTO.movieUrl);
            } catch(e) {
                throw new BadRequestException({ message: 'Unable to verify this video url.', langCode: 'Error:Show.UnableToVerifyVideoUrl' });
            }
        } 

        if(show.subtitleUrl != updateShowDTO.subtitleUrl) {
            show.subtitleUrl = updateShowDTO.subtitleUrl || '';

            if(updateShowDTO.subtitleUrl && updateShowDTO.subtitleUrl.length > 0) {
                try {
                    const { data } = await axios.get(updateShowDTO.subtitleUrl);
                    const subContent = (new srtParser2).fromSrt(data);
    
                    if(subContent.length <= 0) throw new Error();
                } catch(e) {
                    throw new BadRequestException({ message: 'Unable to parse this subtitle url.', langCode: 'Error:Show.UnableToParseSubtitle' });
                }
            }
        }

        show.smartSync = updateShowDTO.smartSync == true ? 1 : 0;
        show.votingControl = updateShowDTO.votingControl == true ? 1 : 0;

        // Start Time
        const currentTime = new Date();
        const startTime = new Date(Number(updateShowDTO.startTime));
        const diffTime = (startTime.getTime() - currentTime.getTime())

        if(diffTime < 5 * 60 * 1000) 
            throw new BadRequestException({ message: 'Start time is too early, it needs to be at least 5 minutes later than current time.', langCode: 'Error:Show.StartTimeTooEarly' })

        show.startTime = new Date(Number(updateShowDTO.startTime));

        // Re-process
        show.status = ShowStatus.Processing;

        await show.save();

        // Log
        //const logData = updateEpisodeDTO;
        //await this.logService.InsertActionLog(LogType.Episode, LogAction.Edit, 1, id, JSON.stringify(logData));

        return show;
    }

    async Delete(id: number): Promise<void> {
        const show = await this.showRepo.findOne({ id });
        if(!show) throw new NotFoundException({ message: 'Show not found.', langCode: 'Error:Show.NotFound'});

        if([ShowStatus.Finished, ShowStatus.Error, ShowStatus.Cancelled].indexOf(show.status) === -1)
            throw new NotFoundException({ message: 'This show needs to be cancelled or finished first.', langCode: 'Error:Show.NeedToCancelOrFinish'});
        
        await show.softRemove();

        // Log
        //const logData = { id: episode.id, numberCode: episode.numberCode, deleteType: 'SoftDelete' };
        //await this.logService.InsertActionLog(LogType.Episode, LogAction.Delete, 1, id, JSON.stringify(logData));
    }

    @Cron(CronExpression.EVERY_5_SECONDS)
    async ProcessShow() {
        if(this.processorBusy) return;
        
        this.processorBusy = true;
        const show = await this.showRepo.findOne({ status: ShowStatus.Processing });
        if(!show) {
            this.processorBusy = false;
            return;
        }

        // Not much to process
        try {
            await this.watchService.PushToList(show);
            show.status = ShowStatus.Scheduled;
        } catch(e) {
            show.status = ShowStatus.Error;
        } 

        // Processed
        await show.save();
        this.processorBusy = false;

        this.logger.log(`Processed show [${show.title}].`);
    }
}

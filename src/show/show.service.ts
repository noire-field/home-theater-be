import Config from './../config';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In } from 'typeorm';
import { getVideoDurationInSeconds } from 'get-video-duration';
const { default: srtParser2 } = require("srt-parser-2")
import axios from 'axios';

import { Show } from './show.entity';
import { ShowRepository } from './show.repository';

import { CreateShowDTO } from './dto/createShow.dto';
import { UpdateShowDTO } from './dto/updateShow.dto';
import { ShowStatus } from './showStatus.enum';

@Injectable()
export class ShowService {
    constructor(
        @InjectRepository(ShowRepository) private showRepo: ShowRepository
    ) {}

    async Create(createShowDTO: CreateShowDTO): Promise<Show | string> {
        // Verify Start Time
        const currentTime = new Date();
        const startTime = new Date(Number(createShowDTO.startTime));
        const diffTime = (startTime.getTime() - currentTime.getTime())

        if(diffTime < 5 * 60 * 1000) 
            throw new BadRequestException({ message: 'Start time is too early, it needs to be at least 5 minutes later than current time.', langCode: 'Error:Dashboard.Show.StartTimeTooEarly' })

        // Verify PassCode (for duplication)
        const samePassShow = await this.showRepo.findOne({ passCode: createShowDTO.passCode, status: In([ShowStatus.Processing, ShowStatus.Scheduled, ShowStatus.Watching ]) });
        if(samePassShow)  throw new BadRequestException({ message: 'This pass code is being used by other show.', langCode: 'Error:Dashboard.Show.PassCodeIsBeingUsed' });

        // Verify Subtitle
        if(createShowDTO.subtitleUrl && createShowDTO.subtitleUrl.length > 0) {
            try {
                const { data } = await axios.get(createShowDTO.subtitleUrl);
                const subContent = (new srtParser2).fromSrt(data);

                if(subContent.length <= 0) throw new Error();
            } catch(e) {
                throw new BadRequestException({ message: 'Unable to parse this subtitle url', langCode: 'Error:Dashboard.Show.UnableToParseSubtitle' });
            }
        }

        // Verify Video File
        try {
            var duration = await getVideoDurationInSeconds(createShowDTO.movieUrl);
        } catch(e) {
            throw new BadRequestException({ message: 'Unable to verify this video url.', langCode: 'Error:Dashboard.Show.UnableToVerifyVideoUrl' });
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
            throw new NotFoundException({ message: 'This show can not be edited at this time.', langCode: 'Error:Dashboard.Show.CantEditAnymore'});
        
        show.title = updateShowDTO.title;
        
        if(show.passCode != updateShowDTO.passCode) {
            const samePassShow = await this.showRepo.findOne({ passCode: updateShowDTO.passCode, status: In([ShowStatus.Processing, ShowStatus.Scheduled, ShowStatus.Watching ]) });
            if(samePassShow)  throw new BadRequestException({ message: 'This pass code is being used by other show.', langCode: 'Error:Dashboard.Show.PassCodeIsBeingUsed' });
    
            show.passCode = updateShowDTO.passCode;
        }

        if(show.movieUrl != updateShowDTO.movieUrl) {
            show.movieUrl = updateShowDTO.movieUrl;

            try {
                show.duration = await getVideoDurationInSeconds(updateShowDTO.movieUrl);
            } catch(e) {
                throw new BadRequestException({ message: 'Unable to verify this video url.', langCode: 'Error:Dashboard.Show.UnableToVerifyVideoUrl' });
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
                    throw new BadRequestException({ message: 'Unable to parse this subtitle url', langCode: 'Error:Dashboard.Show.UnableToParseSubtitle' });
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
            throw new BadRequestException({ message: 'Start time is too early, it needs to be at least 5 minutes later than current time.', langCode: 'Error:Dashboard.Show.StartTimeTooEarly' })

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
            throw new NotFoundException({ message: 'This show needs to be cancelled or finished first.', langCode: 'Error:Dashboard.Show.NeedToCancelOrFinish'});
        
        await show.softRemove();

        // Log
        //const logData = { id: episode.id, numberCode: episode.numberCode, deleteType: 'SoftDelete' };
        //await this.logService.InsertActionLog(LogType.Episode, LogAction.Delete, 1, id, JSON.stringify(logData));
    }

}

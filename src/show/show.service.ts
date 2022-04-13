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
import { UpdateEpisodeDTO } from './dto/UpdateEpisode.dto';
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

    /*
    async GetList(seasonId: number): Promise<Episode[]> {
        const season = await this.FindSeason(seasonId);
        const episodes = await this.episodeRepo.find({ where: { season }, order: {
            sortOrder: 'ASC',
            id: 'ASC'
        } });
        
        return episodes || [];
    }

    

    async Update(id: number, updateEpisodeDTO: UpdateEpisodeDTO): Promise<Episode> {
        const episode = await this.episodeRepo.findOne({ id });
        if(!episode) throw new NotFoundException('Episode not found');
    
        episode.numberCode = updateEpisodeDTO.numberCode;
        episode.sortOrder = updateEpisodeDTO.sortOrder;

        var willBeDeleteAt = new Date();
        willBeDeleteAt.setSeconds(willBeDeleteAt.getSeconds() + Config.Episode.DeletionTime);

        episode.willBeDeleteAt = willBeDeleteAt;

        await episode.save();

        // Log
        const logData = updateEpisodeDTO;
        await this.logService.InsertActionLog(LogType.Episode, LogAction.Edit, 1, id, JSON.stringify(logData));

        return episode;
    }

    async Delete(id: number): Promise<void> {
        const episode = await this.episodeRepo.findOne({ id }, { relations: ['files'] });
        if(!episode) throw new NotFoundException('Episode not found');

        // Log
        const logData = { id: episode.id, numberCode: episode.numberCode, deleteType: 'SoftDelete' };

        // Delete all files
        await this.fileService.DeleteList(episode.files);
        await episode.softRemove();

        await this.logService.InsertActionLog(LogType.Episode, LogAction.Delete, 1, id, JSON.stringify(logData));
    }

    async FindSeason(seasonId: number, withSeries=false): Promise<Season> {
        const season = await this.seasonRepo.findOne(seasonId, { relations: withSeries ? ['series'] : []});
        if(!season) throw new NotFoundException('Season not found')

        return season;
    }

    // Add Log
    @Cron(CronExpression.EVERY_MINUTE)
    async CheckDeleteEpisode() {
        const episodes = await this.episodeRepo.find({ where: 'NOW() >= willBeDeleteAt', relations: ['files'] });
        if(episodes.length > 0) {
            episodes.forEach(async (e) => {
                await this.fileService.DeleteList(e.files);
                await e.softRemove();
            })

            // Log
            const logData = { deletedEpisode: episodes.map((ep) => ({ id: ep.id, numberCode: ep.numberCode })) }
            await this.logService.InsertActionLog(LogType.Episode, LogAction.AutoDelete, 0, null, JSON.stringify(logData));
        }
    }

    GetWeekOfMonth(date) {
        var firstWeekday = new Date(date.getFullYear(), date.getMonth(), 1).getDay() - 1;
        if (firstWeekday < 0) firstWeekday = 6;
        var offsetDate = date.getDate() + firstWeekday - 1;
        return Math.floor(offsetDate / 7);
    }

    GetWeekOfYear(d) {
        // Copy date so don't modify original
        d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
        // Set to nearest Thursday: current date + 4 - current day number
        // Make Sunday's day number 7
        d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay()||7));
        // Get first day of year
        var yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
        // Calculate full weeks to nearest Thursday
        var weekNo = Math.ceil(( ( (d - Number(yearStart)) / 86400000) + 1)/7);
        // Return array of year and week number
        return weekNo;
    }*/
}

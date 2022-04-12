import Config from './../config';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { Show } from './show.entity';
import { ShowRepository } from './show.repository';

import { CreateShowDTO } from './dto/createShow.dto';
import { UpdateEpisodeDTO } from './dto/UpdateEpisode.dto';

@Injectable()
export class ShowService {
    constructor(
        @InjectRepository(ShowRepository) private showRepo: ShowRepository
    ) {}

    async Create(createShowDTO: CreateShowDTO): Promise<Show | string> {
        

        /*const season = await this.FindSeason(seasonId, true);
        if(!season) throw new NotFoundException('Season not found');

        // Find Series
        const series = season.series;

        const now = new Date();

        series.newEpisodeAt = now;

        if(this.GetWeekOfYear(series.weeklyUpdatedAt) != this.GetWeekOfYear(now))
            series.weeklyUpdatedAt = now;

        if(series.monthlyUpdatedAt.getMonth() != now.getMonth())
            series.monthlyUpdatedAt = now;

        await series.save();

        // Create Episode
        const episode = await this.episodeRepo.CreateEpisode(createEpisodeDTO, season);

        // Log
        const logData = createEpisodeDTO;
        await this.logService.InsertActionLog(LogType.Episode, LogAction.Create, 1, episode.id, JSON.stringify(logData));

        return episode;*/

        return 'OK';
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

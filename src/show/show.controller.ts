import { Body, Controller, Get, Post, Patch, UseGuards, ValidationPipe, Delete, ParseIntPipe, Param, Query } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CreateShowDTO } from './dto/createShow.dto';
import { UpdateEpisodeDTO } from './dto/UpdateEpisode.dto';
import { Show } from './show.entity';
import { ShowService } from './show.service';

@Controller('shows')
@UseGuards(AuthGuard())
export class ShowController {
    constructor(private readonly showService: ShowService) {}

    @Post()
    async CreateShow(
        @Body(ValidationPipe) createShowDTO: CreateShowDTO): Promise<any> {
        return this.showService.Create(createShowDTO);
    }

    /*
    @Get()
    GetEpisodeList(@Query('seasonId', ParseIntPipe) seasonId: number): any {
        return this.episodeService.GetList(seasonId);
    }

    @Patch(':id')
    async UpdateEpisode(
        @Param('id', ParseIntPipe) id: number, 
        @Body(ValidationPipe) updateEpisodeDTO: UpdateEpisodeDTO): Promise<Episode> 
    {
        return this.episodeService.Update(id, updateEpisodeDTO);
    }

    @Delete(':id')
    async DeleteEpisode(@Param('id', ParseIntPipe) id: number): Promise<void> {
        return this.episodeService.Delete(id);
    }*/
}

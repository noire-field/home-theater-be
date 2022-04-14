import { Body, Controller, Get, Post, Patch, UseGuards, ValidationPipe, Delete, ParseIntPipe, Param, Query } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CreateShowDTO } from './dto/createShow.dto';
import { UpdateShowDTO } from './dto/updateShow.dto';
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

    @Get()
    async GetShowList(): Promise<Show[]> {
        return this.showService.GetList();
    }

    @Patch(':id')
    async UpdateShow(
        @Param('id', ParseIntPipe) id: number, 
        @Body(ValidationPipe) updateShowDTO: UpdateShowDTO): Promise<Show> 
    {
        return this.showService.Update(id, updateShowDTO);
    }

    @Delete(':id')
    async DeleteShow(@Param('id', ParseIntPipe) id: number): Promise<void> {
        return this.showService.Delete(id);
    }
}

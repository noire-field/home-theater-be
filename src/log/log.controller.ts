import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { LogService } from './log.service';

@Controller('logs')
@UseGuards(AuthGuard())
export class LogController {
    constructor(private readonly logService: LogService) {}

    @Get()
    GetRecentLogs(): any {
        return this.logService.GetRecentLogs();
    }
}

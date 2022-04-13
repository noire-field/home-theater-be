import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { LogRepository } from './log.repository';
import { LogCategory, LogType, LogAction } from './log.enum';
import { Log } from './log.entity';

@Injectable()
export class LogService {
    constructor(
        @InjectRepository(LogRepository) private logRepo: LogRepository
    ) {}

    async GetRecentLogs() {
        const logs = await this.logRepo.find({ order: { createdAt: 'DESC', id: 'DESC' }, take: 25 });
        return logs;
    }

    async InsertLog(category: LogCategory, type: LogType, action: LogAction, userId: number, targetId: number, change: string): Promise<Log> {
        return this.logRepo.InsertLog({ category, type, action, userId, targetId, change })
    }

    async InsertActionLog(type: LogType, action: LogAction, userId: number, targetId: number, change: string): Promise<Log> {
        return this.logRepo.InsertLog({ category: LogCategory.Action, type, action, userId, targetId, change })
    }
}

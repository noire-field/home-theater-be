import { EntityRepository, Repository } from "typeorm";
import { InsertLogDTO } from "./dto/InsertLog.dto";
import { Log } from "./log.entity";

@EntityRepository(Log)
export class LogRepository extends Repository<Log> {
    async InsertLog(insertLogDTO: InsertLogDTO): Promise<Log> {
        const log = new Log();

        log.category = insertLogDTO.category;
        log.type = insertLogDTO.type;
        log.action = insertLogDTO.action;
        log.userId = insertLogDTO.userId;
        log.targetId = insertLogDTO.targetId;
        log.change = insertLogDTO.change;
       
        await log.save();
        return log;
    }
}
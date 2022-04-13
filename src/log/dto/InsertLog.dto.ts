import { IsNumber, IsOptional, IsString } from "class-validator";
import { LogAction, LogCategory, LogType } from "../log.enum";

export class InsertLogDTO {
    @IsNumber()
    userId: number;

    @IsString()
    category: LogCategory;

    @IsString()
    type: LogType;

    @IsString()
    action: LogAction;

    @IsNumber()
    @IsOptional()
    targetId: number;

    @IsString()
    @IsOptional()
    change: string;
}
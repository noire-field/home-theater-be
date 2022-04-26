import { IsBoolean, IsOptional, IsString, MaxLength } from "class-validator";

export class JoinRoomDTO {
    @IsString()
    @MaxLength(64)
    clientId: string;

    @IsString()
    @MaxLength(16)
    friendlyName: string;

    @IsBoolean()
    @IsOptional()
    withSubtitle: boolean;
}
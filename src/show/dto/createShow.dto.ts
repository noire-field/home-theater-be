import { IsBoolean, IsNumber, IsOptional, IsString, Length, MaxLength } from "class-validator";

export class CreateShowDTO {
    @IsString()
    @Length(5, 5)
    passCode: string;

    @IsString()
    @Length(1, 250)
    title: string;

    @IsString()
    @Length(1, 250)
    movieUrl: string;

    @IsString()
    @IsOptional()
    @MaxLength(250)
    subtitleUrl: string;

    @IsOptional()
    @IsNumber()
    sortOrder: number;

    @IsBoolean()
    smartSync: boolean;

    @IsBoolean()
    votingControl: boolean;
}
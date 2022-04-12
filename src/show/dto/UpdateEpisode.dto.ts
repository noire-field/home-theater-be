import { IsNumber, IsOptional, IsString, Length } from "class-validator";

export class UpdateEpisodeDTO {
    @IsString()
    @Length(1, 8)
    numberCode: string;

    @IsOptional()
    @IsNumber()
    sortOrder: number;
}
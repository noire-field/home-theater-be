
import { IsString, MinLength, MaxLength } from 'class-validator';

export class LoginDTO {
    @IsString()
    @MinLength(4)
    @MaxLength(64)
    password: string;
}
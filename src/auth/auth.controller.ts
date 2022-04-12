import { Controller, HttpCode, Post, ValidationPipe, Body, Req, Res } from '@nestjs/common';
import { Response, Request } from 'express';
import { AuthService } from './auth.service';
import { LoginDTO } from './dto/login.dto';

@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) {}

    @HttpCode(200)
    @Post('/login')
    Login(@Body(ValidationPipe) loginDTO: LoginDTO, @Res() res: Response): any {
        return this.authService.Login(loginDTO, res);
    }

    @HttpCode(200)
    @Post('/verify')
    Verify(@Req() req: Request): any {
       return this.authService.Verify(req);
    }
}

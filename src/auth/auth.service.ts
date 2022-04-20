import Config from './../config';

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { Response, Request } from 'express';
import { JwtService } from '@nestjs/jwt';

import { LoginDTO } from './dto/login.dto';
import { JWTPayload } from './jwt-payload.interface';

@Injectable()
export class AuthService {
    constructor(
        private jwtService: JwtService
    ) {}


    async Login(loginDTO: LoginDTO, res: Response): Promise<any> {
        const { password } = loginDTO;
        const definedPassword: string = Config.Auth.Password;
        if(!password || !definedPassword || password !== definedPassword) {
            throw new UnauthorizedException({ message: 'Invalid credentials', langCode: 'Error:InvalidCredentials' });
        }

        const payload: JWTPayload = {
            loggedIn: true,
            level: 1
        }

        const accessToken = this.jwtService.sign(payload);

        res.cookie('access_token', accessToken, {
            httpOnly: true,
            expires: new Date(Date.now() + (30 * 60 * 60 * 24 * 1000)),
        }).send({ isAdmin: true });
    }

    async Verify(req: Request): Promise<any> {
        if(!req || !req.cookies || !req.cookies['access_token']) throw new UnauthorizedException('Access token not found');

        var accessToken = req.cookies['access_token'];
        try {
            if(!this.jwtService.verify(accessToken, { secret: Config.Auth.JWTSecret }))
                throw new UnauthorizedException('Access token is invalid');
        } catch(e) {
            throw new UnauthorizedException('Access token is invalid');
        }

        //const jwtData = this.jwtService.decode(accessToken);
        
        return { isAdmin: true }
    }
}

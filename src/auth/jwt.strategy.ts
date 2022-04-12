import Config from './../config';

import { UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import { JWTPayload } from './jwt-payload.interface';
import { Request } from 'express';

export class JWTStrategy extends PassportStrategy(Strategy) {
    constructor() {
        super({ 
            jwtFromRequest: (req: Request) => {
                if(!req || !req.cookies) return null;
                return req.cookies['access_token'];
            },
            ignoreExpiration: false,
            secretOrKey: Config.Auth.JWTSecret
        });
    }

    async validate(payload: JWTPayload) {
        if(!payload.loggedIn) throw new UnauthorizedException();

        return true;
    }
}
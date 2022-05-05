import { Show } from "src/show/show.entity";
import { WatchStatus } from "../watchStatus.enum";

export interface ISubtitleLine {
    id: string;
    startTime: string;
    endTime: string;
    text: string;
}

export interface IWatchShow {
    show: Show;
    status: WatchStatus;
    realStartTime: Date;
    playing: boolean;
    progress: number;
    subtitle: {
        on: boolean;
        list: ISubtitleLine[];
    },
    voting: {
        enable: boolean;
        active: boolean;
        toPause: boolean;
        startTime: number;
        endTime: number;
        starterName: string;
        result: {
            yes: number;
            no: number;
        }
    }
}

export interface IRoomFound {
    showTitle: string;
    realStartTime: Date;
}

export interface IClientInRoom {
    passCode: string;
    friendlyName: string;
    level: number;
    voted: number;
}

export interface IJoinRoom {
    showTitle: string;
    realStartTime: Date;
    subtitles?: ISubtitleLine[];
    smartSync: number;
}
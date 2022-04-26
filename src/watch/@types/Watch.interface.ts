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
    subtitle: {
        on: boolean;
        list: ISubtitleLine[];
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
}

export interface IJoinRoom {
    showTitle: string;
    realStartTime: Date;
    subtitles?: ISubtitleLine[];
}
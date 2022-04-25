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
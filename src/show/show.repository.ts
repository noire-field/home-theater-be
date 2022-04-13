import { EntityRepository, Repository } from "typeorm";
import { CreateShowDTO } from "./dto/createShow.dto";
import { Show } from "./show.entity";
import { ShowStatus } from "./showStatus.enum";

@EntityRepository(Show)
export class ShowRepository extends Repository<Show> {
    async CreateShow(createShowDTO: CreateShowDTO, videoDuration: number): Promise<Show> {
        const show = new Show();

        show.title = createShowDTO.title;
        show.passCode = createShowDTO.passCode;
        show.movieUrl = createShowDTO.movieUrl;
        show.subtitleUrl = createShowDTO.subtitleUrl || '';
        show.smartSync = createShowDTO.smartSync == true ? 1 : 0;
        show.votingControl = createShowDTO.votingControl == true ? 1 : 0;

        show.startTime = new Date(Number(createShowDTO.startTime));
        show.duration = videoDuration;
        show.status = ShowStatus.Processing;
        
        await show.save();
        return show;
    }
}
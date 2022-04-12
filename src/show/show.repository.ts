import { EntityRepository, Repository } from "typeorm";
import { Show } from "./show.entity";

@EntityRepository(Show)
export class ShowRepository extends Repository<Show> {
    
}
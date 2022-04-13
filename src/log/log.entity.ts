import { BaseEntity, Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from "typeorm";
import { LogCategory, LogType, LogAction } from './log.enum';

@Entity('log')
export class Log extends BaseEntity {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    userId: number;

    @Column()
    category: LogCategory;

    @Column()
    type: LogType;

    @Column()
    action: LogAction;

    @Column({ nullable: true })
    targetId: number;

    @Column({ type: 'text', nullable: true })
    change: string;
    
    @CreateDateColumn()
    createdAt: Date;
}
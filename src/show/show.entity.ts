import { BaseEntity, Column, CreateDateColumn, DeleteDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { ShowStatus } from "./showStatus.enum";

@Entity()
export class Show extends BaseEntity {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    passCode: string;

    @Column()
    title: string;

    @Column()
    movieUrl: string;

    @Column()
    subtitleUrl: string;

    @Column()
    startTime: Date;

    @Column({ type: 'double' })
    duration: number;

    @Column()
    smartSync: number;

    @Column()
    votingControl: number;

    @Column()
    status: ShowStatus;

    @Column({ nullable: true })
    finishedAt: Date;
    
    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    @DeleteDateColumn()
    deletedAt: Date;
}
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Project } from 'src/projects/project.entity';
import { User } from 'src/users/users.entity';
import { Task } from 'src/tasks/task.entity';
import { EpicStatus } from './enums/epic-status.enum';
import { EpicPriority } from './enums/epic-priority.enum';

@Entity('epics')
export class Epic {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Project, (project) => project.epics, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'projectId' })
  project!: Project;

  @Column({ type: 'uuid' })
  projectId!: string;

  @OneToMany(() => Task, (task) => task.epic)
  tasks?: Task[];

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({
    type: 'enum',
    enum: EpicStatus,
    default: EpicStatus.TODO,
  })
  status!: EpicStatus;

  @Column({
    type: 'enum',
    enum: EpicPriority,
    default: EpicPriority.MEDIUM,
  })
  priority!: EpicPriority;

  @Column({ type: 'date', nullable: true })
  startDate?: Date;

  @Column({ type: 'date', nullable: true })
  dueDate?: Date;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'createdById' })
  createdBy!: User;

  @Column({ type: 'uuid' })
  createdById!: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'ownerId' })
  owner?: User;

  @Column({ type: 'uuid', nullable: true })
  ownerId?: string;

  @Column({ type: 'boolean', default: false })
  archived!: boolean;

  @Column({ type: 'varchar', length: 20, nullable: true })
  color?: string;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt!: Date;
}

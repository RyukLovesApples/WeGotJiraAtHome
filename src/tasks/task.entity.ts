import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { TaskStatus } from './task-status.enum';
import { User } from '../users/users.entity';
import { TaskLabel } from './task-label.entity';
import { Exclude, Expose } from 'class-transformer';
import { Project } from '../projects/project.entity';

@Entity()
@Exclude()
export class Task {
  @Expose()
  @PrimaryGeneratedColumn('uuid')
  id!: string;
  @Column({
    type: 'varchar',
    length: 50,
    nullable: false,
  })
  @Expose()
  title!: string;
  @Column({
    type: 'text',
    nullable: false,
  })
  @Expose()
  description!: string;
  @Column({
    type: 'enum',
    enum: TaskStatus,
    default: TaskStatus.OPEN,
  })
  @Expose()
  status!: TaskStatus;

  @ManyToOne(() => User, (user) => user.tasks, { nullable: false })
  @Expose()
  user!: User;

  @Expose()
  @OneToMany(() => TaskLabel, (label) => label.task, {
    cascade: true,
    eager: true,
  })
  labels?: TaskLabel[];

  @Expose()
  @ManyToOne(() => Project, (project) => project.tasks, {
    nullable: true,
    onDelete: 'CASCADE',
    orphanedRowAction: 'delete',
  })
  @JoinColumn({ name: 'projectId' })
  project?: Project;

  @Index('IDX_TASK_PROJECT', ['projectId'])
  @Column()
  projectId!: string;

  @CreateDateColumn()
  @Expose()
  createdAt!: Date;

  @UpdateDateColumn()
  @Expose()
  updatedAt!: Date;
}

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
  @JoinColumn({ name: 'userId' })
  user!: User;

  @Column()
  userId!: string;

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
  @Expose()
  projectId!: string;

  @Column({ nullable: true, default: null })
  @Expose()
  parentId!: string;

  @ManyToOne(() => Task, (task) => task.subtasks, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'parentId' })
  parent?: Task;

  @OneToMany(() => Task, (task) => task.parent)
  @Expose()
  subtasks?: Task[];

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'assignedToId' })
  @Expose()
  assignedTo?: User;

  @Column({ nullable: true })
  @Expose()
  assignedToId?: string;

  @Column({ nullable: true, type: 'timestamp' })
  @Expose()
  dueDate!: Date;

  @Column({ default: 0, type: 'int' })
  @Expose()
  layer!: number;

  @CreateDateColumn()
  @Expose()
  createdAt!: Date;

  @UpdateDateColumn()
  @Expose()
  updatedAt!: Date;
}

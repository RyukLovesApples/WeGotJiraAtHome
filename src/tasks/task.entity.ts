import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { TaskStatus } from './task.model';
import { User } from 'src/users/users.entity';
import { TaskLabel } from './task-label.entity';
import { Exclude, Expose } from 'class-transformer';

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

  @CreateDateColumn()
  @Expose()
  createdAt!: Date;

  @UpdateDateColumn()
  @Expose()
  updatedAt!: Date;
}

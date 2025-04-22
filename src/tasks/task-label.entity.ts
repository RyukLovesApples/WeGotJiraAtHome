import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { Task } from './task.entity';

@Entity()
@Unique(['name', 'taskId'])
export class TaskLabel {
  @PrimaryGeneratedColumn('uuid')
  id: string;
  @Column({
    type: 'varchar',
    nullable: false,
  })
  name: string;
  @Column({
    nullable: false,
  })
  @Index()
  taskId: string;
  @ManyToOne(() => Task, (task) => task.labels, {
    nullable: false,
    onDelete: 'CASCADE',
    orphanedRowAction: 'delete',
  })
  task: Task;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

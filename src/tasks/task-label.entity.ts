import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { Task } from './task.entity';
import { Expose } from 'class-transformer';

@Entity()
@Unique(['name', 'taskId'])
export class TaskLabel {
  @PrimaryGeneratedColumn('uuid')
  @Expose()
  id!: string;
  @Column({
    type: 'varchar',
    nullable: false,
  })
  @Expose()
  name!: string;
  @Column({
    nullable: false,
  })
  @Index()
  @Expose()
  taskId!: string;
  @ManyToOne(() => Task, (task) => task.labels, {
    nullable: false,
    onDelete: 'CASCADE',
    orphanedRowAction: 'delete',
  })
  @JoinColumn({ name: 'taskId' })
  task!: Task;

  @CreateDateColumn()
  @Expose()
  createdAt!: Date;

  @UpdateDateColumn()
  @Expose()
  updatedAt!: Date;
}

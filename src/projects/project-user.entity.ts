import { User } from '../users/users.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Project } from './project.entity';

@Entity()
export class ProjectUser {
  @PrimaryGeneratedColumn()
  id!: string;
  @ManyToOne(() => User, (user) => user.projectUsers, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  user!: User;
  @ManyToOne(() => Project, (project) => project.projectUsers, {
    nullable: false,
    onDelete: 'CASCADE',
    orphanedRowAction: 'delete',
  })
  project!: Project;
  @CreateDateColumn()
  createdAt!: Date;
  @UpdateDateColumn()
  updatedAt!: Date;
}

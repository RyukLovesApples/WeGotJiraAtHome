import { User } from '../users/users.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  Column,
  Unique,
  JoinColumn,
} from 'typeorm';
import { Project } from '../projects/project.entity';
import { ProjectRole } from './project-role.enum';

@Entity()
@Unique(['user', 'project'])
export class ProjectUser {
  @PrimaryGeneratedColumn('uuid')
  id!: string;
  @ManyToOne(() => User, (user) => user.projectUsers, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'userId' })
  user!: User;
  @Column()
  userId!: string;
  @Column({
    type: 'enum',
    enum: ProjectRole,
  })
  role!: ProjectRole;
  @ManyToOne(() => Project, (project) => project.projectUsers, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'projectId' })
  project!: Project;
  @Column()
  projectId!: string;
  @CreateDateColumn()
  createdAt!: Date;
  @UpdateDateColumn()
  updatedAt!: Date;
}

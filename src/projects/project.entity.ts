import { Exclude, Expose } from 'class-transformer';
import { Task } from 'src/tasks/task.entity';
import { User } from 'src/users/users.entity';
import { ProjectUser } from './project-user.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity()
@Exclude()
export class Project {
  @PrimaryGeneratedColumn('uuid')
  id!: string;
  @Column()
  @Expose()
  name!: string;
  @Column()
  @Expose()
  description?: string;
  @ManyToOne(() => User, (user) => user.projects, {
    nullable: false,
  })
  user!: User;
  @Expose()
  @OneToMany(() => ProjectUser, (projectUsers) => projectUsers.project, {
    nullable: false,
  })
  projectUsers!: ProjectUser[];
  @Expose()
  @OneToMany(() => Task, (task) => task.project, {
    nullable: true,
  })
  tasks?: Task[];
  @CreateDateColumn()
  createdAt!: Date;
  @UpdateDateColumn()
  updatedAt!: Date;
}

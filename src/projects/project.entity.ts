import { Exclude, Expose } from 'class-transformer';
import { Task } from '../tasks/task.entity';
import { User } from '../users/users.entity';
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
import { UserDto } from '../users/dtos/user.dto';

@Exclude()
@Entity()
export class Project {
  @PrimaryGeneratedColumn('uuid')
  @Expose()
  id!: string;
  @Column()
  @Expose()
  name!: string;
  @Column()
  @Expose()
  description?: string;
  @Expose()
  @ManyToOne(() => User, (user) => user.projects, {
    nullable: false,
  })
  user!: UserDto;
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

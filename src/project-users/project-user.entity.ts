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
import { Field, ObjectType } from '@nestjs/graphql';
import { registerEnumType } from '@nestjs/graphql';
registerEnumType(ProjectRole, { name: 'ProjectRole' });

@Entity()
@ObjectType()
@Unique(['user', 'project'])
export class ProjectUser {
  @PrimaryGeneratedColumn('uuid')
  @Field()
  id!: string;
  @Field(() => User)
  @ManyToOne(() => User, (user) => user.projectUsers, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'userId' })
  user!: User;
  @Column()
  @Field()
  userId!: string;
  @Column({
    type: 'enum',
    enum: ProjectRole,
  })
  @Field(() => ProjectRole)
  role!: ProjectRole;
  @Field(() => Project)
  @ManyToOne(() => Project, (project) => project.projectUsers, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'projectId' })
  project!: Project;
  @Column()
  @Field()
  projectId!: string;
  @CreateDateColumn()
  @Field()
  createdAt!: Date;
  @UpdateDateColumn()
  @Field()
  updatedAt!: Date;
}

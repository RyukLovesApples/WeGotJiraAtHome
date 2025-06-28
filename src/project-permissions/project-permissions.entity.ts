import { Exclude, Expose } from 'class-transformer';
import { ProjectRole } from 'src/project-users/project-role.enum';
import { Project } from 'src/projects/project.entity';
import {
  Entity,
  Unique,
  PrimaryGeneratedColumn,
  Column,
  JoinColumn,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity()
@Exclude()
@Unique(['projectId', 'role'])
export class ProjectPermission {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Project, (project) => project.permissions, {
    nullable: true,
    onDelete: 'CASCADE',
    orphanedRowAction: 'delete',
  })
  @JoinColumn({ name: 'projectId' })
  project?: Project;

  @Column()
  @Expose()
  projectId!: string;

  @Column({ type: 'enum', enum: ProjectRole })
  @Expose()
  role!: ProjectRole;

  @Column('jsonb')
  @Expose()
  permissions!: ResourcePermissionDto;

  @CreateDateColumn()
  @Expose()
  createdAt!: Date;

  @UpdateDateColumn()
  @Expose()
  updatedAt!: Date;
}

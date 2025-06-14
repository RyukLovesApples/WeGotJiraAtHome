import { Exclude, Expose } from 'class-transformer';
import { ProjectRole } from '../project-users/project-role.enum';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
@Exclude()
export class ProjectUserInvite {
  @PrimaryGeneratedColumn('uuid')
  @Expose()
  id!: string;
  @Column()
  @Expose()
  email!: string;
  @Column({
    type: 'enum',
    enum: ProjectRole,
  })
  @Expose()
  role!: ProjectRole;
  @Column()
  @Expose()
  projectId!: string;
  @Column()
  token!: string;
  @Column()
  @Expose()
  expiresAt!: Date;
  @Column()
  @Expose()
  invitedById!: string;
}

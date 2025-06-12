import { Exclude, Expose } from 'class-transformer';
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

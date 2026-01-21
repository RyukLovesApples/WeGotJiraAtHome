import { Module } from '@nestjs/common';
import { ActivityGateway } from './activity.gateway';
import { UsersModule } from 'src/users/users.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/users/users.entity';
import { ProjectUser } from 'src/project-users/project-user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, ProjectUser]), UsersModule],
  providers: [ActivityGateway],
  exports: [ActivityGateway],
})
export class ActivityModule {}

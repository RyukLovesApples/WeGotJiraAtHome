import { Module } from '@nestjs/common';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Task } from './task.entity';
import { UsersModule } from 'src/users/users.module';
import { User } from 'src/users/users.entity';
import { TaskLabel } from './task-label.entity';
import { Epic } from 'src/epics/epics.entity';
import { ActivityModule } from 'src/activity/activity.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Task, User, Epic, TaskLabel]),
    UsersModule,
    ActivityModule,
  ],
  controllers: [TasksController],
  providers: [TasksService],
  exports: [TasksService],
})
export class TasksModule {}

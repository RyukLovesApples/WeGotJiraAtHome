import { Module } from '@nestjs/common';
import { EpicService } from './epics.service';
import { EpicController } from './epics.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Epic } from './epics.entity';
import { Project } from 'src/projects/project.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Epic, Project])],
  providers: [EpicService],
  controllers: [EpicController],
})
export class EpicModule {}

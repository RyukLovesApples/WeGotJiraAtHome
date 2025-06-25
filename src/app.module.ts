/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TasksModule } from './tasks/tasks.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { appConfig } from './config/app.config';
import { appConfigSchema } from './config/config.types';
import { typeOrmConfig } from './config/db.config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TypedConfigService } from './config/typed-config.service';
import { Task } from './tasks/task.entity';
import { User } from './users/users.entity';
import { UsersModule } from './users/users.module';
import { TaskLabel } from './tasks/task-label.entity';
import { authConfig } from './config/auth.config';
import { ProjectsModule } from './projects/projects.module';
import { Project } from './projects/project.entity';
import { ProjectUser } from './project-users/project-user.entity';
import { ProjectUsersModule } from './project-users/project-users.module';
import { APP_FILTER, APP_GUARD, RouterModule } from '@nestjs/core';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { join } from 'path';
import { ProjectUserInvite } from './invite/project-user-invite.entity';
import { MailerModule } from './mailer/mailer.module';
import { InviteModule } from './invite/invite.module';
import { CatchEverythingFilter } from './exception-filters/catch-all.exception-filter';
import { WinstonModule } from 'nest-winston';
import { winstonLoggerConfig } from './config/logger.config';
import { PermissionsModule } from './permissions/permissions.module';
import { AuthGuard } from './users/auth/auth.guard';
import { ResourcePermissionGuard } from './permissions/guards/resource-permissions.guard';
import { RolesGuard } from './users/auth/guards/roles.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, typeOrmConfig, authConfig],
      validationSchema: appConfigSchema,
      validationOptions: {
        allowUnknown: true,
        abortEarly: true,
      },
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: TypedConfigService) => ({
        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        ...configService.get('database'),
        entities: [
          Task,
          User,
          TaskLabel,
          Project,
          ProjectUser,
          ProjectUserInvite,
        ],
      }),
    }),
    GraphQLModule.forRoot<ApolloDriverConfig>({
      context: ({ req }: { req: Request }) => ({ req }),
      driver: ApolloDriver,
      autoSchemaFile: join(
        process.cwd(),
        'src/project-users/schemas/project-user.graphql',
      ),
      debug: true,
      playground: true,
    }),
    WinstonModule.forRoot(winstonLoggerConfig),
    TasksModule,
    UsersModule,
    ProjectsModule,
    ProjectUsersModule,
    InviteModule,
    RouterModule.register([
      {
        path: 'projects',
        module: ProjectsModule,
        children: [
          {
            path: ':projectId/tasks',
            module: TasksModule,
          },
          {
            path: ':projectId/invite',
            module: InviteModule,
          },
        ],
      },
    ]),
    MailerModule,
    InviteModule,
    PermissionsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: TypedConfigService,
      useExisting: ConfigService,
    },
    {
      provide: APP_FILTER,
      useClass: CatchEverythingFilter,
    },
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    {
      provide: APP_GUARD,
      useClass: ResourcePermissionGuard,
    },
  ],
})
export class AppModule {}

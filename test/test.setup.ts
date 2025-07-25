import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { testConfig } from './config/test.config';
import { ValidationPipe } from '@nestjs/common';
import { MailerService } from 'src/mailer/mailer.service';

export class TestSetup {
  app!: INestApplication;
  dataSource!: DataSource;

  static async create(module: any) {
    const instance = new TestSetup();
    await instance.init(module);
    return instance;
  }

  private async init(module: any) {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [module],
    })
      .overrideProvider(ConfigService)
      .useValue({
        get: (key: string) => {
          if (key.includes('database')) return testConfig.database;
          if (key.includes('auth')) return testConfig.auth;
          if (key.includes('app')) return testConfig.app;
          return null;
        },
      })
      .overrideProvider(MailerService)
      .useValue({
        sendEmail: jest.fn().mockResolvedValue(undefined),
      })
      .compile();
    this.app = moduleFixture.createNestApplication();
    this.app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    this.dataSource = moduleFixture.get(DataSource);
    await this.app.init();
    await this.dataSource.runMigrations();
  }
  async cleanup() {
    const entities = this.dataSource.entityMetadatas;
    const tableNames = entities
      .map((entity) => `"${entity.tableName}"`)
      .join(', ');
    await this.dataSource.query(
      `TRUNCATE ${tableNames} RESTART IDENTITY CASCADE`,
    );
  }
  async teardown() {
    await this.dataSource.destroy();
    await this.app.close();
  }
}

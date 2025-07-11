import { config } from 'dotenv';
import { DataSource } from 'typeorm';

config();

const isProd = process.env.NODE_ENV === 'production';

export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: parseInt(process.env.DB_PORT ?? '5432', 10),
  username: process.env.DB_USER ?? 'postgres',
  password: process.env.DB_PASSWORD ?? 'postgres',
  database: process.env.DB_NAME ?? 'we_got_jira_at_home',
  synchronize: true,
  entities: ['src/**/*.entity.ts', 'dist/**/*.entity.js'],
  migrations: isProd ? ['dist/migrations/*.js'] : ['src/migrations/*.ts'],
  migrationsRun: false,
});

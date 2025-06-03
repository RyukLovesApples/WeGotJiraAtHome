import { config } from 'dotenv';
import { DataSource } from 'typeorm';

config();

const isCompiled = __filename.includes('dist');

export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: parseInt(process.env.DB_PORT ?? '5432', 10),
  username: process.env.DB_USER ?? 'postgres',
  password: process.env.DB_PASSWORD ?? 'postgres',
  database: process.env.DB_NAME ?? 'we_got_jira_at_home',
  synchronize: false,
  entities: [isCompiled ? 'dist/**/*.entity.js' : 'src/**/*.entity.ts'],
  migrations: [isCompiled ? 'dist/migrations/*.js' : 'src/migrations/*.ts'],
  migrationsRun: false,
});

export const testConfig = {
  database: {
    type: 'postgres',
    host: 'localhost',
    port: 5432,
    username: 'postgres',
    password: 'postgres',
    database: 'we_got_jira_at_home_e2e',
    synchronize: false,
  },
  app: {
    messagePrefix: '',
  },
  auth: {
    jwt: {
      secret: 'secret',
      expiresIn: '1m',
    },
  },
};

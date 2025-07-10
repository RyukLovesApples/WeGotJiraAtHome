export const testConfig = {
  database: {
    type: 'postgres',
    host: 'db',
    port: 5432,
    username: 'postgres',
    password: 'postgres',
    database: 'we_got_jira_at_home_integration',
    synchronize: true,
  },
  app: {
    messagePrefix: 'HelloWorld',
  },
  auth: {
    jwt: {
      secret: 'secret',
      expiresIn: '1m',
    },
  },
};

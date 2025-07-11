export const testConfig = {
  database: {
    type: 'postgres',
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT ?? '5432', 10),
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: `we_got_jira_at_home_integration`,
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

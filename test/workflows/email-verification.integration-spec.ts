/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { JwtService } from '@nestjs/jwt';
import * as request from 'supertest';
import { Http2Server } from 'http2';
import { JwtPayload } from 'jsonwebtoken';
import { AppModule } from 'src/app.module';
import { EmailVerification } from 'src/email-verification/email-verification.entity';
import { MailerService } from 'src/mailer/mailer.service';
import { defaultUser } from '../dummy-variables/dummy-variables';
import { registerAndLogin } from '../helpers/test-helpers';
import { TestSetup } from '../test.setup';
import { Role } from 'src/users/role.enum';
import { SendMailOptions } from 'src/mailer/types/send-mail-options.type';

describe('Email verification workflow', () => {
  let testSetup: TestSetup;
  let server: Http2Server;
  let mailerServiceMock: jest.SpyInstance<
    Promise<any>,
    [mailData: SendMailOptions]
  >;

  beforeEach(async () => {
    testSetup = await TestSetup.create(AppModule);
    server = testSetup.app.getHttpServer() as Http2Server;

    const mailerService = testSetup.app.get(MailerService);
    mailerServiceMock = jest
      .spyOn(mailerService, 'sendEmail')
      .mockResolvedValue(undefined);
  });

  afterEach(async () => {
    await testSetup.cleanup();
  });

  afterAll(async () => {
    mailerServiceMock.mockRestore();
    await testSetup.teardown();
  });

  it('should go through verification workflow', async () => {
    // User registers and logs in
    const token = await registerAndLogin(server, defaultUser);
    const jwtData: JwtPayload = testSetup.app.get(JwtService).verify(token);
    expect(jwtData.roles[0]).toBe(Role.USER);

    // Verification email is sent to user
    const emailVerificationRepo =
      testSetup.dataSource.getRepository(EmailVerification);
    const emailVerification = await emailVerificationRepo.findOneBy({
      userId: jwtData.sub,
    });

    // Email verification entry should exist
    expect(emailVerification).toBeDefined();
    const emailVerificationId = emailVerification!.id;

    // User should not be able to access admin route before verifying email
    await request(server)
      .get('/auth/admin')
      .set('Authorization', `Bearer ${token}`)
      .expect(403);

    // User clicks on verification link; should be redirected to login with email and token
    const res = await request(server).get(
      `/email-verification/confirm?token=${emailVerificationId}`,
    );
    expect(res.status).toBe(302);
    expect(res.headers.location).toMatch(/\/login\?email=.*&token=.*/);

    // User logs in again; JWT payload should now contain ADMIN role
    const newToken = await registerAndLogin(server, defaultUser);

    // User should now be able to access admin route
    await request(server)
      .get('/auth/admin')
      .set('Authorization', `Bearer ${newToken}`)
      .expect(200);

    // Email verification entry should be deleted after link click
    const emailVerificationAfter = await emailVerificationRepo.findOneBy({
      userId: jwtData.sub,
    });
    expect(emailVerificationAfter).toBe(null);
  });

  it('should reject expired email verification tokens', async () => {
    const token = await registerAndLogin(server, defaultUser);
    const jwtData: JwtPayload = testSetup.app.get(JwtService).verify(token);
    const emailVerificationRepo =
      testSetup.dataSource.getRepository(EmailVerification);
    const emailVerification = emailVerificationRepo.create({
      userId: jwtData.sub,
      expiresAt: new Date(Date.now() - 10000),
    });
    const savedVerification =
      await emailVerificationRepo.save(emailVerification);

    const res = await request(server).get(
      `/email-verification/confirm?token=${savedVerification.id}`,
    );
    expect(res.status).toBe(302);
    expect(res.headers.location).toContain(
      'https://your-frontend.com/email-verification/expired-dummy',
    );
  });
  it('should return not found with repeated clicks on link', async () => {
    const token = await registerAndLogin(server, defaultUser);
    const jwtData: JwtPayload = testSetup.app.get(JwtService).verify(token);

    const emailVerificationRepo =
      testSetup.dataSource.getRepository(EmailVerification);
    const emailVerification = await emailVerificationRepo.findOneBy({
      userId: jwtData.sub,
    });
    expect(emailVerification).toBeDefined();
    const emailVerificationId = emailVerification!.id;

    const firstRes = await request(server).get(
      `/email-verification/confirm?token=${emailVerificationId}`,
    );
    expect(firstRes.headers.location).toMatch(/\/login\?email=.*&token=.*/);

    const secondRes = await request(server).get(
      `/email-verification/confirm?token=${emailVerificationId}`,
    );
    expect(secondRes.headers.location).toContain(
      'https://your-frontend.com/email-verification/not-found-dummy',
    );
  });
  it('should throw BAD REQUEST on invalid token fromat, test pipe', async () => {
    const emptyToken = '';
    const notUUIDToken = 'aölsdkfjö3lfj';
    await request(server)
      .get(`/email-verification/confirm?token=${emptyToken}`)
      .expect(400);
    await request(server)
      .get(`/email-verification/confirm?token=${notUUIDToken}`)
      .expect(400);
  });
});

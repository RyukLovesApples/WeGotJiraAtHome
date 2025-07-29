/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import * as request from 'supertest';
import { Http2Server } from 'http2';
import { AppModule } from 'src/app.module';
import { TestSetup } from '../test.setup';
import { registerAndLogin } from '../helpers/test-helpers';
import { defaultUser, secondUser } from '../dummy-variables/dummy-variables';
import { JwtService } from '@nestjs/jwt';
import { JwtPayload } from 'jsonwebtoken';
import { User } from 'src/users/users.entity';
import { PasswordReset } from 'src/password-reset/password-reset.entity';
import { randomUUID } from 'crypto';

describe('Password reset workflow', () => {
  let testSetup: TestSetup;
  let server: Http2Server;

  beforeEach(async () => {
    testSetup = await TestSetup.create(AppModule);
    server = testSetup.app.getHttpServer() as Http2Server;
  });

  afterEach(async () => {
    await testSetup.cleanup();
  });

  afterAll(async () => {
    await testSetup.teardown();
  });

  it('should complete the full password reset flow successfully', async () => {
    // Create user for password reset
    const token = await registerAndLogin(server, defaultUser);
    const jwtData: JwtPayload = testSetup.app.get(JwtService).verify(token);
    const userId = jwtData.sub;

    // Get User repository
    const userRepo = testSetup.dataSource.getRepository(User);
    const user = await userRepo.findOneBy({ id: userId });
    expect(user).toBeDefined();
    const userEmail = user!.email;

    // User clicks on reset
    await request(server)
      .post('/password-reset/send')
      .send({ email: userEmail });

    // Get PasswordReset repository
    const passwordResetRepo = testSetup.dataSource.getRepository(PasswordReset);
    const passwordReset = await passwordResetRepo.findOneBy({ userId });
    expect(passwordReset?.userId).toBe(userId);
    expect(passwordReset?.confirmed).toBe(false);

    // User clicks on reset link
    const res = await request(server).get(
      `/password-reset/confirm?token=${passwordReset!.id}`,
    );
    expect(res.status).toBe(302);
    expect(res.headers.location).toContain(
      `https://your-frontend.com/reset-password?token=${passwordReset!.id}`,
    );

    const passwordResetAfterConfirm = await passwordResetRepo.findOneBy({
      userId,
    });
    expect(passwordResetAfterConfirm?.confirmed).toBe(true);

    // User sends new password
    await request(server)
      .post('/users/reset-password')
      .send({ token: passwordReset?.id, password: secondUser.password });

    const userAfterReset = await userRepo.findOneBy({ id: userId });
    expect(userAfterReset?.password).not.toBe(user?.password);

    // Check for used property to be false
    const passwordResetAfterReset = await passwordResetRepo.findOneBy({
      userId,
    });
    expect(passwordResetAfterReset?.used).toBe(true);
  });

  it('should redirect to expired page if reset token is past expiration date', async () => {
    const token = await registerAndLogin(server, defaultUser);
    const jwtData: JwtPayload = testSetup.app.get(JwtService).verify(token);
    const userId = jwtData.sub;
    const expiredDate = new Date(Date.now() - 10000);

    const passwordResetRepo = testSetup.dataSource.getRepository(PasswordReset);
    const passwordReset = passwordResetRepo.create({
      userId,
      expiresAt: expiredDate,
    });
    const savedPasswordReset = await passwordResetRepo.save(passwordReset);
    expect(savedPasswordReset.userId).toBe(userId);
    const res = await request(server).get(
      `/password-reset/confirm?token=${savedPasswordReset.id}`,
    );
    expect(res.status).toBe(302);
    expect(res.headers.location).toContain(
      'https://your-frontend.com/password-reset/expired-dummy',
    );
  });

  it('should redirect to not found page if reset token does not exist', async () => {
    const invalidUUID = randomUUID();
    const res = await request(server).get(
      `/password-reset/confirm?token=${invalidUUID}`,
    );
    expect(res.status).toBe(302);
    expect(res.headers.location).toContain(
      'https://your-frontend.com/password-reset/not-found-dummy',
    );
  });

  it('should redirect to not found page if reset token has already been used', async () => {
    const token = await registerAndLogin(server, defaultUser);
    const jwtData: JwtPayload = testSetup.app.get(JwtService).verify(token);
    const userId = jwtData.sub;
    const expiresAt = new Date(Date.now() + 10000);

    const passwordResetRepo = testSetup.dataSource.getRepository(PasswordReset);
    const passwordReset = passwordResetRepo.create({
      userId,
      expiresAt,
    });
    const savedPasswordReset = await passwordResetRepo.save(passwordReset);
    const passwordResetToken = savedPasswordReset.id;
    const firstRes = await request(server).get(
      `/password-reset/confirm?token=${passwordResetToken}`,
    );
    expect(firstRes.status).toBe(302);
    expect(firstRes.headers.location).toContain(
      `https://your-frontend.com/reset-password?token=${passwordResetToken}`,
    );

    await request(server)
      .post('/users/reset-password')
      .send({ token: passwordResetToken, password: secondUser.password });

    const secondRes = await request(server).get(
      `/password-reset/confirm?token=${passwordResetToken}`,
    );
    expect(secondRes.status).toBe(302);
    expect(secondRes.headers.location).toContain(
      'https://your-frontend.com/password-reset/not-found-dummy',
    );
  });

  it('should return 401 if password reset is attempted without confirming token', async () => {
    const token = await registerAndLogin(server, defaultUser);
    const jwtData: JwtPayload = testSetup.app.get(JwtService).verify(token);
    const userId = jwtData.sub;

    const expiresAt = new Date(Date.now() + 10000);

    const passwordResetRepo = testSetup.dataSource.getRepository(PasswordReset);
    const passwordReset = passwordResetRepo.create({
      userId,
      expiresAt,
    });
    const savedPasswordReset = await passwordResetRepo.save(passwordReset);
    const passwordResetToken = savedPasswordReset.id;

    await request(server)
      .post('/users/reset-password')
      .send({ token: passwordResetToken, password: secondUser.password })
      .expect(401);
  });

  it('should return 400 if new password does not meet requirements', async () => {
    const invalidPassword = 'somePassword';
    // Create user for password reset
    const token = await registerAndLogin(server, defaultUser);
    const jwtData: JwtPayload = testSetup.app.get(JwtService).verify(token);
    const userId = jwtData.sub;

    // Get User repository
    const userRepo = testSetup.dataSource.getRepository(User);
    const user = await userRepo.findOneBy({ id: userId });
    expect(user).toBeDefined();
    const userEmail = user!.email;

    // User clicks on reset
    await request(server)
      .post('/password-reset/send')
      .send({ email: userEmail });

    // Get PasswordReset repository
    const passwordResetRepo = testSetup.dataSource.getRepository(PasswordReset);
    const passwordReset = await passwordResetRepo.findOneBy({ userId });

    // User clicks on reset link
    await request(server).get(
      `/password-reset/confirm?token=${passwordReset!.id}`,
    );

    // User sends invalid password
    const res = await request(server)
      .post('/users/reset-password')
      .send({ token: passwordReset?.id, password: invalidPassword });
    expect(res.status).toBe(400);
    expect(res.body.message).toContain(
      'Password must contain at least one number',
    );
  });

  it('should return 201 and not create record when email does not match any user', async () => {
    const notUserEmail = secondUser.email;
    await request(server)
      .post('/password-reset/send')
      .send({ email: notUserEmail })
      .expect(201);

    const passwordResetRepo = testSetup.dataSource.getRepository(PasswordReset);
    const savedPasswordResets = await passwordResetRepo.find();
    expect(savedPasswordResets.length).toBe(0);
  });
});

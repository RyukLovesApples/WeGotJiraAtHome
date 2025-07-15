import { Controller, Get, Post, Query, Res } from '@nestjs/common';
import { EmailVerificationService } from './email-verification.service';
import { UsersService } from 'src/users/users.service';
import { Role } from 'src/users/role.enum';
import { Response } from 'express';
import { CurrentUserId } from 'src/users/decorators/current-user-id.decorator';

const ALLOWED_URLS = [
  'https://your-frontend.com',
  'https://your-frontend.com',
  'https://your-frontend.com/profile',
];

function isAllowedRedirect(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ALLOWED_URLS.includes(`${parsed.origin}${parsed.pathname}`);
  } catch {
    return false;
  }
}

@Controller('email-verification')
export class EmailVerificationController {
  constructor(
    private readonly emailVerificationService: EmailVerificationService,
    private readonly userService: UsersService,
  ) {}
  @Get('confirm')
  async confirmEmailVerification(
    @Query('token') token: string,
    @Query('redirect') redirect: string,
    @Res() res: Response,
  ): Promise<void> {
    const emailVerification =
      await this.emailVerificationService.getEmailVerificationByToken(token);
    if (this.emailVerificationService.isExpired(emailVerification.expiresAt)) {
      return res.redirect(
        'https://your-frontend.com/email-verification/expired-dummy',
      );
    }
    const user = await this.userService.updateUserRole(
      emailVerification.userId,
      Role.ADMIN,
    );
    await this.emailVerificationService.deleteEmailVerificationById(
      emailVerification.id,
    );

    const finalRedirect =
      redirect && isAllowedRedirect(redirect)
        ? redirect
        : `https://your-frontend.com/login?email=${user.email}&token=${token}`;

    return res.redirect(finalRedirect);
  }
  @Post('send')
  async sendEmailVerification(@CurrentUserId() userId: string) {
    await this.emailVerificationService.createEmailVerification(userId);
    return true;
  }
}

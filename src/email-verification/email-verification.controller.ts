/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Controller, Get, Post, Query, Res } from '@nestjs/common';
import { EmailVerificationService } from './email-verification.service';
import { UsersService } from '../users/users.service';
import { Role } from '../users/role.enum';
import { Response } from 'express';
import { CurrentUserId } from '../users/decorators/current-user-id.decorator';
import { TokenParams } from '../common/dtos/params/token.params';
import { Public } from '../users/decorators/public.decorator';

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
  @Public()
  async confirmEmailVerification(
    @Query() { token }: TokenParams,
    @Query('redirect') redirect: string,
    @Res() res: Response,
  ): Promise<void> {
    const emailVerification =
      await this.emailVerificationService.getEmailVerificationByToken(token);
    if (!emailVerification) {
      return res.redirect(
        'https://your-frontend.com/email-verification/not-found-dummy',
      );
    }
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
  async sendEmailVerification(
    @CurrentUserId() userId: string,
  ): Promise<boolean> {
    await this.emailVerificationService.createEmailVerification(userId);
    return true;
  }
}

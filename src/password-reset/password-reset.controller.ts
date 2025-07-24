import { Body, Controller, Get, Post, Query, Res } from '@nestjs/common';
import { PasswordResetService } from './password-reset.service';
import { TokenParams } from 'src/common/dtos/params/token.params';
import { Response } from 'express';
import { Public } from 'src/users/decorators/public.decorator';
import { SendPasswordResetDto } from './dtos/send-password-reset.dto';

@Controller('password-reset')
export class PasswordResetController {
  constructor(private readonly passwordResetService: PasswordResetService) {}
  @Get('confirm')
  @Public()
  async confirmPasswordReset(
    @Query() { token }: TokenParams,
    @Res() res: Response,
  ): Promise<void> {
    const passwordReset =
      await this.passwordResetService.getPasswordResetById(token);
    if (!passwordReset) {
      return res.redirect(
        'https://your-frontend.com/password-reset/not-found-dummy',
      );
    }
    if (this.passwordResetService.isExpired(passwordReset.expiresAt)) {
      return res.redirect(
        'https://your-frontend.com/password-reset/expired-dummy',
      );
    }
    await this.passwordResetService.onConfirm(passwordReset.id);
    return res.redirect(
      `https://your-frontend.com/reset-password?token=${token}`,
    );
  }
  @Post('send')
  async sendEmailVerification(
    @Body() { email }: SendPasswordResetDto,
  ): Promise<void> {
    await this.passwordResetService.createPasswordReset(email);
  }
}

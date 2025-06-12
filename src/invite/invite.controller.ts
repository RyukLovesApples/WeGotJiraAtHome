import { Controller, Get, Query, Res } from '@nestjs/common';
import { ProjectUserInviteService } from './project-user-invite.service';
import { UsersService } from 'src/users/users.service';
import { Response } from 'express';

@Controller('invite')
export class InviteController {
  constructor(
    private readonly inviteService: ProjectUserInviteService,
    private readonly userService: UsersService,
  ) {}
  // the routes are dummy frontend routes. needs to be replaced later, maybe dynamic
  @Get('invite/confirm')
  async confirmInvite(@Query('token') token: string, @Res() res: Response) {
    const invite = await this.inviteService.getInviteByToken(token);
    if (this.inviteService.isExpired(invite.expiresAt)) {
      return res.redirect('/invite/expired');
    }
    const user = await this.userService.findOneByEmail(invite.email);
    if (user) {
      return res.redirect(`/login?email=${invite.email}&token=${token}`);
    } else {
      return res.redirect(`/register?email=${invite.email}&token=${token}`);
    }
  }
}

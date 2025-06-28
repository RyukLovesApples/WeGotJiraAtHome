import { Body, Controller, Get, Post, Query, Res } from '@nestjs/common';
import { ProjectUserInviteService } from './project-user-invite.service';
import { UsersService } from 'src/users/users.service';
import { Response } from 'express';
import { CreateProjectInvitaionDto } from './dtos/create-project-user-invite.dto';
import { CurrentUserId } from 'src/users/decorators/current-user-id.decorator';
import { Resources } from 'src/project-permissions/decorators/resource.decorator';
import { Resource } from 'src/project-permissions/enums/resource.enum';
import { SkipResourceGuard } from 'src/project-permissions/decorators/skip-resource.decorator';

@Resources(Resource.INVITE)
@Controller()
export class InviteController {
  constructor(
    private readonly inviteService: ProjectUserInviteService,
    private readonly userService: UsersService,
  ) {}
  // the routes are dummy frontend routes. needs to be replaced later prod url via .env
  @Get('invite/confirm')
  @SkipResourceGuard()
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
  @Post()
  async createInvite(
    @CurrentUserId() invitedById: string,
    @Body() userInvitation: CreateProjectInvitaionDto,
  ): Promise<void> {
    await this.inviteService.createInvite(userInvitation, invitedById);
  }
}

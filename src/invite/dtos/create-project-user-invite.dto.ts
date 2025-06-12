import { IsEmail, IsEnum, IsNotEmpty, IsUUID } from 'class-validator';
import { ProjectRole } from 'src/project-users/project-role.enum';

export class CreateProjectInvitaionDto {
  @IsNotEmpty()
  @IsEmail()
  email!: string;
  @IsNotEmpty()
  @IsEnum(ProjectRole)
  role!: ProjectRole;
  @IsNotEmpty()
  @IsUUID()
  projectId!: string;
}

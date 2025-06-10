import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProjectUserInviteTable1749463018783
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        CREATE TABLE "project_user_invite" (
          "id" uuid PRIMARY KEY,
          "email" text NOT NULL,
          "projectId" uuid NOT NULL,
          "token" uuid NOT NULL,
          "expiresAt" TIMESTAMP NOT NULL,
          "invitedById" uuid NOT NULL
        );
      `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "project_user_invite"`);
  }
}

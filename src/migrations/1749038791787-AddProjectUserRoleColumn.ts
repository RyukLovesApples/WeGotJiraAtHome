import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProjectUserRoleColumn1749038791787
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "project_user_role_enum" AS ENUM ('OWNER', 'MEMBER');
    `);
    await queryRunner.query(`
      ALTER TABLE "project_user"
      ADD COLUMN "role" "project_user_role_enum" NOT NULL DEFAULT 'MEMBER';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "project_user" DROP COLUMN "role"`);
    await queryRunner.query(`DROP TYPE "project_user_role_enum"`);
  }
}

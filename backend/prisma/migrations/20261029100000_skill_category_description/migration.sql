-- AlterTable: category description for the Skills card design (skills.png)
-- Nullable, no defaults, no indexes.

ALTER TABLE "SkillCategory" ADD COLUMN "description" VARCHAR(300);

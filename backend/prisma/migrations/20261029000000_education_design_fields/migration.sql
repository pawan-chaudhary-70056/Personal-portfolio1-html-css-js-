-- AlterTable: design-parity fields for the Education card (a.png)
-- Nullable, no defaults, no indexes.

ALTER TABLE "Education" ADD COLUMN "level" VARCHAR(100);
ALTER TABLE "Education" ADD COLUMN "degreeAward" VARCHAR(200);

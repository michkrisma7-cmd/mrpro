ALTER TABLE "TeamMember"
  ADD COLUMN "description" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "fullProfile" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "position" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_position_check" CHECK ("position" >= 0);
CREATE INDEX "TeamMember_active_position_idx" ON "TeamMember"("active", "position");

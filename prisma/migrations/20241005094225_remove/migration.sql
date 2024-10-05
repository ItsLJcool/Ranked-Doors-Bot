/*
  Warnings:

  - You are about to drop the column `attachments` on the `UserMatches` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_UserMatches" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "matchId" INTEGER NOT NULL,
    "userId" TEXT NOT NULL,
    "awaiting_review" BOOLEAN DEFAULT false,
    "reached_door" INTEGER DEFAULT -1,
    "died" BOOLEAN DEFAULT false,
    "cause_of_death" TEXT NOT NULL DEFAULT 'unknown',
    "rank" INTEGER DEFAULT -1,
    CONSTRAINT "UserMatches_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "UserMatches_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_UserMatches" ("awaiting_review", "cause_of_death", "died", "id", "matchId", "rank", "reached_door", "userId") SELECT "awaiting_review", "cause_of_death", "died", "id", "matchId", "rank", "reached_door", "userId" FROM "UserMatches";
DROP TABLE "UserMatches";
ALTER TABLE "new_UserMatches" RENAME TO "UserMatches";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

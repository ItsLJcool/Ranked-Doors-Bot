/*
  Warnings:

  - You are about to drop the column `createdAt` on the `UserMatches` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Match" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "match_type" TEXT NOT NULL,
    "shop_run" BOOLEAN NOT NULL,
    "alive_players" TEXT DEFAULT '',
    "to_be_reviewed" BOOLEAN DEFAULT false,
    "being_verified" BOOLEAN DEFAULT false,
    "verified" BOOLEAN DEFAULT false,
    "reviewer" TEXT DEFAULT 'N / A',
    "feedback" TEXT DEFAULT 'N / A',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Match" ("alive_players", "being_verified", "feedback", "id", "match_type", "reviewer", "shop_run", "to_be_reviewed", "verified") SELECT "alive_players", "being_verified", "feedback", "id", "match_type", "reviewer", "shop_run", "to_be_reviewed", "verified" FROM "Match";
DROP TABLE "Match";
ALTER TABLE "new_Match" RENAME TO "Match";
CREATE TABLE "new_UserMatches" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "matchId" INTEGER NOT NULL,
    "userId" TEXT NOT NULL,
    "attachments" TEXT NOT NULL DEFAULT '',
    "awaiting_review" BOOLEAN DEFAULT false,
    "reached_door" INTEGER DEFAULT -1,
    "died" BOOLEAN DEFAULT false,
    "cause_of_death" TEXT NOT NULL DEFAULT 'unknown',
    "rank" INTEGER DEFAULT -1,
    CONSTRAINT "UserMatches_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "UserMatches_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_UserMatches" ("attachments", "awaiting_review", "cause_of_death", "died", "id", "matchId", "rank", "reached_door", "userId") SELECT "attachments", "awaiting_review", "cause_of_death", "died", "id", "matchId", "rank", "reached_door", "userId" FROM "UserMatches";
DROP TABLE "UserMatches";
ALTER TABLE "new_UserMatches" RENAME TO "UserMatches";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

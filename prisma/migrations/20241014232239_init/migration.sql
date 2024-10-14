-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "elosId" INTEGER NOT NULL,
    "knobs_spent" INTEGER NOT NULL DEFAULT 0,
    "knobs_gained" INTEGER NOT NULL DEFAULT 0,
    "deaths" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "User_elosId_fkey" FOREIGN KEY ("elosId") REFERENCES "Elos" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Match" (
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

-- CreateTable
CREATE TABLE "UserMatches" (
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

-- CreateTable
CREATE TABLE "Elos" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "hotel" INTEGER NOT NULL DEFAULT 1500,
    "mines" INTEGER NOT NULL DEFAULT 1500,
    "backdoor" INTEGER NOT NULL DEFAULT 1500,
    "hard" INTEGER NOT NULL DEFAULT 1500,
    "main_floors" INTEGER NOT NULL DEFAULT 1500,
    "global" INTEGER NOT NULL DEFAULT 1500
);

-- CreateTable
CREATE TABLE "Settings" (
    "name" TEXT NOT NULL PRIMARY KEY,
    "value" TEXT NOT NULL,
    "type" INTEGER NOT NULL,
    "menuType" INTEGER NOT NULL,
    "description" TEXT DEFAULT 'No Description Provided.. spooky'
);

-- CreateIndex
CREATE UNIQUE INDEX "User_id_key" ON "User"("id");

-- CreateIndex
CREATE UNIQUE INDEX "Settings_name_key" ON "Settings"("name");

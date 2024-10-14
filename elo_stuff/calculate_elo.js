require('dotenv').config();
require('../utils/prisma_client');

const path = require('path');
const fs = require('fs');

let elo_settings = { kFactor: 40 };
fs.readFile(path.resolve(`EloCalculationSettings.json`), 'utf8', (err, jsonString) => {
    if (err) {
        console.error('Error reading file:', err);
        return;
    }
    try {
        elo_settings = JSON.parse(jsonString);
        kFactor = elo_settings.kFactor;
    } catch (err) {
        console.error('Error parsing JSON:', err);
    }
});

const prisma = global.prisma;

let kFactor = elo_settings.kFactor;

async function Calculate_Elo_Match(matchId) {
    if (matchId == undefined) return console.error("No matchId provided!");
    const match = await prisma.match.findUnique({ where: { id: matchId }, include: { userMatches: true } });

    await calculate_elo(match.userMatches, match.match_type);

    await prisma.match.update({ where: { id: match.id }, data: { being_verified: false, verified: true } });
}

async function calculate_elo(userMatches, type) {
    const users = [];
    for (const userMatch of userMatches) {
        const user = await prisma.user.findUnique({ where: { id: userMatch.userId }, include: { elo_data: true } });
        users.push(user);
    }

    userMatches = userMatches.map(match => {
        const user = users.find(u => u.id === match.userId); // Find matching user
        return {
            ...match,         // Spread match data
            user: user || {}  // Add user data (empty object if not found)
        };
    });
    
    userMatches.sort((a, b) => b.reached_door - a.reached_door);
    

    // Assign ranks while accounting for ties
    let currentRank = 1;
    for (let i = 0; i < userMatches.length; i++) {
        if (i > 0 && userMatches[i].reached_door === userMatches[i - 1].reached_door) 
            userMatches[i].rank = userMatches[i - 1].rank; // Same rank for ties
        else
            userMatches[i].rank = currentRank; // Assign current rank
        
        currentRank++;
    }

    for (let i = 0; i < userMatches.length; i++) {
        let elo_i = userMatches[i].user.elo_data[type];
        let nr = 0;
        for (let j = 0; j < userMatches.length; j++) {
            if (i === j) continue;
            const elo_j = userMatches[j].user.elo_data[type];
            let score = 0;
            let w = 1/(10 ** ( (elo_j - elo_i) / 400)+1);
            if (userMatches[i].rank < userMatches[j].rank) score = 1;
            else if (userMatches[i].rank == userMatches[j].rank) score = 0.5;

            nr += kFactor * (score - w);
        }
        userMatches[i].user.elo_data[type] = Math.round(elo_i + nr);
    }

    for (const userMatch of userMatches) {
        const updatedUserElo = await prisma.elos.update({ where: { id: userMatch.user.elosId }, data: { [type]: userMatch.user.elo_data[type] } });
        const updatedUserMatch = await prisma.userMatches.update({ where: { id: userMatch.id }, data: { rank: userMatch.rank } });
        if (userMatch.died) {
            await prisma.user.update({ where: { id: userMatch.userId }, data: { deaths: userMatch.user.deaths + 1 } });
        }
    }
}

module.exports = { Calculate_Elo_Match };
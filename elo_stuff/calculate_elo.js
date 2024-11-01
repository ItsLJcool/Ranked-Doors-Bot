require('dotenv').config();
require('../utils/prisma_client');

const path = require('path');
const fs = require('fs');
const fsPromises = require('fs').promises; // For async operations like mkdir

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
    const users = [];
    for (const userMatch of match.userMatches) {
        const user = await prisma.user.findUnique({ where: { id: userMatch.userId }, include: { elo_data: true } });
        users.push(user);
    }

    match.userMatches = match.userMatches.map(match => {
        const user = users.find(u => u.id === match.userId); // Find matching user
        return {
            ...match,         // Spread match data
            user: user || {}  // Add user data (empty object if not found)
        };
    });

    if (!match.calculated_elo) {

        const prev_match = await JSON.parse(JSON.stringify(match));
        try {
            await calculate_elo(match.userMatches, match.match_type);
            await calculate_elo(match.userMatches, "global");
        } catch (err) {
            console.error('Error calculating elo:', err);

            for (const userMatch of prev_match.userMatches) {
                const updatedUserElo = await prisma.elos.update({ where: { id: userMatch.user.elosId }, data: { [match.match_type]: userMatch.user.elo_data[match.match_type] } });
                const updatedUserMatch = await prisma.userMatches.update({ where: { id: userMatch.id }, data: { rank: userMatch.rank } });
                if (userMatch.died) {
                    const updatedDeaths = await prisma.user.update({ where: { id: userMatch.userId }, data: { deaths: userMatch.user.deaths } });
                }
            }
            await prisma.match.update({ where: { id: match.id }, data: { to_be_reviewed: true, being_verified: false, verified: false } });
            return;
        }

    }

    // TODO: delete images when done calculating elo. rn its broken.
    // Idea: Have it delete 30 days after match completed, so it gives time to edit the data properties!
    // try {
    //     await fsPromises.rm(path.resolve(`MATCHES_IMAGES/${match.id}`), { recursive: true, force: true });
    //     console.log('Directory deleted successfully');
    // } catch (err) {
    //     console.error('Error deleting directory:', err);
    // }

    await prisma.match.update({ where: { id: match.id }, data: { being_verified: false, verified: true, calculated_elo: true } });
}

async function calculate_elo(userMatches, type) {
    userMatches.sort((a, b) => b.reached_door - a.reached_door);

    // Assign ranks while accounting for ties
    let currentRank = 1;
    for (let i = 0; i < userMatches.length; i++) {
        if (i > 0 && (userMatches[i].reached_door === userMatches[i - 1].reached_door)) 
            userMatches[i].rank = userMatches[i - 1].rank; // Same rank for ties
        else {   
            userMatches[i].rank = currentRank; // Assign current rank
            currentRank++;
        }
    }

    // TODO: UPDATE GLOBAL ELO.
    const _kFactor = kFactor/(userMatches.length-1);
    for (let i = 0; i < userMatches.length; i++) {
        const elo_i = userMatches[i].user.elo_data[type];
        let nr = 0;
        for (let j = 0; j < userMatches.length; j++) {
            if (i === j) continue;
            const elo_j = userMatches[j].user.elo_data[type];
            let score = 0;
            let w = 1/(10 ** ( (elo_j - elo_i) / 400)+1);
            if (userMatches[i].rank < userMatches[j].rank) score = 1;
            else if (userMatches[i].rank == userMatches[j].rank) score = 0.5;

            nr += _kFactor * (score - w);
        }
        userMatches[i].user.elo_data[type] = Math.round(elo_i + nr);
    }

    for (const userMatch of userMatches) {
        const updatedUserElo = await prisma.elos.update({ where: { id: userMatch.user.elosId }, data: { [type]: userMatch.user.elo_data[type] } });
        const updatedUserMatch = await prisma.userMatches.update({ where: { id: userMatch.id }, data: { rank: userMatch.rank } });
        
        if (userMatch.died) {
            const updatedDeaths = await prisma.user.update({ where: { id: userMatch.userId }, data: { deaths: userMatch.user.deaths + 1 } });
        }
    }
}

module.exports = { Calculate_Elo_Match };
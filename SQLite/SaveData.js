const { User } = require('discord.js');
const match = require('../commands/matches/match');
const { sequelize } = require('./DataStuff');
const { Sequelize } = require('sequelize');

const ModifiersEnum = [
    "voice acting",
    "uh oh",
    "how unfortunate",
    "chaos chaos",

    "stop right there",
    "room for more",

    "lights on",
    "electrical work",
    "bad electrical work",
    "power shortage",
    "lights out",

    "el goblino on break",
    "el goblino was here",
    "el goblino's payday",
    
    "more stuff",
    "less stuff",
    "wear and tear",
    "out of stuff",

    "gone fishing",
    "sound proofing",
    "wet floor",
    "bad ventilation",
    "locked and loaded",
    "key key key key",

    "nowhere to hide",

    "jammin'",
    
    "tripped",
    "tripped and fell",
    "last few breaths",
    "last breath",

    "didn't skil leg day",
    "faster, faster, faster",
    "MAXIMUM OVERDRIVE",
    "my knees are killing me",
    "my legs are killing me",
    "injuries",

    "good time",
    "bad time",
    "really bad time",
    "worst time ever",

    "rush hour",
    "i'm running here",
    "im tip-toein' here",

    "wrong number",
    "battle of wits",
    
    "i'm everywhere",
    "think fast",
    "think faster",

    "bug spray",
    "itchy",

    "nosey",
    "always watching",
    "seeing double",
    "four eyes",

    "come back here",

    "it can run too",

    "back for seconds",
    "again & again & again",
    "afterimage",

    "rent's due",

    "watch your step",
    "are those pancakes?!",
    "i love pancakes!!!",
];

const MatchesData = sequelize.define('Matches', {
    match_type: {
        type: Sequelize.TEXT, // Use TEXT for match_type
        allowNull: false,
        validate: {
            isIn: [['hotel', 'mines', 'backdoor', 'hard', 'modifiers']], // Validate against ENUM values
        },
    },
    modifiers: {
        type: Sequelize.JSON, // Use JSON instead of ARRAY for modifiers
        allowNull: true,
        defaultValue: [], // Set default value to an empty array
    },

    shop_run: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
    },

    players: {
        type: Sequelize.JSON, // Use JSON for players
        allowNull: false,
        defaultValue: [], // Set default value to an empty array
    },
    alive_players: {
        type: Sequelize.JSON,
        allowNull: false,
        defaultValue: [],
    },

    to_be_reviewed: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
    },
    being_verified: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
    },

    verified: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
    },
    reviewer: {
        type: Sequelize.TEXT,
        allowNull: false,
        defaultValue: "N / A",
    },
    feedback: {
        type: Sequelize.TEXT,
        allowNull: false,
        defaultValue: "N / A",
    },
});

const UserData = sequelize.define('User', {
    user_id: {
        type: Sequelize.TEXT,
        unique: true,
    },
    elo_data: {
        type: Sequelize.JSON,
        allowNull: false,
        defaultValue: {
            hotel: 1500,
            mines: 1500,
            backdoor: 1500,
            hard: 1500,
            modifiers: 1500,

            global: 1500,
        }
    },
    knobs_spent: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
    },
    knobs_gained: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
    },
    deaths: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
    },
});

const UserMatches = sequelize.define('UserMatches', {
    attachments: {
        type: Sequelize.JSON,
        allowNull: false,
        defaultValue: [],
    },
    awaiting_review: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
    },

    reached_door: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
    },
    died: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
    },
    cause_of_death: {
        type: Sequelize.TEXT,
        allowNull: false,
        defaultValue: "unknown",
    },

    elo_stats: {
        type: Sequelize.JSON,
        allowNull: false,
        defaultValue: {
            before: { },
            after: { },
        },
    },
    rank: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: -1,
    }

}, { timestamps: false });

UserData.belongsToMany(MatchesData, { through: UserMatches });
MatchesData.belongsToMany(UserData, { through: UserMatches });

async function sync() {
    await MatchesData.sync({ alter: true });
    await UserData.sync({ alter: true });
    await UserMatches.sync({ alter: true });
}

function _get_match_type(match_type) {
    if (match_type === 'hard') match_type = "SUPER HARD MODE";
    switch (match_type) {
        case 'modifiers':
        case 'global':
            // nothing
            break;
        default:
            match_type = "The "+match_type;
            break;
    }
    match_type = match_type.replace(/\b\w/g, char => char.toUpperCase());  // Capitalize first letters
    return match_type;
}

async function _better_sync(table_sequelize, do_check = false) {
    await table_sequelize.sync();

    if (!do_check) return;

    const attributes = table_sequelize.getAttributes();

    const before_values = await table_sequelize.findAll();

    for (const record of before_values) {
        let needsUpdate = false;
        const updatedData = { ...record.dataValues };
        
        for (const [key, attribute] of Object.entries(attributes)) {
            if (key === 'id' || key === 'createdAt' || key === 'updatedAt' || attribute.defaultValue == undefined || !(attribute.type instanceof Sequelize.JSON)) continue;
            if (JSON.stringify(updatedData[key]) === JSON.stringify(attribute.defaultValue)) continue;

            updatedData[key] = attribute.defaultValue;
            needsUpdate = true;
            console.log("needsUpdate: ", needsUpdate);
        }

        if (needsUpdate) {
            await table_sequelize.update(updatedData, { where: { id: record.id } });
        }
    }
}

module.exports = { sync, _get_match_type, MatchesData, UserData, UserMatches };
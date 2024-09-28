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
    match_id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    match_type: {
        type: Sequelize.ENUM('hotel', 'mines', 'backdoor', 'hard', 'modifiers'),
        allowNull: false,
    },
    modifiers: {
        type: Sequelize.ARRAY(Sequelize.ENUM(ModifiersEnum)),
        allowNull: true,
    },
    players: {
        type: Sequelize.TEXT,
        allowNull: false,
        defaultValue: '',
        get() {
            // Parse the stored string back to an array
            const rawValue = this.getDataValue('players');
            return rawValue ? rawValue.split(',') : [];
        },
        set(value) {
            // Store the array as a comma-separated string
            this.setDataValue('players', value.join(','));
        },
    },
});

const UserData = sequelize.define('User', {
    user_id: {
        type: Sequelize.TEXT,
        primaryKey: true,
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

const UserMatches = sequelize.define('UserMatches', {}, { timestamps: false });

UserData.belongsToMany(MatchesData, { through: 'UserMatches', foreignKey: 'user_id' });
MatchesData.belongsToMany(UserData, { through: 'UserMatches', foreignKey: 'match_id' });

async function sync() {
    await MatchesData.sync();
    await UserData.sync();
    await UserMatches.sync();
}

module.exports = { sync, MatchesData, UserData };
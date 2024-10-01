const { ChannelType } = require('discord.js');
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize('database', 'user', 'password', {
    host: 'localhost',
    dialect: 'sqlite',
    logging: false,
    storage: 'database.sqlite',
});

/**
 * TODO:
 * 1. Make ServerSettings
 * 2. Make Saves for player data
 */

// Example ig
// const Tags = sequelize.define('tags', {
//     name: {
//         type: Sequelize.STRING,
//         unique: true,
//     },
//     description: Sequelize.TEXT,
//     username: Sequelize.STRING,
//     usage_count: {
//         type: Sequelize.INTEGER,
//         defaultValue: 0,
//         allowNull: false,
//     },
// });

/*

https://db-migrate.readthedocs.io/en/latest/

https://www.phpmyadmin.net/
https://dbeaver.io/
https://tableplus.com/

*/

/**
 * DataTypes: (ex: Sequelize.STRING)
 * https://sequelize.org/api/v7/modules/_sequelize_core.index.datatypes
 */

const Settings_Channels = sequelize.define('Settings_Channels', {
    name: {
        type: Sequelize.STRING,
        unique: true,
    },
    description: Sequelize.TEXT,
    channel_id: {
        type: Sequelize.TEXT,
        defaultValue: "",
        allowNull: false,
    },
});

const ChannelSettings_Data = [
    {
        name: "Matchmake Category",
        description: "This will be the category for making new Voice Channels for Ranked Matches.",
        channelTypes: [ChannelType.GuildCategory],
    }, {
        name: "Queue Voice Channel",
        description: "The Voice Channel for the Queue, Players can join or will get sent after a match is ended.",
        channelTypes: [ChannelType.GuildVoice],
    }, {
        name: "Review Channel",
        description: "The Voice Channel for the Reviewer, you can only verify matches in this channel.",
        channelTypes: [ChannelType.GuildText],
    },
];

const Roles_Settings = sequelize.define('Roles_Settings', {
    name: {
        type: Sequelize.STRING,
        unique: true,
    },
    description: Sequelize.TEXT,
    role_id: {
        type: Sequelize.TEXT,
        defaultValue: "",
        allowNull: false,
    },
});

const RoleSettings_Data = [
    {
        name: "Verifier Role",
        description: "This will be the role the bot references to allow verifiers to use special commands.",
    }
];

async function init_db() {
    await custom_table_init(Settings_Channels, ChannelSettings_Data);
    await custom_table_init(Roles_Settings, RoleSettings_Data);
}

const setting_names = [
	{ name: 'Channel Settings', value: 'channel' },
	{ name: 'Role Settings', value: 'role' },
];

async function custom_table_init(table_sequalize, dataArray) {
    
    await table_sequalize.sync();

    if (dataArray.length > 8) {
        console.error("Too many settings to edit, please reduce the amount of settings. Limit is 25");
        return;
    }

    for (const all_data of await table_sequalize.findAll()) {
        const exists = dataArray.some(channel => channel.name === all_data.dataValues.name);
        if (exists) continue;
        table_sequalize.destroy({ where: { name: all_data.dataValues.name } });
    }

    for (const data of dataArray) {
        const bruh = await table_sequalize.findOne({ where: { name: data.name } });

        if (bruh != null) continue;

        await table_sequalize.create(data);
    }
}

function GetSettingsData(table_sequalize) {
    switch(table_sequalize) {
        default:
            return ChannelSettings_Data;
    }
}

module.exports = { init_db, setting_names, Settings_Channels, Roles_Settings, sequelize, GetSettingsData};
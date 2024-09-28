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

async function sync() {
    await Settings_Channels.sync();
}

const ChannelSettings_Data = [
    {
        name: "TestChannel",
        description: "This would be the description",
    }
]

async function init_db() {
    
    for (const data of ChannelSettings_Data) {
        const bruh = await Settings_Channels.findOne({ where: { name: data.name } });

        if (bruh != null) continue;

        await Settings_Channels.create(data);
    }

}

module.exports = { init_db, sync, Settings_Channels, sequelize };
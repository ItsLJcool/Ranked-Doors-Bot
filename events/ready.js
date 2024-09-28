const { Events } = require('discord.js');

const { init_db, Settings_Channels, sequelize } = require('../SQLite/DataStuff');
const { sync, MatchesData } = require('../SQLite/SaveData');

module.exports = {
	name: Events.ClientReady,
	once: true,
	async execute(client) {
		try {
			await init_db();
			await sync();
		} catch (error) {
			console.error(error);
		}

		console.log(`Ready! Logged in as ${client.user.tag}`);
	},
};
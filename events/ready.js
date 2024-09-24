const { Events } = require('discord.js');

const { init_db, sync, Settings_Channels, sequelize } = require('../SQLite/DataStuff');

module.exports = {
	name: Events.ClientReady,
	once: true,
	async execute(client) {
		await sync();
		
		try {
			await init_db();
		} catch (error) {
			console.error(error);
		}

		console.log(`Ready! Logged in as ${client.user.tag}`);
	},
};
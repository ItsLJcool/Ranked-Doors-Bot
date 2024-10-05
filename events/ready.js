const { Events } = require('discord.js');
const { init_settings } = require('../utils/server_settings');

module.exports = {
	name: Events.ClientReady,
	once: true,
	async execute(client) {

		try {
			await init_settings();
		} catch (error) {
			console.error(error);
		}

		console.log(`Ready! Logged in as ${client.user.tag}`);
	},
};
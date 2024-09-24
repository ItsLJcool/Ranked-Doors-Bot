const { Events } = require('discord.js');

const { Tags, sequelize } = require('../SQLite/Tags');

module.exports = {
	name: Events.ClientReady,
	once: true,
	execute(client) {
		Tags.sync();
		console.log(`Ready! Logged in as ${client.user.tag}`);
	},
};
const { Events } = require('discord.js');

module.exports = {
	name: Events.MessageCreate,
	async execute(message) {
		const commands = [...message.client.commands.values()].filter(command => command.on_message_create);

		commands.forEach((command, key) => {
			if (!command.on_message_create) return;
			command.on_message_create(message);
		});
	},
};
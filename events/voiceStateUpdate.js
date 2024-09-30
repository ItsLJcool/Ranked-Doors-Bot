const { Events } = require('discord.js');

module.exports = {
	name: Events.VoiceStateUpdate,
	async execute(oldState, newState) {
		const commands = [...newState.client.commands.values()].filter(command => command.on_voice_state_update);

		commands.forEach((command, key) => {
			if (!command.on_voice_state_update) return;
			command.on_voice_state_update(oldState, newState);
		});
	},
};
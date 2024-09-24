const { Events, Collection } = require('discord.js');

const defaultCooldownDuration = 2;

async function chatInputCommand(interaction) {
	const { cooldowns } = interaction.client;

	const command = interaction.client.commands.get(interaction.commandName);

	if (!cooldowns.has(command.data.name)) {
		cooldowns.set(command.data.name, new Collection());
	}

	const now = Date.now();
	const timestamps = cooldowns.get(command.data.name);
	const cooldownAmount = (command.cooldown ?? defaultCooldownDuration) * 1_000;
	
	if (timestamps.has(interaction.user.id)) {
		const expirationTime = timestamps.get(interaction.user.id) + cooldownAmount;

		if (now < expirationTime) {
			const expiredTimestamp = Math.round(expirationTime / 1_000);
			return interaction.reply({ content: `Please wait, you are on a cooldown for \`${command.data.name}\`. You can use it again <t:${expiredTimestamp}:R>.`, ephemeral: true });
		}
	}
	
	timestamps.set(interaction.user.id, now);
	setTimeout(() => timestamps.delete(interaction.user.id), cooldownAmount);

	if (!command) {
		console.error(`No command matching ${interaction.commandName} was found.`);
		return;
	}

	try {

		await command.execute(interaction);

	} catch (error) {
		console.error(error);
		if (interaction.replied || interaction.deferred) {
			await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
		} else {
			await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
		}
	}
}

async function handleButton(interaction) {
	// Thanks ChatGPT to help me remember how filtering works lol
	const commandsWithButtons = [...interaction.client.commands.values()].filter(command => command.button_data);

	commandsWithButtons.forEach((command, key) => {
		if (!command.button_data) return;
		
		command.button_data.forEach((item, index) => {
			if (item.customId !== interaction.customId) return;
			command.button_data[index].execute(interaction);
		});
	});
}

module.exports = {
	name: Events.InteractionCreate,
	async execute(interaction) {

		if (interaction.isButton()) {
			handleButton(interaction);
			return;
		}

		if (interaction.isChatInputCommand()) {
			chatInputCommand(interaction);
			return;
		}
	},
};
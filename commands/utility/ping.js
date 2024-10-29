const { SlashCommandBuilder } = require('discord.js');

// const wait = require('node:timers/promises').setTimeout;
/*
    ephemeral
*/

module.exports = {
	data: new SlashCommandBuilder()
		.setName('ping')
		.setDescription('Replies with Pong!'),
        
	async execute(interaction) {
		console.log("interaction.locale: ", interaction.locale);
		const locales = { ja: 'ポン！', };
		await interaction.reply(locales[interaction.locale] ?? 'Pong!');
	},
};
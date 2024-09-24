const { ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, SlashCommandBuilder } = require('discord.js');

const { Settings_Channels, sequelize } = require('../../SQLite/DataStuff');

// const wait = require('node:timers/promises').setTimeout;
/*
    ephemeral
*/



module.exports = {
	data: new SlashCommandBuilder()
		.setName('settings')
		.setDescription('View and Edit server settings.'),
        
	async execute(interaction) {
        const tagList = await Settings_Channels.findAll();
        console.log("tagList: ", tagList);
        const select = new StringSelectMenuBuilder()
			.setCustomId('starter')
			.setPlaceholder('Make a selection!')
			.addOptions(
				new StringSelectMenuOptionBuilder()
					.setLabel('Bulbasaur')
					.setDescription('The dual-type Grass/Poison Seed Pokémon.')
					.setValue('bulbasaur'),
				new StringSelectMenuOptionBuilder()
					.setLabel('Charmander')
					.setDescription('The Fire-type Lizard Pokémon.')
					.setValue('charmander'),
				new StringSelectMenuOptionBuilder()
					.setLabel('Squirtle')
					.setDescription('The Water-type Tiny Turtle Pokémon.')
					.setValue('squirtle'),
			);
            
		const row = new ActionRowBuilder()
        .addComponents(select);

        await interaction.reply({
            content: 'Choose your starter!',
            components: [row],
        });
	},
};
const { ComponentType, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ChannelSelectMenuBuilder, ChannelType, EmbedBuilder, SlashCommandBuilder } = require('discord.js');

const { Settings_Channels, sequelize } = require('../../SQLite/DataStuff');

// const wait = require('node:timers/promises').setTimeout;
/*
    ephemeral
*/

function embed_menu(interaction, tagList) {
	var populate_fields = [];
	for (const tag of tagList) {
		populate_fields.push({
			name: tag.name,
			value: tag.description,
			inline: false
		});
	}

	const embed = new EmbedBuilder()
	.setAuthor({ name: "Ranked Doors | Server Settings" })
	.setTitle("Server Settings")
	.setDescription("Click on the dropdown box to edit a setting.\nㅤ")
	.addFields(populate_fields)
	.setColor("#00b0f4")
	.setFooter({ text: `Command ran by @${interaction.user.username}` })
	.setTimestamp();
	
	return embed;
}

const EDIT_SETTING_TIMEOUT = 120_000; // milliseconds

async function channel_edit(interaction) {
	console.log("interaction: ", interaction);

	var channelTypes = []

	switch(interaction.values[0]) {
		case 'TestChannel':
			channelTypes = [ChannelType.GuildCategory];
			break;
	}
	
	const channelDropdown = new ChannelSelectMenuBuilder()
		.setCustomId('channel')
		.setPlaceholder('Select a channel or category to apply to the setting.')
		.setMaxValues(1)
		.setMinValues(1);
	if (channelTypes.length > 0) channelDropdown.setChannelTypes(channelTypes);

	const row = new ActionRowBuilder().addComponents(channelDropdown);
	
	const expiredTimestamp = Math.round((Date.now() + EDIT_SETTING_TIMEOUT) / 1_000);

	const response = await interaction.reply({
		content: `Channel Selection Menu\nThis will time out in <t:${expiredTimestamp}:R> to save on resources.`,
		components: [row],
		ephemeral: true,
		fetchReply: true,
	});

	const collectorFilter = i => i.user.id === interaction.user.id;

	try {
		const bruh = await response.awaitMessageComponent({ componentType: ComponentType.ChannelSelect, filter: collectorFilter,  time: EDIT_SETTING_TIMEOUT });
		
		bruh.reply("test");

	} catch (e) {
		await interaction.editReply({ content: 'Took too long to edit, disabling to save resources', components: [] });
	}
}

module.exports = {
	data: new SlashCommandBuilder()
		.setName('settings')
		.setDescription('View and Edit server settings.'),
        
	async execute(interaction) {
        const tagList = await Settings_Channels.findAll();
		const embed = embed_menu(interaction, tagList);

		var populate_OptionData = [];
		for (const tag of tagList) {
			populate_OptionData.push(
				new StringSelectMenuOptionBuilder()
					.setLabel(tag.name)
					.setDescription(tag.description)
					.setValue(tag.name)
			);
		}
        const select = new StringSelectMenuBuilder()
			.setCustomId('settings')
			.setPlaceholder('Select a setting to view or edit.')
			.addOptions(populate_OptionData);
            
		const row = new ActionRowBuilder().addComponents(select);

        await interaction.reply({
			embeds: [embed],
            components: [row],
        });
	},

	string_select_menu_data: [
		{
			any: true,
			async execute(interaction) {
				switch (interaction.customId) {
					case 'settings':
						channel_edit(interaction);
						break;
					default:
						interaction.reply({content: 'Something went wrong...', ephemeral: true});
				}
			}
		}
	]
};
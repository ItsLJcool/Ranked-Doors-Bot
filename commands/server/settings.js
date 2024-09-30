const { PermissionFlagsBits, RoleSelectMenuBuilder, ComponentType, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ChannelSelectMenuBuilder, ChannelType, EmbedBuilder, SlashCommandBuilder } = require('discord.js');

const { setting_names, Settings_Channels, Roles_Settings, sequelize, GetSettingsData} = require('../../SQLite/DataStuff');

// const wait = require('node:timers/promises').setTimeout;
/*
    ephemeral
*/

function embed_menu(interaction, tagList) {
	var populate_fields = [];
	for (const tag of tagList) {
		var _value = "???";
		if (tag instanceof Settings_Channels) _value = `<#${tag.channel_id}>`;
		else if (tag instanceof Roles_Settings) _value = `<@&${tag.role_id}>`;
		
		populate_fields.push({
			name: tag.name,
			value: tag.description,
			inline: true
		});
		populate_fields.push({
			name: `Value of ${tag.name}`,
			value: _value,
			inline: true
		});
		populate_fields.push({
			name: "\u200b",
			value: "\u200b",
			inline: true
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
	var channelTypes = GetSettingsData(Settings_Channels).find(channel => channel.name === interaction.values[0]).channelTypes;

	if (channelTypes == undefined) channelTypes = [ChannelType.GuildText, ChannelType.GuildVoice, ChannelType.GuildCategory];
	
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
		await bruh.deferReply();
		await Settings_Channels.update({ channel_id: bruh.values[0] }, { where: { name: interaction.values[0] } });
		
		await interaction.deleteReply();
		
		await bruh.deleteReply();
		
		interaction.message.edit({
			embeds: [embed_menu(interaction, await Settings_Channels.findAll())],
		});

	} catch (e) {
		await interaction.editReply({ content: 'Took too long to edit, disabling to save resources', components: [] });
	}
}

async function role_edit(interaction) {	
	const roleDropdown = new RoleSelectMenuBuilder()
		.setCustomId('role')
		.setPlaceholder('Select a role or category to apply to the setting.')
		.setMaxValues(1)
		.setMinValues(1);

	const row = new ActionRowBuilder().addComponents(roleDropdown);
	
	const expiredTimestamp = Math.round((Date.now() + EDIT_SETTING_TIMEOUT) / 1_000);

	const response = await interaction.reply({
		content: `Role Selection Menu\nThis will time out in <t:${expiredTimestamp}:R> to save on resources.`,
		components: [row],
		ephemeral: true,
		fetchReply: true,
	});

	const collectorFilter = i => i.user.id === interaction.user.id;

	try {
		const bruh = await response.awaitMessageComponent({ componentType: ComponentType.RoleSelect, filter: collectorFilter,  time: EDIT_SETTING_TIMEOUT });
		await bruh.deferReply();
		await Roles_Settings.update({ role_id: bruh.values[0] }, { where: { name: interaction.values[0] } });

		await interaction.deleteReply();

		await bruh.deleteReply();
		
		interaction.message.edit({
			embeds: [embed_menu(interaction, await Roles_Settings.findAll())],
		});

	} catch (e) {
		await interaction.editReply({ content: 'Took too long to edit, disabling to save resources', components: [] });
	}
}

function delete_interaction(interaction, seconds = 5) {
	setTimeout(() => {
		interaction.deleteReply().catch(console.error);
	}, seconds*1_000);
}

module.exports = {
	data: new SlashCommandBuilder()
		.setName('settings')
		.setDescription('View and Edit server settings.')
		.addStringOption(option =>
			option.setName('type')
				.setDescription('The Setting Type')
				.setRequired(true)
				.addChoices(setting_names)
		).setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles | PermissionFlagsBits.ManageChannels | PermissionFlagsBits.ManageGuild),
        
	async execute(interaction) {
		const setting_type = interaction.options.getString('type');
		console.log("Setting Type: ", setting_type);
		switch (setting_type) {
			case 'channel':
				tag_Setting = Settings_Channels;
				break;
			case 'role':
				tag_Setting = Roles_Settings;
				break;
			default:
				delete_interaction(interaction);
				return interaction.reply({content: 'Something went wrong...', ephemeral: true});
				break;
		}
        const tagList = await tag_Setting.findAll();
		if (tagList.length < 1) return interaction.reply({ content: "There are no settings to edit.", ephemeral: true });
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
			.setCustomId(setting_type)
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
			customId: 'channel',
			async execute(interaction) {
				channel_edit(interaction);
			}
		}, {
			customId: 'role',
			async execute(interaction) {
				role_edit(interaction);
			}
		}
	]
};
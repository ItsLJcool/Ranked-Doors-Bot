const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ComponentType, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ChannelSelectMenuBuilder, ChannelType, RoleSelectMenuBuilder } = require('discord.js');

// const wait = require('node:timers/promises').setTimeout;
/*
    ephemeral
*/

const prisma = global.prisma;

function delete_interaction(interaction, seconds = 5) {
	setTimeout(() => {
		interaction.deleteReply().catch(console.error);
	}, seconds*1_000);
}

const EDIT_SETTING_TIMEOUT = 120_000; // milliseconds

function embed_menu(interaction, settings) {
	var populate_fields = [];
	for (const tag of settings) {
		var _value = "???";
		switch (tag.menuType) {
			case 1:
				_value = `<#${tag.value}>`;
				break;
			case 2:
				_value = `<@&${tag.value}>`;
				break;
		}

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

async function settings_edit(interaction, setting) {
	
	var component = null;
	var componentType = null;
	switch (setting.menuType) {
		case 1:
			component = new ChannelSelectMenuBuilder()
			.setCustomId('channel_settings_edit')
			.setPlaceholder('Select a channel or category to apply to the setting.')
			.setMaxValues(1)
			.setMinValues(1)
			.setChannelTypes(setting.type);
			componentType = ComponentType.ChannelSelect;
			break;
		case 2:
			component = new RoleSelectMenuBuilder()
			.setCustomId('role_settings_edit')
			.setPlaceholder('Select a role or category to apply to the setting.')
			.setMaxValues(1)
			.setMinValues(1);
			componentType = ComponentType.RoleSelect;
			break;
	}

	const row = new ActionRowBuilder().setComponents(component);
	
	const expiredTimestamp = Math.round((Date.now() + EDIT_SETTING_TIMEOUT) / 1_000);

	const response = await interaction.editReply({
		content: `Setting Selection Menu\nThis will time out in <t:${expiredTimestamp}:R> to save on resources.`,
		components: [row],
		ephemeral: true,
		fetchReply: true,
	});

	const filter = i => i.user.id === interaction.user.id;

	try {
		const bruh = await response.awaitMessageComponent({ componentType, filter, time: EDIT_SETTING_TIMEOUT });
		await bruh.deferReply();
		await prisma.settings.update({ where: { name: setting.name }, data: { value: bruh.values[0] } });
		
		await interaction.deleteReply();
		await bruh.deleteReply();
		
		interaction.message.edit({
			embeds: [embed_menu(interaction, await prisma.settings.findMany())],
		});

	} catch (e) {
		await interaction.editReply({ content: 'Took too long to edit, disabling to save resources', components: [] });
	}
}

module.exports = {
	data: new SlashCommandBuilder()
		.setName('settings')
		.setDescription('Change the settings for the server.')
		.setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles | PermissionFlagsBits.ManageChannels | PermissionFlagsBits.ManageGuild),
        
	async execute(interaction) {
		const settings = await prisma.settings.findMany();
		if (settings.length < 1) return interaction.reply({ content: "There are no settings to edit.", ephemeral: true });

		var populate_OptionData = [];
		for (const tag of settings) {
			populate_OptionData.push(
				new StringSelectMenuOptionBuilder()
					.setLabel(tag.name)
					.setDescription(tag.description)
					.setValue(tag.name)
			);
		}
        const select = new StringSelectMenuBuilder()
			.setCustomId("settings_edit")
			.setPlaceholder('Select a setting to view or edit.')
			.addOptions(populate_OptionData);
            
		const row = new ActionRowBuilder().addComponents(select);

		await interaction.reply({ embeds: [embed_menu(interaction, settings)], components: [row] });
	},

	string_select_menu_data: [
		{
			customId: 'settings_edit',
			async execute(interaction) {
				await interaction.deferReply({ ephemeral: true });
				if (interaction.user.id !== interaction.message.interaction.user.id) {
					return interaction.reply({ content: "You are not the owner of this interaction!", ephemeral: true });
				}

				const setting = await prisma.settings.findUnique({ where: { name: interaction.values[0] } });
				settings_edit(interaction, setting);
			}
		}
	]
};
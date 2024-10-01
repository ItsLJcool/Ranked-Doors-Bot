const { SlashCommandBuilder } = require('discord.js');

const { setting_names, Settings_Channels, Roles_Settings, sequelize, GetSettingsData } = require('../../SQLite/DataStuff');
const { _get_match_type, MatchesData, UserData, UserMatches } = require('../../SQLite/SaveData');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('verify_match')
		.setDescription('VERIFIER ONLY: Gets a match to be verified, and makes a new thread.'),
    
	async execute(interaction) {
		await interaction.deferReply({ephemeral: true});

		var role_setting = await Roles_Settings.findOne({ where: { name: 'Verifier Role' } });

		if (!role_setting || (role_setting.dataValues.role_id == "" || role_setting.dataValues.role_id == " ")) {
			return interaction.editReply({ content: "Server Settings are not Initalized!", ephemeral: true });
		}
		role_setting = role_setting.toJSON();
		
		const member = interaction.member;
		if (!member.roles.cache.some(role => role.id === role_setting.role_id)) {
			return interaction.editReply({ content: "You cannot use this command.", ephemeral: true });
		}

        var review_channel = await Settings_Channels.findOne({ where: { name: 'Review Channel' } });
		if (!review_channel || (review_channel.dataValues.channel_id == "" || review_channel.dataValues.channel_id == " ")) {
			return interaction.editReply({ content: "Server Settings are not Initalized!", ephemeral: true });
        }
        review_channel = review_channel.toJSON();
        if (interaction.channel.id !== review_channel.channel_id) {
            return interaction.editReply({ content: `This command was not ran in <#${review_channel.channel_id}>`, ephemeral: true });
        }

        await interaction.editReply({ content: "TODO: lol" });
	},
};
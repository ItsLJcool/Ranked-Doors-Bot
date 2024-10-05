const { SlashCommandBuilder, EmbedBuilder, UserSelectMenuBuilder, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } = require('discord.js');

function fields_embed(match_data, user_data) {
	const shop = match_data.shop_run ? "Shop" : "No Shop";
	const died = user_data.died ? "Yes" : "No";

	var alive_players = match_data.alive_players.map(player => `<@${player}>`).join(', ');
	if (alive_players.length == 0) alive_players = "No One";
	return [
		{
			name: "Alive Players",
			value: `${alive_players}`,
			inline: true
		}, {
			name: "Shop Run?",
			value: `${shop} - Please check if someone did buy an item, if they did we would consider this match a Shop run anyways.`,
			inline: true
		}, {
			name: "(To Be added, ignore for now) Modifiers",
			value: "This is where the list of modifiers would go, but they are disabled as of right now.",
			inline: true
		}, {
			name: "Reached Door #",
			value: `${user_data.reached_door}`,
			inline: false
		}, {
			name: "Did Die?",
			value: died,
			inline: false
		}, {
			name: "Cause of Death",
			value: `${user_data.cause_of_death}`,
			inline: false
		},
	]
}

function string_menu_options(match_data) {
	var populate_options = [
		new StringSelectMenuOptionBuilder()
			.setLabel("Shop Run")
			.setValue("shop")
			.setDescription(`Edit the value of \`Shop Run\` to \`${match_data.shop_run ? "Yes" : "No"}\``),
		// new StringSelectMenuOptionBuilder()
		// 	.setLabel("Modifiers")
		// 	.setValue("modifiers")
		// 	.setDescription(`Edit the list of modifiers (Disabled as of right now)`),
		new StringSelectMenuOptionBuilder()
			.setLabel("Reached Door #")
			.setValue("door")
			.setDescription(`Edit the value of \`Reached Door #\``),
		new StringSelectMenuOptionBuilder()
			.setLabel("Did Die?")
			.setValue("died")
			.setDescription(`Edit the value of \`Did Die?\``),
		new StringSelectMenuOptionBuilder()
			.setLabel("Cause of Death")
			.setValue("cause")
			.setDescription(`Edit the value of \`Cause of Death\``),
	];

	return populate_options;
}

function embed_menu(match_data, user_data) {
	return
	// console.log("user_data: ", user_data);
	
	const shop = match_data.shop_run ? "Shop" : "No Shop";
	const match_type = _get_match_type(match_data.match_type);

	const embed = new EmbedBuilder()
	.setAuthor({ name: `Reviewing Match #${match_data.id} | Match Review`, })
	.setTitle(`${match_type} - ${shop} | ${match_data.players.length} Player Ranked Match`)
	.setDescription("Here this embed will cycle between each user's submitions for this match, and all you need to do is view the images, document the values associated with the information, and submit!\n\nAll the Elo's are calculated automatically after verifying the proper data.\n\nThe first 3 Fields are just for the Match itself, the other fields are based off the player screenshots for data analysis.")
	.addFields(fields_embed(match_data, user_data))
	.setColor("#00b0f4")

	return embed;
}

async function _interaction_reply(interaction, data) {
	if (interaction == undefined) return;
	await interaction.editReply(data);
}
async function _message_reply(interaction, data) {
	if (interaction.message == undefined) _interaction_reply(interaction, data);
	await interaction.message.edit(data);
}

async function start_verifying(interaction, match, is_message = false) {
	return
	const reply_stuff = !is_message ? _interaction_reply : _message_reply;
	var user_match = await UserMatches.findOne({
		where: { MatchId: match.id },
	});
	
	if (user_match == undefined) {
		return reply_stuff(interaction, { content: "This User's match wasn't found! Please report this to the bot owner." });
	}

	const match_json = match.toJSON();
	const user_json = user_match.toJSON();

	const alive_players_select = new UserSelectMenuBuilder()
		.setCustomId('verify_alive_players')
		.setPlaceholder('Alive Players')
		.setMinValues(0)
		.setMaxValues(match_json.players.length)
		.setDefaultUsers(match_json.players);

	const string_dynamic_select = new StringSelectMenuBuilder()
		.setCustomId('verify_dynamic')
		.setPlaceholder('Edit data properties')
		.setMinValues(1)
		.setMaxValues(1)
		.addOptions(string_menu_options(match_json));
	
	
	
	const row = new ActionRowBuilder().addComponents(alive_players_select);
	const row2 = new ActionRowBuilder().addComponents(string_dynamic_select);

	const rows = [row, row2];

	await reply_stuff(interaction, { components: rows, embeds: [embed_menu(match_json, user_json)], files: user_json.attachments });
}

var verifing_data = [];

module.exports = {
	data: new SlashCommandBuilder()
		.setName('verify_match')
		.setDescription('VERIFIER ONLY: Gets a match to be verified, and makes a new thread.'),
    
	async execute(interaction) {
		return
		await interaction.deferReply();

		if (verifing_data.find(data => data.user_id === interaction.user.id)) {
			await interaction.followUp({ content: "You are already verifying a match!", ephemeral: true  });
			return interaction.deleteReply();
		}

		var role_setting = await Roles_Settings.findOne({ where: { name: 'Verifier Role' } });

		if (!role_setting || (role_setting.dataValues.role_id == "" || role_setting.dataValues.role_id == " ")) {
			await interaction.followUp({ content: "Server Settings are not Initalized!", ephemeral: true  });
			return interaction.deleteReply();
		}
		role_setting = role_setting.toJSON();
		
		const member = interaction.member;
		if (!member.roles.cache.some(role => role.id === role_setting.role_id)) {
			await interaction.followUp({ content: "You cannot use this command.", ephemeral: true });
			return interaction.deleteReply();
		}

        var review_channel = await Settings_Channels.findOne({ where: { name: 'Review Channel' } });
		if (!review_channel || (review_channel.dataValues.channel_id == "" || review_channel.dataValues.channel_id == " ")) {
			await interaction.followUp({ content: "Server Settings are not Initalized!", ephemeral: true });
			return interaction.deleteReply();
        }
        review_channel = review_channel.toJSON();
        if (interaction.channel.id !== review_channel.channel_id) {
			await interaction.followUp({ content: `This command was not ran in <#${review_channel.channel_id}>`, ephemeral: true });
			return interaction.deleteReply();
        }

		return

		if (!matchesToReview || matchesToReview == undefined || matchesToReview.length < 1) {
			await interaction.followUp({ content: "There are no matches to be reviewed!", ephemeral: true });
			return interaction.deleteReply();
		}
		
		verifing_data.push({
			user_id: interaction.user.id,
			user_index: 0,
			max_index: matchesToReview.length-1,
			current_match_data: matchesToReview[0].toJSON(),
		});
		
		try {
			await start_verifying(interaction, matchesToReview[0]);
		} catch (error) {
			console.error(error);
			verifing_data = verifing_data.filter(data => data.user_id !== interaction.user.id);
			await interaction.editReply({ content: "There was an error while verifying the match!", ephemeral: true });
		}
	},

	user_select_menu_data: [
		{
			customId: 'verify_alive_players',
			async execute(interaction) {
				await interaction.deferReply({ ephemeral: true });
				if (interaction.user.id !== interaction.message.interaction.user.id) {
					return interaction.editReply({ content: "You are not the owner of this interaction!" });
				}

				const user_verify = verifing_data.find(data => data.user_id === interaction.user.id);
				if (user_verify == undefined) {
					await interaction.message.delete();
					return interaction.editReply({ content: "This embed's cache was not found! Please run the command again." });
				}
				// const match = await MatchesData.findOne({
				// 	where: { to_be_reviewed: true }
				// });
				
				console.log("user_verify.match_reviewing: ", user_verify.match_reviewing);
				return
				start_verifying(interaction, user_verify.match_reviewing, true);
				interaction.deleteReply();
			}
		},
	],

	string_select_menu_data: [
		{
			customId: 'verify_dynamic',
			async execute(interaction) {
				await interaction.deferReply({ ephemeral: true });
				if (interaction.user.id !== interaction.message.interaction.user.id) {
					return interaction.editReply({ content: "You are not the owner of this interaction!" });
				}

				const user_verify = verifing_data.find(data => data.user_id === interaction.user.id);
				if (user_verify == undefined) {
					await interaction.message.delete();
					return interaction.editReply({ content: "This embed's cache was not found! Please run the command again." });
				}

				console.log("interaction.values: ", interaction.values);
				return;
				
				switch (interaction.values[0]) {
					case 'shop':
						user_verify.match_reviewing.update({ shop_run: true });
						break;
					case 'no shop':
						user_verify.match_reviewing.update({ shop_run: false });
						break;
					// case 'modifiers':
					// 	user_verify.match_reviewing.update({ modifiers: interaction.values.slice(1) });
					// 	break;
					default:
						await interaction.editReply({ content: "Something went wrong while verifying the match!" });
						break;
				}
			}
		},
	]
};
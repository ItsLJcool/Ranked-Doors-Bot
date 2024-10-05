const { Collection, AttachmentBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ActionRowBuilder, ChannelType, ButtonBuilder, ButtonStyle, SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, User } = require('discord.js');

// const wait = require('node:timers/promises').setTimeout;
/*
    ephemeral
*/

function embed_menu() {
	const embed = new EmbedBuilder()
	.setAuthor({ name: "Submit Match | Ranked Doors", })
	.setTitle("Submit a Match!")
	.setDescription("This is where you can submit a match to be verified and sent to calculate your Elo!\n\nCurrently required data to have your data verified (Or else the ENITRE match can't be verified)")
	.addFields( {
		name: "Pre-Shop Image",
		value: "This is required for ensuring you didn't buy items, and to see your Knobs, and Revives.",
		inline: false
	}, {
		name: "Death Screen",
		value: "This is used for ranking your Elo, and to verify if you revived or not.",
		inline: false
	}, {
		name: "Player List",
		value: "This is to confirm if the screenshots were of the same match or not.\n**At least *ONE* player needs to submit this.\nif someone leaves during the match, *ALL* players will need to submit this.**",
		inline: false
	}).setColor("#00b0f4")
	.setFooter({ text: "Please interact with the button below to submit your match data!", });

	return embed;
}

function thread_embed() {
	const embed = new EmbedBuilder()
		.setAuthor({ name: "Verify Match | Ranked Doors", })
		.setTitle("Verify Match")
		.setDescription("Please select a match ID that you would like to verify!\nNote: Recent matches are at the top.")
		.setColor("#00b0f4");

  return embed;
}

function verify_images_embed() {
	const embed = new EmbedBuilder()
		.setAuthor({ name: "Verify Match | Ranked Doors", })
		.setTitle("Verify Images")
		.setDescription("Send all the images relating to the match to be reviewed and processed as a message.")
		.setColor("#00b0f4");

  return embed;
}

var threads_to_check = [];
var user_opening_thread = [];

async function button_confirm(interaction) {
	await interaction.deferReply({ ephemeral: true });

	for (const data of user_opening_thread) {
		if (data === interaction.user.id) {
			return interaction.editReply({ content: "You are already submitting a match!", ephemeral: true });
		}
	}

    var user = await UserData.findOne({
        where: { user_id: interaction.user.id },
        include: [MatchesData]
    });

	if (!user)
		return interaction.editReply({ content: "You are not registered!\nPlease register with `/register`", ephemeral: true });

	user = user.toJSON();

	var _has_match_to_submit = false;
	console.log("user.Matches: ", user.Matches);
	for (const match of user.Matches) {
		if (match.verified || match.UserMatches.awaiting_review) continue;
		_has_match_to_submit = true;
		break;
	}

	if (!_has_match_to_submit)
		return interaction.editReply({ content: "You have no matches to submit!", ephemeral: true });

	await interaction.deleteReply();

	// Create a thread in the channel where the interaction was invoked
	const thread = await interaction.channel.threads.create({
		name: `Submitting Match | ${interaction.user.username}`, // Name of the thread
		autoArchiveDuration: 60,     // Auto-archive duration in minutes (1 hour here)
		type: ChannelType.PrivateThread,
		reason: `${interaction.user.username} is submiting a match.`, // Reason for creating the thread
		invitable: false,
	}).catch(console.error);
	
	user_opening_thread.push(interaction.user.id);
	thread.members.add(interaction.user.id);


	const populate_options = [];
	const _matches = user.Matches.sort((a, b) => a.id - b.id);
	for (const match of _matches) {
		if (match.verified || match.UserMatches.awaiting_review) continue;
        const formattedType = _get_match_type(match.match_type);
		populate_options.push(
			new StringSelectMenuOptionBuilder()
				.setLabel(`${formattedType} - Match Id #${match.id}`)
				.setValue(`${match.id}`)
				.setDescription(`Match played on ${match.createdAt.toLocaleString()} with ${match.players.length} players.`)
		);
	}

	const selectMenu = new StringSelectMenuBuilder()
    .setCustomId('match_id_select')
    .setPlaceholder('Select a Match you haven\'t submitted yet.')
	.setMinValues(1)
	.setMaxValues(1)
    .addOptions(populate_options);

	const row = new ActionRowBuilder().addComponents(selectMenu);
	
	thread.send({ embeds: [thread_embed()], components: [row] });
}

module.exports = {
	data: new SlashCommandBuilder()
		.setName('embed_submit_match_gen')
		.setDescription('VERIFIER ONLY: Sends an embed for submitting a match.'),
        
	async execute(interaction) {
		return
		await interaction.deferReply({ephemeral: true});

		var role_setting = await Roles_Settings.findOne({ where: { name: 'Verifier Role' } });

		if (!role_setting) {
			return interaction.editReply({ content: "Server Settings are not Initalized!", ephemeral: true });
		}
		role_setting = role_setting.toJSON();
		
		const member = interaction.member;
		if (!member.roles.cache.some(role => role.id === role_setting.role_id)) {
			return interaction.editReply({ content: "You cannot use this command.", ephemeral: true });
		}

		const button = new ButtonBuilder()
			.setCustomId('submit_match')
			.setLabel('Submit Match')
			.setStyle(ButtonStyle.Primary);

		const row = new ActionRowBuilder().addComponents(button);

		await interaction.deleteReply();
		await interaction.channel.send({ embeds: [embed_menu()], components: [row] });
	},

	button_data: [
		{
			customId: 'submit_match',
			async execute(interaction) {
				await button_confirm(interaction);
			},
		}
	],

	string_select_menu_data: [
		{
			customId: 'match_id_select',
			async execute(interaction) {
				await interaction.deferReply({ ephemeral: true });
				const match_id = parseInt(interaction.values[0]);
				const channel = await interaction.guild.channels.fetch(interaction.channelId);
				if (!channel.isThread()) 
					return interaction.reply({ content: "This is not a thread! how tf did you do this???", ephemeral: true });

				threads_to_check.push({
					thread_id: channel.id,
					match_id: match_id,
				});

				const user = await UserData.findOne({
					where: { user_id: interaction.user.id },
				});

				const user_match = await UserMatches.findOne({ where: { UserId: user.id, MatchId: match_id } });
				if (user_match) {
					user_match.update({ elo_stats: {
						before: user.elo_data, 
						after: user.elo_data
					}});
				}

				await interaction.deleteReply();
				await interaction.message.edit({ embeds: [verify_images_embed()], components: [] });
			}
		}
	],

	async on_message_create(message) {
		var thread_data = threads_to_check.find(thread => thread.thread_id === message.channel.id)
		if (message.author.bot || !message.channel.isThread() || !thread_data) return;
		
		const attachments = message.attachments.map(attachment => attachment.url);

		if (attachments.length < 1) return;
		var user = await UserData.findOne({
			where: { user_id: message.author.id },
			include: [MatchesData]
		});
		if (!user) {
			return interaction.reply({ content: "how the fuck?? oh well... your not registered????, please register with `/register`", ephemeral: true });
		}
		user = user.toJSON();

		const user_match = await UserMatches.findOne({ where: { UserId: user.id, MatchId: thread_data.match_id } });

		const match = await MatchesData.findOne({ where: { id: thread_data.match_id } });

		if (user_match) {
			user_match.update({ attachments: attachments, awaiting_review: true });
		}

		var all_matches_to_users = await UserMatches.findAll({ where: { MatchId: thread_data.match_id } });
		var _match_ready_to_be_reviewed = false;
		for (var _user of all_matches_to_users) {
			_user = _user.toJSON();
			if (!_user.awaiting_review) {
				_match_ready_to_be_reviewed = false;
				break;
			}
			_match_ready_to_be_reviewed = true;
		}
		
		if (_match_ready_to_be_reviewed) {
			console.log("A MATCH IS READY TO BE REVIEWED!!");
			match.update({ to_be_reviewed: true });
		}

		threads_to_check = threads_to_check.filter(thread => thread.thread_id !== message.channel.id);
		user_opening_thread = user_opening_thread.filter(user => user !== message.author.id);

		await message.channel.send({ content: "Images uploaded! your match is now being verified! This thread will closed off to you in 3 seconds.", files: attachments });
		await message.delete();
		setTimeout(async () => {
			message.channel.members.remove(message.author.id);
		}, 3_000);
	},
};
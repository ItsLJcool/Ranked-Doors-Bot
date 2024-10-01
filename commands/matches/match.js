const { PermissionFlagsBits, UserSelectMenuBuilder, EmbedBuilder, SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionsBitField, User, } = require('discord.js');

const { Settings_Channels, sequelize, GetSettingsData } = require('../../SQLite/DataStuff');
const { MatchesData, UserData} = require('../../SQLite/SaveData');


// const wait = require('node:timers/promises').setTimeout;
/*
    ephemeral
*/

/**
 * TODO:
 * 1. Take the VC Channel ID and add a new VC with the type of match.
 * 2. Send a message in the VC Text Channel with the match details, and make it only replyable with the owner of the VC.
 * 3. That message has buttons for starting the match, and ending the match. Maybe add a button for pinging people with a role that is of the match. (Global cooldown?)
 * 
 * On match start:
 * Lock the VC Channel
 * 
 */

const GameModes = [
	{ name: 'Hotel', value: 'hotel' },
	{ name: 'Mines', value: 'mines' },
	{ name: 'Backdoor', value: 'backdoor' },
	{ name: 'SUPER HARD MODE', value: 'hard' },
	{ name: 'Modifiers', value: 'modifiers' },
];

function delete_interaction(interaction, seconds = 5) {
	setTimeout(() => {
		interaction.deleteReply().catch(console.error);
	}, seconds*1_000);
}

async function start(interaction, modifiers = []) {
	const guild = interaction.guild;

	const setting_name = "Queue Voice Channel";
	const queueId = await Settings_Channels.findOne({ where: { name: setting_name} });

	if (queueId == null || (queueId.dataValues.channel_id == "" || queueId.dataValues.channel_id == " ")) {
		delete_interaction(interaction);
		return interaction.editReply(`Server Settings are not Initalized! Please Initalize them.\nFailure Cause: \`${setting_name}\` is not a setting or is not intialized.`);
	}
	
	const userVoiceChannel = interaction.member.voice.channel;
	const targetVoiceChannel = guild.channels.cache.get(queueId.dataValues.channel_id);

	if (!userVoiceChannel  || userVoiceChannel.id !== targetVoiceChannel.id) {
		delete_interaction(interaction);
		return interaction.editReply(`You are not connected to <#${queueId.dataValues.channel_id}>`);
	}

	const match_category = "Matchmake Category";
	const channelId = await Settings_Channels.findOne({ where: { name: match_category } });

	if (channelId == null || (channelId.dataValues.channel_id == "" || channelId.dataValues.channel_id == " ")) {
		delete_interaction(interaction);
		return interaction.editReply(`Server Settings are not Initalized! Please Initalize them.\nFailure Cause: \`${match_category}\` is not a setting or is not intialized.`);
	}

	const category = guild.channels.cache.get(channelId.dataValues.channel_id);
	if (!category || category.type !== ChannelType.GuildCategory) {
		delete_interaction(interaction);
		return interaction.editReply('Category not found or is not a category channel.');
	}

	try {
		make_voice_channel(interaction, category);
	} catch (error) {
		console.error(error);
		await interaction.editReply('There was an error creating the voice channel.');
	}
}

function get_buttons() {
	var confirm = new ButtonBuilder()
		.setCustomId('confirm')
		.setLabel('Start Match')
		.setStyle(ButtonStyle.Primary);

	var cancel = new ButtonBuilder()
		.setCustomId('cancel')
		.setLabel('End Match')
		.setStyle(ButtonStyle.Danger);

	const row = new ActionRowBuilder()
		.addComponents(confirm, cancel);
	
	return { row, confirm, cancel };
}

async function make_voice_channel(interaction, category) {
	const guild = interaction.guild;
	const floor = interaction.options.getString('floor');
	const shop = interaction.options.getString('type') == 'true';
	const is_private = interaction.options.getBoolean('private') ?? false;

	const players = !is_private ? (interaction.options.getInteger('players') ?? 12) : 0;

	const mode_name = GameModes.find(x => x.value === floor).name;

	const shop_name = shop ? 'Shop' : 'No Shop';
	const channel_name = `${mode_name} - ${shop_name} | Ranked`;

	const _perms = (is_private) ? [
		{
			id: guild.id,
			deny: [PermissionFlagsBits.ViewChannel],
		}, {
			id: interaction.user.id,
			allow: [PermissionFlagsBits.ViewChannel],
		}
	] : [];
	
	const voiceChannel = await guild.channels.create({
		name: channel_name,
		type: ChannelType.GuildVoice,
		parent: category.id, // Set the category as the parent
		userLimit: players,
		permissionOverwrites: _perms,
	});

	await interaction.editReply(`Voice channel ${voiceChannel.name} created in category ${category.name}.`);
	delete_interaction(interaction);

	var { row, cancel } = get_buttons();
	const rows = [row];
	if (is_private) {
		const player_select = new UserSelectMenuBuilder()
			.setCustomId('player_invite_match')
			.setPlaceholder('Invite Players to the Voice Channel')
			.setMaxValues(1)
			.setMinValues(1);
		const player_select_row = new ActionRowBuilder().addComponents(player_select);
		rows.push(player_select_row);
	}
	cancel.setDisabled(true);

	await interaction.member.voice.setChannel(voiceChannel);
	
	await voiceChannel.send({
		content: `<@${interaction.user.id}>, You are the host of ${voiceChannel.name}!`,
		components: rows,
	});
	voiceChannelIDs.push({vcId: voiceChannel.id, mode_type: floor, is_shop_run: shop, delete_channel: true });
}

async function button_confirm(interaction) {
	if (voiceChannelIDs.length < 1) return interaction.reply({ content: "Weird, this VC No longer is in cache. Please vacate the VC and start a new match."});
	await interaction.deferReply({ ephemeral: true });
	const channel = interaction.guild.channels.cache.get(interaction.channelId); // Replace with your voice channel ID

	// if (channel.members.size < 2) return interaction.editReply({ content: "You need at least 2 players to start a match!", ephemeral: true });
	
	for (const id of voiceChannelIDs) {
		if (id.vcId !== interaction.channelId) continue;
		id.delete_channel = false;
		break;
	}

	channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
		[PermissionsBitField.Flags.Connect]: false,
	}).catch(console.error);

	interaction.deleteReply();
	
	const { row, confirm, cancel } = get_buttons();
	confirm.setDisabled(true);

	await interaction.message.edit({ content: interaction.message.content + '\nMatch Started!\n\nWhen everyone dies, or players win make sure you end the match!', components: [row] });
}

function modifiers_embed() {
	const embed = new EmbedBuilder()
	.setAuthor({ name: "Creating A Match | Further Information", })
	.setTitle("Modifiers")
	.setDescription("Please select all the modifiers you are making for your match.")
	.setColor("#00b0f4")
	.setFooter({ text: "Creating a Modifier Match", })
	.setTimestamp();

	return embed;
}

async function button_cancel(interaction) {
	if (voiceChannelIDs.length < 1) return interaction.reply({ content: "Weird, this VC No longer is in cache. Please vacate the VC and start a new match."});
	await interaction.deferReply();
	const channel = interaction.guild.channels.cache.get(interaction.channelId); // Replace with your voice channel ID
	
	await interaction.deleteReply();

	const playerIds = Array.from(channel.members.keys());

	var match_type = "???";
	var is_shop_run = false;
	for (const id of voiceChannelIDs) {
		if (id.vcId !== interaction.channelId) continue;
		match_type = id.mode_type;
		id.delete_channel = true;
		is_shop_run = id.is_shop_run;
		break;
	}

	const match = await MatchesData.create({
		match_type: match_type,
		modifiers: [],
		players: playerIds, // Store player IDs as an array (using JSON or raw array)
		shop_run: is_shop_run,
	});
	
	for (const id of playerIds) {
		const user = await UserData.findOne({
			where: { user_id: id },
		});
	
		if (!user) {
			const dm_user = await interaction.guild.members.fetch(id);
			dm_user.send({
				content: "You aren't registered!\nThis match will not be counted towards your ELO!\nPlease register with `/register`",
			});
			continue;
		}
	
		// Link the user with the match using addMatches
		await user.addMatches(match); // Add the same match to multiple users
	}

	await interaction.message.edit({content: "Match was ended!", components: []});
}

async function button_player_invite(interaction) {
	if (voiceChannelIDs.length < 1) return interaction.reply({ content: "Weird, this VC No longer is in cache. Please vacate the VC and start a new match." });
	await interaction.deferReply({ ephemeral: true });
	const channel = interaction.guild.channels.cache.get(interaction.channelId); // Replace with your voice channel ID
	
	channel.permissionOverwrites.edit(interaction.values[0], {
		[PermissionsBitField.Flags.ViewChannel]: true,
	}).catch(console.error);

	await interaction.editReply({ content: `<@${interaction.values[0]}> has been invited to the Voice Channel.` });
}

// Global array to store voice channel IDs
var voiceChannelIDs = [];

module.exports = {
	// cooldown: 60,
	data: new SlashCommandBuilder()
		.setName('match')
		.setDescription('Start a new Ranked Match')
		.addStringOption(option =>
			option.setName('floor')
				.setDescription('Your Ranked Match Floor')
				.setRequired(true)
				.addChoices(GameModes)
		).addIntegerOption(option =>
			option.setName('players')
				.setDescription('Max Amount of Players allowed in the Match')
				.setRequired(true)
				.setMinValue(2)
				.setMaxValue(12)
		).addStringOption(option =>
			option.setName('type')
				.setDescription('If the run is Shop or No Shop')
				.setRequired(true)
				.addChoices([{ name: 'Shop', value: 'true' }, { name: 'No Shop', value: 'false' }])
		).addBooleanOption(option =>
			option.setName('private')
				.setDescription('if the match should be private or public')
				.setRequired(false)
		),
        
	async execute(interaction) {
		await interaction.deferReply();
		const is_modifiers = interaction.options.getString('floor') == 'modifiers';
		if (is_modifiers) {
			interaction.editReply("currently modifiers aren't available due to how I would have to make it user friendly, give me suggestions on how to make a Modifier match!");
			return;
		}
		// const selected_modifiers = [];
		// if (is_modifiers) {

		// 	interaction.editReply({ embeds: [modifiers_embed()] });
		// }

		start(interaction);
	},

	async on_voice_state_update(oldState, newState) {
		for (const theId of voiceChannelIDs) {
			const channel = await newState.guild.channels.cache.get(theId.vcId);
			if (!channel || channel.members.size === 0) {
				for (const id of voiceChannelIDs) {
					if (id.vcId !== theId.vcId) continue;
					if (id.delete_channel) {
						voiceChannelIDs = voiceChannelIDs.filter(id => id.vcId !== theId.vcId);
						await channel.delete().catch(console.error);
					}
					break;
				}
			}
		}
	},

	button_data: [
		{
			customId: 'confirm',
			async execute(interaction) {
				
				const foundKey = [...interaction.message.mentions.users.keys()].find(key => key === interaction.user.id);
				if (!foundKey) return interaction.reply({ content: 'You are not the host of this match!', ephemeral: true });

				button_confirm(interaction);
			},
		},
		{
			customId: 'cancel',
			async execute(interaction) {
				
				const foundKey = [...interaction.message.mentions.users.keys()].find(key => key === interaction.user.id);
				if (!foundKey) return interaction.reply({ content: 'You are not the host of this match!', ephemeral: true });

				button_cancel(interaction);
			},
		}
	],

	user_select_menu_data: [
		{
			customId: 'player_invite_match',
			async execute(interaction) {
				const foundKey = [...interaction.message.mentions.users.keys()].find(key => key === interaction.user.id);
				if (!foundKey) return interaction.reply({ content: 'You are not the host of this match!', ephemeral: true });

				button_player_invite(interaction);
			},
		}
	],
};
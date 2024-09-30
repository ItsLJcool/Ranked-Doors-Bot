const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionsBitField, User, } = require('discord.js');

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
	{ name: 'The Hotel', value: 'hotel' },
	{ name: 'The Mines', value: 'mines' },
	{ name: 'The Backdoor', value: 'backdoor' },
	{ name: 'SUPER HARD MODE', value: 'hard' },
	{ name: 'Modifiers', value: 'modifiers' },
];

function delete_interaction(interaction, seconds = 5) {
	setTimeout(() => {
		interaction.deleteReply().catch(console.error);
	}, seconds*1_000);
}

async function start(interaction) {
	await interaction.deferReply();
	
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
	const type = interaction.options.getString('type');

	const players = interaction.options.getInteger('players') ?? 12;

	const mode_name = GameModes.find(x => x.value === type).name;

	const channel_name = `${mode_name} | Ranked`;
	
	const voiceChannel = await guild.channels.create({
		name: channel_name,
		type: ChannelType.GuildVoice,
		parent: category.id, // Set the category as the parent
		userLimit: players,
	});

	await interaction.editReply(`Voice channel ${voiceChannel.name} created in category ${category.name}.`);
	delete_interaction(interaction);

	var { row, confirm, cancel } = get_buttons();
	cancel.setDisabled(true);

	await interaction.member.voice.setChannel(voiceChannel);

	await voiceChannel.send({
		content: `<@${interaction.user.id}>, You are the host of ${voiceChannel.name}!`,
		components: [row],
	});
	voiceChannelIDs.push({vcId: voiceChannel.id, mode_type: type, delete_channel: true });
}

async function button_confirm(interaction) {
	if (voiceChannelIDs.length < 1) return interaction.reply({ content: "Weird, this VC No longer is in cache. Please vacate the VC and start a new match."});
	await interaction.deferReply({ ephemeral: true });
	const channel = interaction.guild.channels.cache.get(interaction.channelId); // Replace with your voice channel ID

	if (channel.members.size < 2) return interaction.editReply({ content: "You need at least 2 players to start a match!", ephemeral: true });
	
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

async function button_cancel(interaction) {
	if (voiceChannelIDs.length < 1) return interaction.reply({ content: "Weird, this VC No longer is in cache. Please vacate the VC and start a new match."});
	await interaction.deferReply();
	const channel = interaction.guild.channels.cache.get(interaction.channelId); // Replace with your voice channel ID

	channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
		[PermissionsBitField.Flags.Connect]: true,
	}).catch(console.error);
	
	await interaction.deleteReply();

	const playerIds = Array.from(channel.members.keys());

	var match_type = "???";
	for (const id of voiceChannelIDs) {
		if (id.vcId !== interaction.channelId) continue;
		match_type = id.mode_type;
		id.delete_channel = true;
		break;
	}

	const match = await MatchesData.create({
		match_type: match_type,
		modifiers: [],
		players: playerIds, // Store player IDs as an array (using JSON or raw array)
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

// Global array to store voice channel IDs
var voiceChannelIDs = [];

module.exports = {
	// cooldown: 60,
	data: new SlashCommandBuilder()
		.setName('match')
		.setDescription('Start a new Ranked Match')
		.addStringOption(option =>
			option.setName('type')
				.setDescription('Your Ranked Match Type')
				.setRequired(true)
				.addChoices(GameModes)
		).addIntegerOption(option =>
			option.setName('players')
				.setDescription('Max Amount of Players allowed in the Match')
				.setRequired(true)
				.setMinValue(2)
				.setMaxValue(12)
		),
        
	async execute(interaction) {
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
		},
	]
};
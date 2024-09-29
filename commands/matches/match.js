const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionsBitField, } = require('discord.js');

const { Settings_Channels, sequelize, GetSettingsData } = require('../../SQLite/DataStuff');
const { MatchesData } = require('../../SQLite/SaveData');


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

	if (channelId == null || (channelId.dataValues.channel_id != "" || channelId.dataValues.channel_id != " ")) {
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

	const mode_name = GameModes.find(x => x.value === type).name;

	const channel_name = `${mode_name} | Ranked`;
	
	const voiceChannel = await guild.channels.create({
		name: channel_name,
		type: 2, // type 2 is for voice channels
		parent: category.id, // Set the category as the parent
	});

	await interaction.editReply(`Voice channel ${voiceChannel.name} created in category ${category.name}.`);

	var { row, confirm, cancel } = get_buttons();
	cancel.setDisabled(true);

	await voiceChannel.send({
		content: `<@${interaction.user.id}>, You are the host of ${voiceChannel.name}!`,
		components: [row],
	});
}

async function button_confirm(interaction) {
	await interaction.deferReply();
	const channel = interaction.guild.channels.cache.get(interaction.channelId); // Replace with your voice channel ID

	channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
		[PermissionsBitField.Flags.Connect]: false,
	}).catch(console.error);

	interaction.deleteReply();
	
	const { row, confirm, cancel } = get_buttons();
	confirm.setDisabled(true);

	await interaction.message.edit({ content: interaction.message.content + '\nMatch Started!\n\nWhen everyone dies, or players win make sure you end the match!', components: [row] });
}

async function button_cancel(interaction) {
	await interaction.deferReply();
	const channel = interaction.guild.channels.cache.get(interaction.channelId); // Replace with your voice channel ID

	channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
		[PermissionsBitField.Flags.Connect]: true,
	}).catch(console.error);
	
	interaction.deleteReply();

	await interaction.message.edit({content: "Match was ended!", components: []});
}

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
		),
        
	async execute(interaction) {
		start(interaction);
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
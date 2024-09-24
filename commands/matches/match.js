const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

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
]

async function start(interaction) {
	await interaction.deferReply();

	const guild = interaction.guild;
	const categoryId = interaction.options.getChannel('category').id;
	const category = guild.channels.cache.get(categoryId);
	
	if (!category || category.type !== 4) { // type 4 is for category channels
		return interaction.editReply('Category not found or is not a category channel.');
	}

	// Create the voice channel
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
	console.log("mode_name: ", mode_name);

	const channel_name = `${mode_name} | Ranked`;
	
	const voiceChannel = await guild.channels.create({
		name: channel_name,
		type: 2, // type 2 is for voice channels
		parent: category.id, // Set the category as the parent
	});

	await interaction.editReply(`Voice channel ${voiceChannel.name} created in category ${category.name}.`);

	var { row, confirm, cancel } = get_buttons();
	cancel.setDisabled(true);

	const message = await voiceChannel.send({
		content: `<@${interaction.user.id}>, You are the host of ${voiceChannel.name}!`,
		components: [row],
	});
}

async function button_confirm(interaction) {
	await interaction.deferReply();
	interaction.deleteReply();
	
	const { row, confirm, cancel } = get_buttons();
	confirm.setDisabled(true);

	await interaction.message.edit({ content: interaction.message.content + '\nMatch Started!\n\nWhen everyone dies, or players win make sure you end the match! ', components: [row] });
}

async function button_cancel(interaction) {
	await interaction.reply("erm, match is ended trust lol");
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
				.addChoices(GameModes))
		.addChannelOption(option =>
			option.setName('category')
				.setDescription('temp so i can parse properly')
				.setRequired(true)
		),
        
	async execute(interaction) {
		start(interaction);
	},

	button_data: [
		{
			customId: 'confirm',
			ownerOnly: true,
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
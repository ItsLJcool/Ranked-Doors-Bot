const { Collection, AttachmentBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ActionRowBuilder, ChannelType, ButtonBuilder, ButtonStyle, SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, User } = require('discord.js');

const fsPromises = require('fs').promises; // For async operations like mkdir
const fs = require('fs');                  // For synchronous methods like createWriteStream
const path = require('path');
const fetch = require('node-fetch');       // Assuming node-fetch for downloads

// const wait = require('node:timers/promises').setTimeout;
/*
    ephemeral
*/

const prisma = global.prisma;

async function downloadFile(url, filepath) {
    // Ensure directory exists before downloading
    const dir = path.dirname(filepath);
    await fsPromises.mkdir(dir, { recursive: true }); // Creates directory and parents asynchronously

    const res = await fetch(url);
    const dest = fs.createWriteStream(filepath); // Use regular fs for creating a writable stream

    return new Promise((resolve, reject) => {
        res.body.pipe(dest); // Pipe response to file
        res.body.on('error', (err) => {
            reject(err);
        });
        dest.on('finish', () => {
            resolve('File downloaded successfully');
        });
        dest.on('error', (err) => {
            reject(err);
        });
    });
}

function _get_match_type(match_type) {
    switch (match_type) {
        case 'global':
            // nothing
            break;
        case 'hard':
            match_type = "SUPER HARD MODE";
            break;
        case 'main_floors':
            match_type = "All Main Floors";
            break;
        default:
            match_type = "The "+match_type;
            break;
    }
    match_type = match_type.replace(/\b\w/g, char => char.toUpperCase());  // Capitalize first letters
    return match_type;
}

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

    const user = await prisma.user.findUnique({ where: { id: interaction.user.id }, include: { userMatches: true } });
	if (user == undefined)
		return interaction.editReply({ content: "You are not registered!\nPlease register with `/register`", ephemeral: true });

	var _has_match_to_submit = false;
	for (const userMatch of user.userMatches) {
		const match = await prisma.match.findUnique({ where: { id: userMatch.matchId } });
		if (match.verified || userMatch.awaiting_review) continue;
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
	await thread.members.add(interaction.user.id);

	const populate_options = [];
	const _matches = user.userMatches.sort((a, b) => a.matchId - b.matchId);
	for (const userMatch of _matches) {
		const match = await prisma.match.findUnique({ where: { id: userMatch.matchId }, include: { userMatches: true } });
		if (match.verified || userMatch.awaiting_review) continue;
        const formattedType = _get_match_type(match.match_type);
		populate_options.push(
			new StringSelectMenuOptionBuilder()
				.setLabel(`${formattedType} - Match Id #${match.id}`)
				.setValue(`${match.id}`)
				.setDescription(`Match played on ${match.createdAt.toLocaleString()} with ${match.userMatches.length} players.`)
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
		await interaction.deferReply({ephemeral: true});

		const role_setting = await prisma.settings.findUnique({ where: { name: "Verifier Role" } });

		if (role_setting == undefined) {
			return interaction.editReply({ content: "Server Settings are not Initalized!" });
		}
		
		const member = interaction.member;
		if (!member.roles.cache.some(role => role.id === role_setting.value)) {
			return interaction.editReply({ content: "You cannot use this command." });
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
				const matchId = parseInt(interaction.values[0]);
				const channel = await interaction.guild.channels.fetch(interaction.channelId);
				if (!channel.isThread()) 
					return interaction.reply({ content: "This is not a thread! how tf did you do this???", ephemeral: true });

				threads_to_check.push({
					thread_id: channel.id,
					matchId,
				});

				await interaction.deleteReply();
				await interaction.message.edit({ embeds: [verify_images_embed()], components: [] });
			}
		}
	],

	async on_message_create(message) {
		var thread_data = threads_to_check.find(thread => thread.thread_id === message.channel.id)
		var was_user = user_opening_thread.find(user => user === message.author.id);
		if (!was_user) return;
		if (message.author.bot || !message.channel.isThread() || !thread_data) return;

		threads_to_check = threads_to_check.filter(thread => thread.thread_id !== message.channel.id);
		user_opening_thread = user_opening_thread.filter(user => user !== message.author.id);
		
		const attachments = message.attachments.map(attachment => attachment.url);

		if (attachments.length < 1) return;

		const user = await prisma.user.findUnique({ where: { id: message.author.id }, include: { userMatches: true } });
		if (!user) {
			return interaction.reply({ content: "how the fuck?? oh well... your not registered????, please register with `/register`", ephemeral: true });
		}
		const userMatch = user.userMatches.find(match => match.matchId === thread_data.matchId);

		if (userMatch != undefined) {
			await prisma.userMatches.update({ where: { id: userMatch.id }, data: { awaiting_review: true } });
		}


		const matchWithUserMatches = await prisma.match.findUnique({
			where: { id: thread_data.matchId },  // Find the specific match by its ID
			include: {
			  userMatches: true,     // Include all related UserMatches
			},
		});
		var _match_ready_to_be_reviewed = false;
		for (const userMatch of matchWithUserMatches.userMatches) {
			if (!userMatch.awaiting_review) {
				_match_ready_to_be_reviewed = false;
				break;
			}
			_match_ready_to_be_reviewed = true;
		}
		
		if (_match_ready_to_be_reviewed) {
			await prisma.match.update({ where: { id: thread_data.matchId }, data: { to_be_reviewed: true } });
			console.log("A MATCH IS READY TO BE REVIEWED!!");
		}

	
		const elapsedTime = Math.round(Date.now() / 1_000);
		const elapsedMessage = await message.channel.send({ content: `Uploading image, please wait.\nElapsed Time: <t:${elapsedTime}:R>`, fetchReply: true });

		const folderPath = path.resolve('MATCHES_IMAGES', String(thread_data.matchId), `${message.author.id}`);
		const filePaths = [];
		for (let i = 0; i < attachments.length; i++) {
			const attachment = attachments[i];
			const filepath = path.resolve(folderPath, `${i}.png`);
			filePaths.push(filepath);
			await downloadFile(attachment, filepath)
				.then(message => console.log(message))
				.catch(error => console.error('Error downloading file:', error));
		}
		await message.channel.send({ content: "Images uploaded! your match is now being verified! This thread will closed off to you in 3 seconds." });
		await elapsedMessage.delete();
		await message.delete();
		setTimeout(async () => {
			message.channel.delete().catch(console.error);
		}, 3_000);
	},
};
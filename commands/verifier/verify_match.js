const { SlashCommandBuilder, EmbedBuilder, UserSelectMenuBuilder, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } = require('discord.js');

const path = require('path');
const fsPromises = require('fs').promises; // For async operations like mkdir
const fs = require('fs');                  // For synchronous methods like createWriteStream

const prisma = global.prisma;

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

function fields_embed(match_data, user_data) {
	const shop = match_data.shop_run ? "Shop" : "No Shop";
	const died = user_data.died ? "Yes" : "No";

	var alive_players = match_data.alive_players.split(", ").map(player => `<@${player}>`).join(', ');
	console.log("alive_players: ", alive_players);
	if (alive_players == "<@>") alive_players = "No One";
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
			.setDescription(`Edit the value of \`Shop Run\` to \`${!match_data.shop_run ? "Yes" : "No"}\``),
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
	
	const shop = match_data.shop_run ? "Shop" : "No Shop";
	const match_type = _get_match_type(match_data.match_type);

	const embed = new EmbedBuilder()
	.setAuthor({ name: `Reviewing Match #${match_data.id} | Match Review`, })
	.setTitle(`${match_type} - ${shop} | ${match_data.userMatches.length} Player Ranked Match`)
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

function user_string_data(interaction, playerIds) {
	var populate_options = [
		new StringSelectMenuOptionBuilder()
			.setLabel(`No One`)
			.setValue(`remove`)
			.setDescription(`Remove Everyone from the alive list.`)
			.setEmoji('❌')
		];

	const emojis = ['0️⃣', '1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
	for (let i = 0; i < playerIds.length; i++) {
		const playerId = playerIds[i];
		const user_discord = interaction.guild.members.cache.get(playerId);
		console.log("user_discord: ", user_discord);
		if (user_discord == undefined) continue;
		populate_options.push(
			new StringSelectMenuOptionBuilder()
				.setLabel(`${user_discord.displayName} / ${user_discord.user.username}`)
				.setValue(`${playerId}`)
				.setDescription(`Add this player to the alive list.`)
				.setEmoji(emojis[i])
		);
	}

	return populate_options;
}

async function start_verifying(interaction, match, verifing_data_input, is_message = false) {

	const reply_stuff = !is_message ? _interaction_reply : _message_reply;
	
	if (match == undefined) {
		return reply_stuff(interaction, { content: "This User's match wasn't found! Please report this to the bot owner." });
	}

	const playerIds = match.userMatches.map(userMatch => userMatch.userId);
	const current_player_matchData = match.userMatches[verifing_data_input.user_index];

	const alive_players_select = new StringSelectMenuBuilder()
		.setCustomId('verify_alive_players')
		.setPlaceholder('Alive Players')
		.setMinValues(0)
		.setMaxValues(match.userMatches.length)
		.addOptions(user_string_data(interaction, playerIds));

	const string_dynamic_select = new StringSelectMenuBuilder()
		.setCustomId('verify_dynamic')
		.setPlaceholder('Edit data properties')
		.setMinValues(1)
		.setMaxValues(1)
		.addOptions(string_menu_options(match));
	
	const row = new ActionRowBuilder().addComponents(alive_players_select);
	const row2 = new ActionRowBuilder().addComponents(string_dynamic_select);

	const rows = [row, row2];

	await reply_stuff(interaction, { components: rows, embeds: [embed_menu(match, current_player_matchData)] });
}

var verifing_data = [];

module.exports = {
	data: new SlashCommandBuilder()
		.setName('verify_match')
		.setDescription('VERIFIER ONLY: Gets a match to be verified, and makes a new thread.'),
    
	async execute(interaction) {
		await interaction.deferReply();

		if (verifing_data.find(data => data.user_id === interaction.user.id)) {
			await interaction.deleteReply();
			return interaction.followUp({ content: "You are already verifying a match!", ephemeral: true  });
		}

		const verifierRole = await prisma.settings.findUnique({ where: { name: 'Verifier Role' } });

		if (verifierRole == undefined || (verifierRole.value == "" || verifierRole.value == " ")) {
			await interaction.deleteReply();
			return interaction.followUp({ content: "Server Settings are not Initalized!", ephemeral: true });
		}
		
		const member = interaction.member;
		if (!member.roles.cache.some(role => role.id === verifierRole.value)) {
			await interaction.deleteReply();
			return interaction.followUp({ content: "You cannot use this command.", ephemeral: true });
		}

        const review_channel = await prisma.settings.findUnique({ where: { name: 'Review Channel' } });
		if (review_channel == undefined || (review_channel.value == "" || review_channel.value == " ")) {
			await interaction.deleteReply();
			return interaction.followUp({ content: "Server Settings are not Initalized!", ephemeral: true });
        }
        if (interaction.channel.id !== review_channel.value) {
			await interaction.deleteReply();
			return interaction.followUp({ content: `This command was not ran in <#${review_channel.value}>`, ephemeral: true });
        }

		var matchesToReview = await prisma.match.findMany({
			where: { to_be_reviewed: true },
			include: { userMatches: true },
		});

		if (matchesToReview == undefined || matchesToReview.length < 1) {
			await interaction.deleteReply();
			return interaction.followUp({ content: "There are no matches to be reviewed!", ephemeral: true });
		}
		matchesToReview = matchesToReview.filter(match => (match.being_verified && !match.verified || !match.being_verified && !match.verified));
		await prisma.match.update({ where: { id: matchesToReview[0].id }, data: { being_verified: true } });
		
		const elapsedTime = Math.round(Date.now() / 1_000);
		const elapsedTimeMessage = await interaction.channel.send({ content: `Sending images, please wait.\nElapsed Time: <t:${elapsedTime}:R>`, fetchReply: true });

		verifing_data.push({
			user_id: interaction.user.id,
			user_index: 0,
			max_index: matchesToReview.length-1,
			current_match_data: matchesToReview[0],
		});

		const _userMatches = matchesToReview[0].userMatches[0];
		const folderPath = path.resolve('MATCHES_IMAGES', String(_userMatches.matchId), `${_userMatches.userId}`);
		const DATA = await getPngFiles(folderPath);
		const filePaths = [];
		for (const file of DATA) {
			const filepath = path.resolve(folderPath, file);
			filePaths.push(filepath);
		}
		await interaction.editReply({ files: filePaths });
		await elapsedTimeMessage.delete();

		try {
			await start_verifying(interaction, matchesToReview[0], verifing_data[verifing_data.length-1]);
		} catch (error) {
			console.error(error);
			verifing_data = verifing_data.filter(data => data.user_id !== interaction.user.id);
			await prisma.match.update({ where: { id: matchesToReview[0].id }, data: { being_verified: false } });
			await interaction.editReply({ content: "There was an error while verifying the match!", ephemeral: true });
		}
	},

	string_select_menu_data: [
		{
			customId: 'verify_alive_players',
			async execute(interaction) {
				await interaction.deferReply({ ephemeral: true });
				if (interaction.user.id !== interaction.message.interaction.user.id) {
					return interaction.editReply({ content: "You are not the owner of this interaction!" });
				}

				var user_verify = verifing_data.find(data => data.user_id === interaction.user.id);
				if (user_verify == undefined) {
					await interaction.message.delete();
					return interaction.editReply({ content: "This embed's cache was not found! Please run the command again." });
				}
				
				if (interaction.values.includes('remove')) {
					interaction.values = [];
				}

				const returnValue = await prisma.match.update({ where: { id: user_verify.current_match_data.id }, data: { alive_players: interaction.values.join(", ") }, include: {
					userMatches: true,
				}});
				user_verify.current_match_data = returnValue;
				
				start_verifying(interaction, user_verify.current_match_data, user_verify, true);
				interaction.deleteReply();
			}
		},
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

				switch (interaction.values[0]) {
					case 'shop':
						const shop_or_not = (user_verify.current_match_data.shop_run == false) ? true : false;
						await prisma.match.update({ where: {
							id: user_verify.current_match_data.id },
							data: { shop_run: shop_or_not }
						});
						user_verify.current_match_data.shop_run = shop_or_not;
						break;
					case 'door':
						door_value_editing_data.push({
							user_id: interaction.user.id,
							match_id: user_verify.current_match_data.id,
							type: 'door',
						});
					default:
						return interaction.editReply({ content: "This value isn't editable for some reason... try again?" });
						break;
				}

				start_verifying(interaction, user_verify.current_match_data, user_verify, true);
				interaction.deleteReply();
			}
		},
	],
	
	async on_message_create(message) {
		var user_message = door_value_editing_data.find(user => user.user_id === message.author.id)
		if (message.author.bot && !user_message) return;

		switch (user_message.type) {
			case 'door':
				const door_value = parseInt(message.content);
				if (isNaN(door_value)) return;
				await prisma.match.update({ where: { id: user_message.match_id }, data: { door_value: door_value } });
				message.delete();
				break;
		}
	}
};

const door_value_editing_data = [];

async function getPngFiles(directory) {
    try {
        const files = await fsPromises.readdir(directory); // Read all files in the directory
        // Filter the files that end with '.png'
        const pngFiles = files.filter(file => path.extname(file).toLowerCase() === '.png');
        return pngFiles;
    } catch (error) {
        console.error('Error reading directory:', error);
        return [];
    }
}
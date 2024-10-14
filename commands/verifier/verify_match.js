const { SlashCommandBuilder, EmbedBuilder, UserSelectMenuBuilder, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const path = require('path');
const fsPromises = require('fs').promises; // For async operations like mkdir

const { Calculate_Elo_Match } = require('../../elo_stuff/calculate_elo');

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

const blank_feild = {
    name: "\u200b",
    value: "\u200b",
    inline: true
};

function fields_embed(match_data, user_data) {
	const shop = match_data.shop_run ? "Shop" : "No Shop";
	const died = user_data.died ? "Yes" : "No";

	var alive_players = match_data.alive_players.split(", ").map(player => `<@${player}>`).join(', ');
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

async function user_string_data(interaction, playerIds) {
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
		const user_discord = await interaction.guild.members.fetch(playerId);
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

function page_buttons(interaction) {
	const left = new ButtonBuilder()
		.setCustomId('verify_left')
		.setLabel('⬅️')
		.setStyle(ButtonStyle.Secondary);
	const right = new ButtonBuilder()
		.setCustomId('verify_right')
		.setLabel('➡️')
		.setStyle(ButtonStyle.Secondary);

	const row3 = new ActionRowBuilder().addComponents(left, right);
	return { row3, left, right };
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
		.addOptions(await user_string_data(interaction, playerIds));

	const string_dynamic_select = new StringSelectMenuBuilder()
		.setCustomId('verify_dynamic')
		.setPlaceholder('Edit data properties')
		.setMinValues(1)
		.setMaxValues(1)
		.addOptions(string_menu_options(match));
	
	const row = new ActionRowBuilder().addComponents(alive_players_select);
	const row2 = new ActionRowBuilder().addComponents(string_dynamic_select);
	const { row3, left, right } = page_buttons(interaction);

	const submit_button = new ButtonBuilder()
		.setCustomId('submit_verify')
		.setLabel('Submit Match Review')
		.setStyle(ButtonStyle.Danger);
	
	const row4 = new ActionRowBuilder().addComponents(submit_button);
	
	if (verifing_data_input.user_index < 1) left.setDisabled(true);
	else if (verifing_data_input.user_index >= verifing_data_input.max_index) right.setDisabled(true);

	const rows = [row, row2];
	if (verifing_data_input.max_index > 0) rows.push(row3);
	rows.push(row4);

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

		// ALL MATCHES THAT NEED TO BE REVIEWED OR NOT BEING REVIEWED
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

		const __user_index = 0;

		verifing_data.push({
			user_id: interaction.user.id,
			user_index: __user_index,
			max_index: matchesToReview.length,
			current_match_data: matchesToReview[0],
		});

		const _userMatches = matchesToReview[0].userMatches[__user_index];
		await set_files(interaction, _userMatches, false);
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

	button_data: [
		{
			customId: 'verify_left',
			async execute(interaction) {
				await interaction.deferReply({ ephemeral: true });
				
				const user_verify = verifing_data.find(data => data.user_id === interaction.user.id);
				if (await check_cache(interaction, user_verify)) return;

				user_verify.user_index--;
				
				if (user_verify.user_index > user_verify.max_index) user_verify.user_index = user_verify.max_index;
				else if (user_verify.user_index < 0) user_verify.user_index = 0;

				await set_files(interaction, user_verify.current_match_data.userMatches[user_verify.user_index], true);
				await start_verifying(interaction, user_verify.current_match_data, user_verify, true);
				interaction.deleteReply();
			}
		},
		{
			customId: 'verify_right',
			async execute(interaction) {
				await interaction.deferReply({ ephemeral: true });
				
				const user_verify = verifing_data.find(data => data.user_id === interaction.user.id);
				if (await check_cache(interaction, user_verify)) return;

				user_verify.user_index++;
				
				if (user_verify.user_index > user_verify.max_index) user_verify.user_index = user_verify.max_index;
				else if (user_verify.user_index < 0) user_verify.user_index = 0;
				
				await set_files(interaction, user_verify.current_match_data.userMatches[user_verify.user_index], true);
				await start_verifying(interaction, user_verify.current_match_data, user_verify, true);
				interaction.deleteReply();
			}
		},
		{
			customId: "submit_verify",
			async execute(interaction) {
				await interaction.deferReply();
				
				const user_verify = verifing_data.find(data => data.user_id === interaction.user.id);
				if (await check_cache(interaction, user_verify)) return;

				const sure = new ButtonBuilder()
					.setCustomId('submit_verify_sure')
					.setLabel('Yes')
					.setStyle(ButtonStyle.Danger);
				const nah = new ButtonBuilder()
					.setCustomId('submit_verify_deny')
					.setLabel('No')
					.setStyle(ButtonStyle.Secondary);
				const row = new ActionRowBuilder().addComponents(sure, nah);

				const message = await interaction.editReply({ content: "Are you sure you want to submit this match?", fetchReply: true });
				setTimeout(async () => {
					await message.edit({ components: [row] });
				}, 1_000);
			}
		},
		{
			customId: 'submit_verify_sure',
			async execute(interaction) {
				await interaction.deferReply({ ephemeral: true });
				
				const user_verify = verifing_data.find(data => data.user_id === interaction.user.id);
				if (await check_cache(interaction, user_verify)) return;

				await prisma.match.update({ where: { id: user_verify.current_match_data.id }, data: { to_be_reviewed: false, reviewer: interaction.user.username } });

				verifing_data = verifing_data.filter(data => data.user_id !== interaction.user.id);

				console.log("SUBMITTING MATCH");

				await interaction.message.delete();

				const channelMessage = await interaction.guild.channels.fetch(interaction.message.reference.channelId);
				const embedMessage = await channelMessage.messages.fetch(interaction.message.reference.messageId);
				if (embedMessage != undefined) await embedMessage.delete();

				await Calculate_Elo_Match(user_verify.current_match_data.id);

				await interaction.deleteReply();
			}
		}, {
			customId: 'submit_verify_deny',
			async execute(interaction) {
				await interaction.message.delete();
			}
		}
	],

	string_select_menu_data: [
		{
			customId: 'verify_alive_players',
			async execute(interaction) {
				await interaction.deferReply({ ephemeral: true });
				
				const user_verify = verifing_data.find(data => data.user_id === interaction.user.id);
				if (await check_cache(interaction, user_verify)) return;
				
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
			customId: 'door_value_edit',
			async execute(interaction) {
				await interaction.deferReply({ ephemeral: true });
				
				const user_verify = verifing_data.find(data => data.user_id === interaction.user.id);
				if (await check_cache(interaction, user_verify)) return;
				
				if (interaction.values.includes('stop')) {
					start_verifying(interaction, user_verify.current_match_data, user_verify, true);
					return interaction.deleteReply();
				}

				var addUpon = parseInt(user_verify.current_match_data.userMatches[user_verify.user_index].reached_door);
				for (var value of interaction.values) {
					value = parseInt(value);
					if (isNaN(value)) continue;
					addUpon += value;
				}
				
				if (addUpon < 0) addUpon = 0;

				await prisma.userMatches.update({ where: { id: user_verify.current_match_data.userMatches[user_verify.user_index].id }, data: { reached_door: addUpon }});
				
				const returnValue = await prisma.match.findUnique({ where: { id: user_verify.current_match_data.id }, include: {
					userMatches: true,
				}});
				user_verify.current_match_data = returnValue;
				
				await start_verifying(interaction, user_verify.current_match_data, user_verify, true);
				await door_edit(interaction);
				interaction.deleteReply();
			}
		},
		{
			customId: "cause_of_death",
			async execute(interaction) {
				await interaction.deferReply({ ephemeral: true });
				
				const user_verify = verifing_data.find(data => data.user_id === interaction.user.id);
				if (await check_cache(interaction, user_verify)) return;

				var _data = { cause_of_death: interaction.values[0] };
				if (!user_verify.current_match_data.userMatches[user_verify.user_index].died && interaction.values[0] != "Unknown") _data.died = true;
				
				await prisma.userMatches.update({ where: { id: user_verify.current_match_data.userMatches[user_verify.user_index].id }, data: _data });
				const returnValue = await prisma.match.findUnique({ where: { id: user_verify.current_match_data.id }, include: {
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
				
				const user_verify = verifing_data.find(data => data.user_id === interaction.user.id);
				if (await check_cache(interaction, user_verify)) return;
				
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
						await door_edit(interaction);
						await interaction.deleteReply();
						return;
					case "died":
						const dead_or_not = (user_verify.current_match_data.userMatches[user_verify.user_index].died == false) ? true : false;
						await prisma.userMatches.update({
							where: { id: user_verify.current_match_data.userMatches[user_verify.user_index].id },
							data: { died: dead_or_not }
						});
						user_verify.current_match_data.userMatches[user_verify.user_index].died = dead_or_not;
						break;
					case "cause":
						await cause_of_death(interaction);
						await interaction.deleteReply();
						return;
					default:
						return interaction.editReply({ content: "This value isn't editable for some reason... try again?" });
				}

				start_verifying(interaction, user_verify.current_match_data, user_verify, true);
				interaction.deleteReply();
			}
		},
	],
};

async function door_edit(interaction) {
	var options_add = [];
	const addOns = [1, 5, 10, 50, 100];
	for (const add of addOns) {
		options_add.push(
			new StringSelectMenuOptionBuilder()
				.setLabel(`Add ${add}`)
				.setValue(`${add}`)
				.setEmoji("🔼"),
		);
		options_add.push(
			new StringSelectMenuOptionBuilder()
				.setLabel(`Subtract ${-add}`)
				.setValue(`${-add}`)
				.setEmoji("🔽"),
		);
	}
	const positiveItems = options_add.filter(item => parseInt(item.data.value) >= 0);
	const negativeItems = options_add.filter(item => parseInt(item.data.value) < 0);
	
	options_add = positiveItems.concat(negativeItems);
	options_add.splice(0, 0,
		new StringSelectMenuOptionBuilder()
			.setLabel(`Stop Editing`)
			.setValue(`stop`)
			.setDescription(`Stop Editing`)
			.setEmoji("❌")
	);
	const door_number = new StringSelectMenuBuilder()
		.setCustomId('door_value_edit')
		.setPlaceholder('Edit Reach Door #')
		.setMinValues(1)
		.setMaxValues(1)
		.addOptions(options_add);

	var prevComponents = interaction.message.components;
	prevComponents[1].components = [door_number];
	await interaction.message.edit({ components: prevComponents });
}

const cause_of_deaths = [
	"Unknown",

	"Figure",
	"Seek",

	"Rush",
	"Ambush",
	"Halt",
	"Eyes",
	"Screech",
	"Dupe",
	"Hide",
	"Timothy",
	"Dread (what)",
	"Void",
	"Snare",

	"Blitz",
	"Lookman",
	"Vaccum",

	"Minecart",
	"Giggle",
	"Grumble",
	"Gloombats",
	"Firedamp",
	"Drowning",

];
async function cause_of_death(interaction) {
	const options = [];
	for (const cause of cause_of_deaths) {
		options.push(
			new StringSelectMenuOptionBuilder()
				.setLabel(`${cause}`)
				.setDescription(`Died to ${cause}`)
				.setValue(cause)
		);
	}
	options[0].setEmoji("❓");
	
	const death_cause = new StringSelectMenuBuilder()
		.setCustomId('cause_of_death')
		.setPlaceholder('Edit Cause Of Death')
		.setMinValues(1)
		.setMaxValues(1)
		.addOptions(options);

	var prevComponents = interaction.message.components;
	prevComponents[1].components = [death_cause];
	await interaction.message.edit({ components: prevComponents });
}

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

async function set_files(interaction, _userMatches, message = false) {
	// const _userMatches = matchesToReview[0].userMatches[__user_index];
	const folderPath = path.resolve('MATCHES_IMAGES', `${_userMatches.matchId}`, `${_userMatches.userId}`);
	const DATA = await getPngFiles(folderPath);
	const filePaths = [];
	for (const file of DATA) {
		const filepath = path.resolve(folderPath, file);
		filePaths.push(filepath);
	}
	if (!message) await interaction.editReply({ files: filePaths });
	else await interaction.message.edit({ files: filePaths });
}

async function check_cache(interaction, user_verify) {
	if (interaction.user.id !== interaction.message.interactionMetadata.user.id) {
		interaction.editReply({ content: "You are not the owner of this interaction!" });
		return true;
	}

	if (user_verify == undefined) {
		await interaction.message.delete();
		interaction.editReply({ content: "This embed's cache was not found! Please run the command again." });
		return true;
	}
	
	return false;
}
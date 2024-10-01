const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const { _get_match_type, MatchesData, UserData } = require('../../SQLite/SaveData');

// const wait = require('node:timers/promises').setTimeout;
/*
    ephemeral
*/

const blank_feild = {
    name: "\u200b",
    value: "\u200b",
    inline: true
};

async function send_user_data(interaction) {
    var target = interaction.options.getUser('target') ?? interaction.user;
    var user = await UserData.findOne({
        where: { user_id: target.id },
        include: {
            model: MatchesData,
            through: {
                attributes: [],
            },
        }
    });

    if (!user) {
        return interaction.editReply({ content: "User not found!" });
    }

    user = user.toJSON();

    const time = new Date(user.createdAt).toLocaleString();
    const eloFields = Array.from(new Map(Object.entries(user.elo_data)), ([key, value]) => {
        key = _get_match_type(key);
        const formattedKey = key
            .replace(/_/g, ' ')  // Replace underscores with spaces
            .replace(/\b\w/g, char => char.toUpperCase());  // Capitalize first letters
        var _return = `**${formattedKey}** - ${value}`;
        return _return;
    }).join('\n');

    const embed = new EmbedBuilder()
        .setAuthor({
            name: `Ranked Discord | ${target.username}'s Profile`,
            iconURL: target.displayAvatarURL({ format: 'png', dynamic: true }),
        })
        .setTitle(`${target.username}'s Profile`)
        .addFields({
                name: "Total Played Matches",
                value: `${user.Matches.length}`,
                inline: true
            }, {
                name: "Knobs Spent",
                value: `${user.knobs_spent}`,
                inline: true
            }, {
                name: "Knobs Gained",
                value: `${user.knobs_gained}`,
                inline: true
            }, {
                name: "Total Deaths In Ranked",
                value: `${user.deaths}`,
                inline: true
            },blank_feild,blank_feild, {
                name: "- Elo Values -",
                value: eloFields,
                inline: true
            },
        )
        .setColor("#00b0f4")
        .setFooter({
            text: `User Registered at ${time}`,
        });
    
    await interaction.editReply({ embeds: [embed] });
}

async function send_matches_data(interaction) {
    var target = interaction.options.getUser('target') ?? interaction.user;
    var user = await UserData.findOne({
        where: { user_id: target.id },
        include: [MatchesData]
    });

    if (!user) {
        return interaction.editReply({ content: "User not found!" });
    }

    user = user.toJSON();

    console.log("Mathces Data: ", user.Matches);

    await interaction.editReply({ content: "TODO: lol" });
}

module.exports = {
	data: new SlashCommandBuilder()
		.setName('view')
		.setDescription('View your profile and others!')
        .addSubcommand(subcommand =>
            subcommand
                .setName('user')
                .setDescription("View a user's profile")
                .addUserOption(option => option.setName('target').setDescription('The User')))
        .addSubcommand(subcommand =>
            subcommand
                .setName('matches')
                .setDescription('view played matches')
                .addUserOption(option => option.setName('target').setDescription('The User'))
    ),
        
	async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const subcommand = interaction.options.getSubcommand();

        switch (subcommand) {
            case 'user':
                await send_user_data(interaction);
                break;
            case 'matches':
                await send_matches_data(interaction);
                break;
            default:
                await interaction.editReply({ content: 'Something went wrong...', ephemeral: true });
                break;
        }
	},
};
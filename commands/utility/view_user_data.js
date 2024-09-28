const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const { MatchesData, UserData} = require('../../SQLite/SaveData');

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
    var target = interaction.options.getUser('target') ?? interaction.user.id;
    const user = await UserData.findOne({
        where: { user_id: target },
        include: {
            model: MatchesData,
            through: {
                attributes: [],
            },
        }
    });

    if (!user) {
        return interaction.editReply({ content: "User not found!", ephemeral: true });
    }
    
    const user_values = user.dataValues;

    const time = new Date(user_values.createdAt).toLocaleString();

    const elos = new Map(Object.entries(user.elo_data));

    const embed = new EmbedBuilder()
        .setAuthor({
            name: "Ranked Discord | ${user} Profile",
            iconURL: interaction.user.displayAvatarURL({ format: 'png', dynamic: true }),
        })
        .setTitle(`${interaction.user.username}'s Profile`)
        .addFields({
                name: "Total Played Matches",
                value: `${user_values.Matches.length}`,
                inline: true
            }, {
                name: "Knobs Spent",
                value: `${user_values.knobs_spent}`,
                inline: true
            }, {
                name: "Knobs Gained",
                value: `${user_values.knobs_gained}`,
                inline: true
            }, {
                name: "Total Deaths In Ranked",
                value: `${user_values.deaths}`,
                inline: true
            },blank_feild,blank_feild, {
                name: "- Elo Values -",
                value: `**The Hotel** - ${elos.get("hotel")}\n**The Mines** - ${elos.get("mines")}\n**The Backdoors** - ${elos.get("backdoor")}\n**SUPER HARD MODE** - ${elos.get("hard")}\n**Modifiers** - ${elos.get("modifiers")}`,
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
    const testMatch = await UserData.findByPk(target);
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
        await interaction.deferReply({ephemeral: empheral});

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
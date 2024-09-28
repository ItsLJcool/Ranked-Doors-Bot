const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const { MatchesData, UserData } = require('../../SQLite/SaveData');

// const wait = require('node:timers/promises').setTimeout;
/*
    ephemeral
*/

function embed_menu(interaction) {
    var populate_fields = [];
	populate_fields.push({
		name: "Username",
		value: interaction.user.username,
		inline: true
	});
    
    const embed = new EmbedBuilder()
        .setAuthor({ name: "Register | Ranked Doors", })
        .setTitle("Thanks for Registering!")
        .setDescription("You can now play matches and you will be able to view previous played matches with `/view matches`\n\nAlso, you will be able earn ELO ranks, based on the type of match you play.\nThe Hotel, The Mines, The Backdoors, SUPER HARD MODE, and Modifiers.\n\nYou will start with 1500 ELO in each category. Read the rules for more information.\n\nYou can view your profile by just doing `/view`")
        .setColor("#00b0f4")
        .setFooter({
            text: "Thanks for registering!",
        })
        .setTimestamp();

    return embed;
}

module.exports = {
	data: new SlashCommandBuilder()
		.setName('register')
		.setDescription('Register an account with the bot. So you can Save your Previous Matches!'),
        
	async execute(interaction) {
		await interaction.deferReply({ephemeral: true});

        const userExists = await UserData.findOne({ where: { user_id: interaction.user.id } });
        
        if (userExists) return interaction.editReply({ content: "You are already registered!", ephemeral: true });

        const user = await UserData.create({ user_id: interaction.user.id });

		await interaction.editReply({
			embeds: [embed_menu(interaction)],
		});
	},
};
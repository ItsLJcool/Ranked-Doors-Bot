const { SlashCommandBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ActionRowBuilder } = require('discord.js');
const prisma = global.prisma;


/*
    ephemeral
*/

async function edit_user_data(interaction) {
    var target = interaction.options.getUser('target') ?? interaction.user;
    const user = await prisma.user.findUnique({ where: { id: target.id }, include: { elo_data: true, userMatches: true } });

    if (!user) {
        return interaction.editReply({ content: "User not found!" });
    }

    const elo_options = [];
    for (const elo of Object.keys(user.elo_data)) {
        if (elo === 'id') continue;
        elo_options.push(
            new StringSelectMenuOptionBuilder()
                .setLabel(`${elo}`)
                .setValue(`${elo}`)
                .setDescription(`Edit the value of ${elo} (Current: ${user.elo_data[elo]})`)
        );
    }
    console.log("elo_options: ", elo_options);

    const eloMenuBuilder = new StringSelectMenuBuilder()
        .setCustomId('user_edit_elo')
        .setPlaceholder('Edit the Elo Type of this User')
        .setMinValues(1)
        .setMaxValues(1)
        .addOptions(elo_options);
    
    const row = new ActionRowBuilder().addComponents(eloMenuBuilder);

    await interaction.editReply( { components: [row] });
}

module.exports = {
	data: new SlashCommandBuilder()
		.setName('edit')
		.setDescription('VERIFIER ONLY: Edit properties of a user or a match.')
        .addSubcommand(subcommand =>
            subcommand
                .setName('user')
                .setDescription("View a user's profile")
                .addUserOption(option => option.setName('target').setDescription('The User'))
        ),
        
	async execute(interaction) {
        await interaction.deferReply();

        const subcommand = interaction.options.getSubcommand();

        switch (subcommand) {
            case 'user':
                await edit_user_data(interaction);
                break;
            default:
                await interaction.followUp({ content: 'Command Not Implemented Yet...', ephemeral: true });
                await interaction.deleteReply();
                break;
        }
	},

    string_select_menu_data: [
        {
            customId: 'user_edit_elo',
            async execute(interaction) {
                await interaction.deferReply({ ephemeral: true });
                if (interaction.user.id !== interaction.message.interactionMetadata.user.id) interaction.editReply({ content: "You are not the owner of this interaction!" });
                
                value_edit(interaction);
                interaction.deleteReply();
            }
        }, {
            customId: 'edit_user_elo_value',
            async execute(interaction) {
                await interaction.deferReply({ ephemeral: true });
                if (interaction.user.id !== interaction.message.interactionMetadata.user.id) interaction.editReply({ content: "You are not the owner of this interaction!" });
            }
        }
    ]
};

async function value_edit(interaction) {
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
	const value_edit = new StringSelectMenuBuilder()
		.setCustomId('edit_user_elo_value')
		.setPlaceholder('Add / Subtract Elo Value')
		.setMinValues(1)
		.setMaxValues(addOns.length)
		.addOptions(options_add);

	var prevComponents = interaction.message.components;
	prevComponents[0].components = [value_edit];
	await interaction.message.edit({ components: prevComponents });
}
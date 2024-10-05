const { ChannelType } = require('discord.js');

const prisma = global.prisma;

/*
    1 = Channel Menu
    2 = Role Menu
*/

const data = [
    {
        name: "Matchmake Category",
        type: ChannelType.GuildCategory,
        menuType: 1,
        value: "",
        description: "This will be the category for making new Voice Channels for Ranked Matches.",
    }, {
        name: "Queue Voice Channel",
        type: ChannelType.GuildVoice,
        menuType: 1,
        value: "",
        description: "The Voice Channel for the Queue, Players can join or will get sent after a match is ended.",
    }, {
        name: "Review Channel",
        type: ChannelType.GuildText,
        menuType: 1,
        value: "",
        description: "The Voice Channel for the Reviewer, you can only verify matches in this channel.",
    }, {
        name: "Verifier Role",
        type: -1,
        menuType: 2,
        value: "",
        description: "This will be the role the bot references to allow verifiers to use special commands.",
    }
];

async function init_settings() {
    const settings = await prisma.settings.findMany();
    if (settings.length < 1) {
        for (const setting of data) {
            create_setting(setting);
        }
        return;
    }
    for (const setting of data) {
        const _data = settings.find(data => data.name === setting.name);
        if (_data != undefined) continue;
        create_setting(setting);
    }
}

async function create_setting(data) {
    await prisma.settings.create({ data });
}

module.exports = { init_settings };
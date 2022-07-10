import { SlashCommand, CommandOptionType, CommandContext } from 'slash-create';
import { Message, Guild, Client, Intents } from 'discord.js';
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');

class VoiceCommand extends SlashCommand {
  constructor(creator) {
    super(creator, {
      name: 'voice',
      description: 'Voice Channels',
      options: [
        {
          type: CommandOptionType.SUB_COMMAND,
          name: 'create',
          description: 'create voice channel'
        },
        {
          type: CommandOptionType.SUB_COMMAND,
          name: 'delete',
          description: 'delete voice channel'
        }
      ]
    });

    this.filePath = __filename;
  }

  async run(ctx: CommandContext) {
    // const client = new Client({ intents: [Intents.FLAGS.GUILDS] });
    // const guild = client.guilds.fetch();
    console.log(this.client);

    // client.channels.client.message.guild.channels.create('name', {
    //   type: 'GUILD_TEXT'
    // });
    // const rest = new REST({ version: '9' }).setToken(token);
    return 'ok';
  }
}

export default VoiceCommand;
